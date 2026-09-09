const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const zlib      = require('zlib');
const tar       = require('tar-stream');
const archiver  = require('archiver');
const AdmZip    = require('adm-zip');
const multer    = require('multer');
const { spawn } = require('child_process');
const requireAuth = require('../middleware/auth');
const autoBackup  = require('../utils/auto-backup');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// Wrapper that maps multer errors (file too big, etc.) to a friendly JSON
// response instead of falling through to the generic 500 handler.
function uploadSingle(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File troppo grande (limite 500 MB).' });
      }
      console.error('[upload] multer error:', err);
      return res.status(400).json({ error: `Errore upload: ${err.message}` });
    });
  };
}

const router = express.Router();
router.use(requireAuth, requireAuth.requireRole('superadmin'));

// GET /api/backups — list available auto-backups
router.get('/', (_req, res) => {
  const manifests = autoBackup.readManifests().map(m => ({
    ts:           m.ts,
    db_size:      m.db_size,
    uploads_size: m.uploads_size,
    created_at:   m.created_at,
  }));
  res.json(manifests);
});

// POST /api/backups/run — trigger an immediate backup
router.post('/run', async (_req, res, next) => {
  try {
    await autoBackup.runBackup();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/backups/:ts/download/db — stream the plain SQL dump (no archive wrapper)
// Serving as plain .sql avoids AV false positives triggered by gzip/binary content inside ZIP.
router.get('/:ts/download/db', (req, res, next) => {
  try {
    const manifest = autoBackup.readManifests().find(m => m.ts === req.params.ts);
    if (!manifest) return res.status(404).json({ error: 'Backup not found' });

    const dbPath = path.join(autoBackup.backupDir(), manifest.db_file);
    if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'DB file not found' });

    const sqlName = `stocksimple_db_${manifest.ts}.sql`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sqlName}"`);

    fs.createReadStream(dbPath).pipe(zlib.createGunzip()).pipe(res);
  } catch (err) { next(err); }
});

