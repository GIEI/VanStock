// Auto-backup scheduler: runs pg_dump + tar uploads every 6h.
// Keeps at most MAX_BACKUPS (28 = 7 days @ 4/day), older are deleted.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS   = 60 * 1000;
const MAX_BACKUPS        = 28;

const backupDir = () => process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
const uploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

function ts() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function runPgDump(outFile) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PGHOST:     process.env.DB_HOST,
      PGPORT:     process.env.DB_PORT || '5434',
      PGUSER:     process.env.DB_USER,
      PGPASSWORD: process.env.DB_PASSWORD,
      PGDATABASE: process.env.DB_NAME,
    };
    const dump = spawn('pg_dump', ['--no-owner', '--no-privileges', '--clean', '--if-exists'], { env });
    const gzip = spawn('gzip', ['-c']);
    const out  = fs.createWriteStream(outFile);

    dump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(out);

    let stderr = '';
    dump.stderr.on('data', d => { stderr += d.toString(); });

    dump.on('error', reject);
    gzip.on('error', reject);
    out.on('error', reject);
    out.on('close', () => {
      if (stderr && !stderr.match(/^(pg_dump|NOTICE)/i)) {
        console.warn('[auto-backup] pg_dump stderr:', stderr.trim());
      }
      resolve();
    });
    dump.on('close', code => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
    });
  });
}

function runTarUploads(outFile) {
  return new Promise((resolve, reject) => {
    const dir = uploadDir();
    if (!fs.existsSync(dir)) {
      // No uploads yet — create empty archive
      fs.writeFileSync(outFile, '');
      return resolve();
    }
    const tar = spawn('tar', ['-czf', outFile, '-C', dir, '.']);
    let stderr = '';
    tar.stderr.on('data', d => { stderr += d.toString(); });
    tar.on('error', reject);
    tar.on('close', code => {
      if (code !== 0) reject(new Error(`tar exited with code ${code}: ${stderr}`));
      else resolve();
    });
  });
}

function readManifests() {
  const dir = backupDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.manifest.json'))
    .map(f => {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        return { ...m, manifest_file: f };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
}

function rotate() {
  const manifests = readManifests();
  if (manifests.length <= MAX_BACKUPS) return 0;
  const toDelete = manifests.slice(MAX_BACKUPS);
  const dir = backupDir();
  for (const m of toDelete) {
    [m.db_file, m.uploads_file, m.manifest_file].forEach(f => {
      if (!f) return;
      const p = path.join(dir, f);
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    });
  }
  return toDelete.length;
}

async function runBackup() {
  const dir = backupDir();
  ensureDir(dir);
  const stamp = ts();
  const dbFile      = `db_${stamp}.sql.gz`;
  const uploadsFile = `uploads_${stamp}.tar.gz`;
  const manifestFile = `${stamp}.manifest.json`;

  try {
    console.log(`[auto-backup] Starting backup ${stamp}...`);
    await runPgDump(path.join(dir, dbFile));
    await runTarUploads(path.join(dir, uploadsFile));

    const dbStat = fs.statSync(path.join(dir, dbFile));
    let uploadsSize = 0;
    try { uploadsSize = fs.statSync(path.join(dir, uploadsFile)).size; } catch { /* empty */ }

    const manifest = {
      ts:            stamp,
      db_file:       dbFile,
      uploads_file:  uploadsFile,
      db_size:       dbStat.size,
      uploads_size:  uploadsSize,
      created_at:    new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, manifestFile), JSON.stringify(manifest, null, 2));

    const deleted = rotate();
    console.log(`[auto-backup] Done ${stamp} (db=${dbStat.size}B uploads=${uploadsSize}B${deleted ? `, rotated=${deleted}` : ''}).`);
  } catch (err) {
    console.error(`[auto-backup] Failed ${stamp}:`, err.message);
    // Clean up partial files
    [dbFile, uploadsFile, manifestFile].forEach(f => {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
    });
  }
}

let intervalHandle = null;
let startupHandle  = null;

function start() {
  if (intervalHandle || startupHandle) return;
  if (process.env.DISABLE_AUTO_BACKUP === '1') {
    console.log('[auto-backup] Disabled via DISABLE_AUTO_BACKUP=1');
    return;
  }
  startupHandle = setTimeout(() => {
    runBackup();
    intervalHandle = setInterval(runBackup, BACKUP_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
  console.log(`[auto-backup] Scheduler armed (first run in ${STARTUP_DELAY_MS / 1000}s, then every 6h, keep ${MAX_BACKUPS} backups).`);
}

function stop() {
  if (startupHandle)  { clearTimeout(startupHandle);  startupHandle = null; }
  if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
}

module.exports = { start, stop, runBackup, readManifests, rotate, backupDir, uploadDir };