// GET /api/backups/:ts/download/uploads — re-package uploads as a ZIP of individual files.
// Serving the raw .tar.gz triggers AV heuristics; a ZIP of plain image/media files does not.
router.get('/:ts/download/uploads', (req, res, next) => {
  try {
    const manifest = autoBackup.readManifests().find(m => m.ts === req.params.ts);
    if (!manifest) return res.status(404).json({ error: 'Backup not found' });

    const uploadsPath = path.join(autoBackup.backupDir(), manifest.uploads_file);
    if (!fs.existsSync(uploadsPath) || fs.statSync(uploadsPath).size === 0) {
      return res.status(404).json({ error: 'Uploads file not found or empty' });
    }

    const zipName = `stocksimple_uploads_${manifest.ts}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const zip     = archiver('zip', { zlib: { level: 6 } });
    const extract = tar.extract();
    let added = 0, skipped = 0;
    const seenNames = new Map(); // for collision detection (e.g. uploads/foo.jpg vs thumbs/foo.jpg)

    zip.on('error', err => next(err));
    zip.pipe(res);

    extract.on('entry', (header, entryStream, done) => {
      if (header.type !== 'file') {
        skipped++;
        entryStream.on('end', done);
        entryStream.resume();
        return;
      }
      // Read the entry FULLY into memory before advancing the tar stream.
      // Streaming tar -> archiver directly drops entries when archiver's
      // internal queue lags behind tar-stream's emit cadence.
      const chunks = [];
      entryStream.on('data', c => chunks.push(c));
      entryStream.on('error', err => { console.error('[backup zip] entry read error:', err); done(); });
      entryStream.on('end', () => {
        const buf = Buffer.concat(chunks);
        // Preserve relative path so files in subdirs (e.g. thumbs/) don't collide with root
        // and the original directory layout is restored on re-import.
        let name = header.name.replace(/^\.\/?/, '');
        if (seenNames.has(name)) {
          // Should never happen with relative paths, but guard anyway
          const n = (seenNames.get(name) || 1) + 1;
          seenNames.set(name, n);
          const dot = name.lastIndexOf('.');
          name = dot > 0 ? `${name.slice(0, dot)}_${n}${name.slice(dot)}` : `${name}_${n}`;
        } else {
          seenNames.set(name, 1);
        }
        zip.append(buf, { name });
        added++;
        done();
      });
    });

    extract.on('finish', () => {
      console.log(`[backup zip] ${manifest.ts}: ${added} files added, ${skipped} non-file entries skipped`);
      zip.finalize();
    });
    extract.on('error', err => next(err));

    fs.createReadStream(uploadsPath).pipe(zlib.createGunzip()).pipe(extract);
  } catch (err) { next(err); }
});

// POST /api/backups/:ts/restore — restore DB + uploads from a backup
router.post('/:ts/restore', async (req, res, next) => {
  try {
    const manifest = autoBackup.readManifests().find(m => m.ts === req.params.ts);
    if (!manifest) return res.status(404).json({ error: 'Backup not found' });

    const dir = autoBackup.backupDir();
    const dbPath      = path.join(dir, manifest.db_file);
    const uploadsPath = path.join(dir, manifest.uploads_file);
    if (!fs.existsSync(dbPath)) return res.status(400).json({ error: 'DB backup file missing' });

    await restoreDb(dbPath);
    if (fs.existsSync(uploadsPath) && fs.statSync(uploadsPath).size > 0) {
      await restoreUploads(uploadsPath);
    }

    res.json({ ok: true, message: 'Restore completato. Si raccomanda di riavviare il server.' });
  } catch (err) { next(err); }
});

// POST /api/backups/restore-db — restore DB from an uploaded .sql file
router.post('/restore-db', uploadSingle('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });
  if (!req.file.originalname.endsWith('.sql')) {
    return res.status(400).json({ error: 'Il file deve essere un .sql' });
  }
  try {
    await restoreDbFromBuffer(req.file.buffer);
    res.json({ ok: true, message: 'DB ripristinato. Si raccomanda di riavviare il server.' });
  } catch (err) { next(err); }
});

// POST /api/backups/restore-uploads — restore uploads from an uploaded .zip file
router.post('/restore-uploads', uploadSingle('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });
  if (!req.file.originalname.toLowerCase().endsWith('.zip')) {
    return res.status(400).json({ error: 'Il file deve essere un .zip' });
  }
  try {
    const dir = autoBackup.uploadDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Parse the zip — fails loudly if file is corrupted, encrypted or not a zip
    let zip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch (parseErr) {
      console.error('[restore-uploads] zip parse error:', parseErr.message);
      return res.status(400).json({ error: `File .zip non valido o corrotto: ${parseErr.message}` });
    }

    const entries = zip.getEntries();
    if (!entries.length) {
      return res.status(400).json({ error: 'Lo zip è vuoto.' });
    }

    let count    = 0;
    let skipped  = 0;
    const errors = [];

    for (const entry of entries) {
      if (entry.isDirectory) { skipped++; continue; }
      // Normalize path: strip leading ./ and reject anything trying to escape via ..
      const rel = entry.entryName.replace(/^\.\/?/, '');
      const baseName = path.basename(rel);
      if (!baseName || baseName.startsWith('.') || baseName === 'Thumbs.db' || rel.includes('__MACOSX')) {
        skipped++;
        continue;
      }
      // Resolve and ensure target stays inside uploads dir (path traversal guard)
      const target = path.resolve(dir, rel);
      if (!target.startsWith(path.resolve(dir) + path.sep) && target !== path.resolve(dir)) {
        console.warn(`[restore-uploads] skipping suspicious path: ${rel}`);
        skipped++;
        continue;
      }
      try {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, entry.getData());
        count++;
      } catch (writeErr) {
        console.error(`[restore-uploads] failed entry "${entry.entryName}":`, writeErr.message);
        errors.push(`${rel}: ${writeErr.message}`);
      }
    }

    if (count === 0 && errors.length) {
      return res.status(500).json({ error: `Nessun file ripristinato. Primo errore: ${errors[0]}` });
    }

    res.json({
      ok: true,
      message: `${count} file ripristinati${skipped ? `, ${skipped} ignorati` : ''}${errors.length ? `, ${errors.length} errori` : ''}.`,
      count,
      skipped,
      errors: errors.slice(0, 5),
    });
  } catch (err) {
    console.error('[restore-uploads] unexpected error:', err);
    next(err);
  }
});

function restoreDb(gzPath) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PGHOST:     process.env.DB_HOST,
      PGPORT:     process.env.DB_PORT || '5434',
      PGUSER:     process.env.DB_USER,
      PGPASSWORD: process.env.DB_PASSWORD,
      PGDATABASE: process.env.DB_NAME,
    };
    const gunzip = spawn('gunzip', ['-c', gzPath]);
    const psql   = spawn('psql', ['-v', 'ON_ERROR_STOP=1'], { env });
    gunzip.stdout.pipe(psql.stdin);

    let stderr = '';
    psql.stderr.on('data', d => { stderr += d.toString(); });
    gunzip.on('error', reject);
    psql.on('error', reject);
    psql.on('close', code => {
      if (code !== 0) reject(new Error(`psql exit ${code}: ${stderr}`));
      else resolve();
    });
  });
}

function restoreDbFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PGHOST:     process.env.DB_HOST,
      PGPORT:     process.env.DB_PORT || '5434',
      PGUSER:     process.env.DB_USER,
      PGPASSWORD: process.env.DB_PASSWORD,
      PGDATABASE: process.env.DB_NAME,
    };
    const psql = spawn('psql', ['-v', 'ON_ERROR_STOP=1'], { env });
    let stderr = '';
    psql.stderr.on('data', d => { stderr += d.toString(); });
    psql.on('error', reject);
    psql.on('close', code => {
      if (code !== 0) reject(new Error(`psql exit ${code}: ${stderr}`));
      else resolve();
    });
    const { Readable } = require('stream');
    Readable.from(buffer).pipe(psql.stdin);
  });
}

function restoreUploads(tarPath) {
  return new Promise((resolve, reject) => {
    const dir = autoBackup.uploadDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Clean current uploads dir (best effort, no recurse into subdirs we didn't create)
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      try {
        const st = fs.statSync(p);
        if (st.isFile()) fs.unlinkSync(p);
      } catch { /* ignore */ }
    }
    const tar = spawn('tar', ['-xzf', tarPath, '-C', dir]);
    let stderr = '';
    tar.stderr.on('data', d => { stderr += d.toString(); });
    tar.on('error', reject);
    tar.on('close', code => {
      if (code !== 0) reject(new Error(`tar -xzf exit ${code}: ${stderr}`));
      else resolve();
    });
  });
}

module.exports = router;
