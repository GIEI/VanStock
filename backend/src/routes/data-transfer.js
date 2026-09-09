const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const multer   = require('multer');
const archiver = require('archiver');
const AdmZip   = require('adm-zip');
const router   = express.Router();
const db       = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

const uploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for full backups
});

// Collect filenames referenced by URL columns in DB and present on disk.
function collectMediaFiles(urls) {
  const dir = uploadDir();
  const set = new Set();
  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;
    if (!url.startsWith('/uploads/')) continue;
    const name = path.basename(url);
    if (set.has(name)) continue;
    if (fs.existsSync(path.join(dir, name))) set.add(name);
  }
  return [...set];
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
router.get('/export', adminOnly, async (req, res, next) => {
  const cid = req.user.company_id;
  try {
    const [
      companyRes,
      locations,
      products,
      productStocks,
      clients,
      suppliers,
      productSuppliers,
      jobs,
      movements,
      purchaseOrders,
      purchaseOrderItems,
      vehicleBookings,
      users,
      userAbsences,
      workShifts,
      jobPhotos,
      jobRequiredMaterials,
    ] = await Promise.all([
      db.query('SELECT id, name, currency, logo_url FROM companies WHERE id=$1', [cid]),
      db.query('SELECT * FROM locations WHERE company_id=$1 ORDER BY id', [cid]),
      db.query('SELECT * FROM products WHERE company_id=$1 ORDER BY id', [cid]),
      db.query(`SELECT ps.* FROM product_stocks ps JOIN products p ON p.id = ps.product_id WHERE p.company_id = $1`, [cid]),
      db.query('SELECT * FROM clients WHERE company_id=$1 ORDER BY id', [cid]),
      db.query('SELECT * FROM suppliers WHERE company_id=$1 ORDER BY id', [cid]),
      db.query(`SELECT ps.* FROM product_suppliers ps JOIN suppliers s ON s.id = ps.supplier_id WHERE s.company_id = $1`, [cid]),
      db.query('SELECT * FROM jobs WHERE company_id=$1 ORDER BY id', [cid]),
      db.query(`SELECT m.* FROM movements m JOIN products p ON p.id = m.product_id WHERE p.company_id = $1 ORDER BY m.id`, [cid]),
      db.query('SELECT * FROM purchase_orders WHERE company_id=$1 ORDER BY id', [cid]),
      db.query(`SELECT poi.* FROM purchase_order_items poi JOIN purchase_orders po ON po.id = poi.purchase_order_id WHERE po.company_id = $1`, [cid]),
      db.query('SELECT * FROM vehicle_bookings WHERE company_id=$1 ORDER BY id', [cid]),
      db.query(`SELECT id, company_id, email, password_hash, name, role, is_active, photo_url, created_at
                FROM users WHERE company_id=$1 ORDER BY id`, [cid]),
      db.query('SELECT * FROM user_absences WHERE company_id=$1 ORDER BY id').catch(() => ({ rows: [] })),
      db.query('SELECT * FROM company_work_shifts WHERE company_id=$1', [cid]).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM job_photos WHERE company_id=$1 ORDER BY id`, [cid]).catch(() => ({ rows: [] })),
      db.query(`SELECT jrm.* FROM job_required_materials jrm JOIN jobs j ON j.id = jrm.job_id WHERE j.company_id=$1`, [cid]).catch(() => ({ rows: [] })),
    ]);

    const exportData = {
      version:     '2.0',
      app:         'StockSimple',
      exported_at: new Date().toISOString(),
      company:     companyRes.rows[0] || {},
      data: {
        locations:           locations.rows,
        products:            products.rows,
        product_stocks:      productStocks.rows,
        clients:             clients.rows,
        suppliers:           suppliers.rows,
        product_suppliers:   productSuppliers.rows,
        jobs:                jobs.rows,
        movements:           movements.rows,
        purchase_orders:     purchaseOrders.rows,
        purchase_order_items: purchaseOrderItems.rows,
        vehicle_bookings:    vehicleBookings.rows,
        users:               users.rows,
        user_absences:       userAbsences.rows,
        company_work_shifts: workShifts.rows,
        job_photos:          jobPhotos.rows,
        job_required_materials: jobRequiredMaterials.rows,
      },
    };

    // Files referenced by URL columns
    const urls = [
      ...products.rows.map(p => p.photo_url),
      ...users.rows.map(u => u.photo_url),
      ...jobPhotos.rows.map(p => p.url),
      companyRes.rows[0]?.logo_url,
    ];
    const mediaFiles = collectMediaFiles(urls);

    const filename = `stocksimple_${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');

    const zip = archiver('zip', { zlib: { level: 6 } });
    zip.on('error', err => next(err));
    zip.pipe(res);
    zip.append(JSON.stringify(exportData, null, 2), { name: 'data.json' });
    const dir = uploadDir();
    for (const f of mediaFiles) {
      zip.file(path.join(dir, f), { name: `uploads/${f}` });
    }
    zip.finalize();
  } catch (err) {
    next(err);
  }
});

// ─── IMPORT ──────────────────────────────────────────────────────────────────
router.post('/import', adminOnly, upload.single('file'), async (req, res, next) => {
  const cid = req.user.company_id;

  let body;
  let mediaEntries = []; // [{ name, data: Buffer }]

  try {
    if (req.file) {
      // Multipart upload: detect ZIP vs JSON by magic bytes
      const buf = req.file.buffer;
      if (buf[0] === 0x50 && buf[1] === 0x4b) {
        // ZIP
        const zip = new AdmZip(buf);
        const entries = zip.getEntries();
        const dataEntry = entries.find(e => e.entryName === 'data.json' || e.entryName.endsWith('/data.json'));
        if (!dataEntry) return res.status(400).json({ error: 'data.json mancante nello zip' });
        body = JSON.parse(dataEntry.getData().toString('utf8'));
        for (const e of entries) {
          if (e.isDirectory) continue;
          if (e.entryName.startsWith('uploads/')) {
            mediaEntries.push({ name: path.basename(e.entryName), data: e.getData() });
          }
        }
      } else {
        body = JSON.parse(buf.toString('utf8'));
      }
    } else {
      body = req.body;
    }
  } catch (err) {
    return res.status(400).json({ error: 'File non valido: ' + err.message });
  }

  if (!body || !body.data) {
    return res.status(400).json({ error: 'File non valido: struttura dati mancante.' });
  }
  if (body.app !== 'StockSimple') {
    return res.status(400).json({ error: 'Il file non è un export StockSimple valido.' });
  }

  const sourceName = typeof body.company?.name === 'string' ? body.company.name.trim() : '';
  const targetCompany = await db.query('SELECT name FROM companies WHERE id = $1', [cid]);
  const targetName = targetCompany.rows[0]?.name?.trim() || '';
  if (!sourceName || sourceName.localeCompare(targetName, undefined, { sensitivity: 'accent' }) !== 0) {
    return res.status(409).json({
      error: `Importazione rifiutata: il file appartiene a "${sourceName || 'Company sconosciuta'}", mentre l'ambiente corrente è "${targetName}".`,
      code: 'COMPANY_MISMATCH',
    });
  }

  const { data } = body;
  const stats = {
    locations: 0, products: 0, clients: 0, suppliers: 0, jobs: 0,
    movements: 0, purchase_orders: 0, vehicle_bookings: 0,
    users: 0, user_absences: 0, job_photos: 0, media_files: 0,
    job_required_materials: 0,
  };

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Locations
    const locationMap = {};
    for (const loc of data.locations || []) {
      const r = await client.query(
        `INSERT INTO locations (company_id, name, type, status, plate, description)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [cid, loc.name, loc.type || 'other', loc.status || 'disponibile', loc.plate || null, loc.description || null],
      );
      locationMap[loc.id] = r.rows[0].id;
      stats.locations++;
    }

    // 2. Clients
    const clientMap = {};
    for (const c of data.clients || []) {
      const r = await client.query(
        `INSERT INTO clients (company_id, name, phone, email, address, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [cid, c.name, c.phone || null, c.email || null, c.address || null, c.notes || null],
      );
      clientMap[c.id] = r.rows[0].id;
      stats.clients++;
    }

    // 3. Suppliers
    const supplierMap = {};
    for (const s of data.suppliers || []) {
      const r = await client.query(
        `INSERT INTO suppliers (company_id, name, contact_name, phone, email, website, address, notes, delivery_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [cid, s.name, s.contact_name || null, s.phone || null, s.email || null,
          s.website || null, s.address || null, s.notes || null, s.delivery_days || null],
      );
      supplierMap[s.id] = r.rows[0].id;
      stats.suppliers++;
    }

    // 4. Products
    const productMap = {};
    for (const p of data.products || []) {
      const newLocId = p.location_id ? (locationMap[p.location_id] || null) : null;
      const r = await client.query(
        `INSERT INTO products (company_id, name, sku, barcode, description, quantity, unit, min_stock, location_id, category, price, photo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [cid, p.name, p.sku, p.barcode || null, p.description || null,
          p.quantity || 0, p.unit || null, p.min_stock || 0, newLocId,
          p.category || null, p.price || null, p.photo_url || null],
      );
      productMap[p.id] = r.rows[0].id;
      stats.products++;
    }

    // 5. Product stocks
    for (const ps of data.product_stocks || []) {
      const newPid = productMap[ps.product_id];
      const newLid = locationMap[ps.location_id];
      if (!newPid || !newLid) continue;
      await client.query(
        `INSERT INTO product_stocks (product_id, location_id, quantity)
         VALUES ($1,$2,$3)
         ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [newPid, newLid, ps.quantity || 0],
      );
    }

    // 6. Product → supplier
    for (const ps of data.product_suppliers || []) {
      const newPid = productMap[ps.product_id];
      const newSid = supplierMap[ps.supplier_id];
      if (!newPid || !newSid) continue;
      await client.query(
        `INSERT INTO product_suppliers (product_id, supplier_id, purchase_price, is_preferred, notes)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [newPid, newSid, ps.purchase_price || null, ps.is_preferred || false, ps.notes || null],
      );
    }

    // 7. Users (skip if email already exists)
    const userMap = {};
    for (const u of data.users || []) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rows.length) {
        userMap[u.id] = existing.rows[0].id;
        continue;
      }
      const r = await client.query(
        `INSERT INTO users (company_id, email, password_hash, name, role, is_active, photo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [cid, u.email, u.password_hash, u.name, u.role || 'user',
          u.is_active !== false, u.photo_url || null],
      );
      userMap[u.id] = r.rows[0].id;
      stats.users++;
    }

    // 8. Jobs
    const jobMap = {};
    for (const j of data.jobs || []) {
      const newClientId = j.client_id ? (clientMap[j.client_id] || null) : null;
      const newAssigned = j.assigned_to ? (userMap[j.assigned_to] || null) : null;
      const r = await client.query(
        `INSERT INTO jobs (company_id, client_id, title, description, address, assigned_to, scheduled_date, status, started_at, completed_at, priority)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [cid, newClientId, j.title, j.description || null, j.address || null, newAssigned,
          j.scheduled_date || null, j.status || 'aperto',
          j.started_at || null, j.completed_at || null, j.priority || null],
      );
      jobMap[j.id] = r.rows[0].id;
      stats.jobs++;
    }

    // 9. Movements
    for (const material of data.job_required_materials || []) {
      const newJobId = jobMap[material.job_id];
      const newProductId = productMap[material.product_id];
      if (!newJobId || !newProductId || Number(material.quantity_required) <= 0) continue;
      await client.query(
        `INSERT INTO job_required_materials (job_id, product_id, quantity_required) VALUES ($1,$2,$3)`,
        [newJobId, newProductId, material.quantity_required],
      ).catch(() => {});
      stats.job_required_materials++;
    }

    // 9. Movements
    for (const m of data.movements || []) {
      const newPid     = productMap[m.product_id];
      if (!newPid) continue;
      const newFromLoc = m.from_location_id ? (locationMap[m.from_location_id] || null) : null;
      const newToLoc   = m.to_location_id   ? (locationMap[m.to_location_id]   || null) : null;
      const newJobId   = m.job_id           ? (jobMap[m.job_id]                || null) : null;
      await client.query(
        `INSERT INTO movements (product_id, type, quantity, from_location_id, to_location_id, job_id, notes, created_by, created_at, purchase_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [newPid, m.type, m.quantity, newFromLoc, newToLoc, newJobId,
          m.notes || null, m.created_by || null, m.created_at || new Date().toISOString(),
          m.purchase_price || null],
      );
      stats.movements++;
    }

    // 10. Purchase orders
    const poMap = {};
    for (const po of data.purchase_orders || []) {
      const newSid = po.supplier_id ? (supplierMap[po.supplier_id] || null) : null;
      const r = await client.query(
        `INSERT INTO purchase_orders (company_id, supplier_id, status, notes, ordered_at, received_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [cid, newSid, po.status || 'bozza', po.notes || null,
          po.ordered_at || null, po.received_at || null, po.created_by || null],
      );
      poMap[po.id] = r.rows[0].id;
      stats.purchase_orders++;
    }

    // 11. Purchase order items
    for (const item of data.purchase_order_items || []) {
      const newPoId = poMap[item.purchase_order_id];
      const newPid  = productMap[item.product_id];
      if (!newPoId || !newPid) continue;
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, quantity_received, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [newPoId, newPid, item.quantity_ordered || 0, item.quantity_received || 0, item.unit_price || null],
      );
    }

    // 12. Vehicle bookings
    for (const vb of data.vehicle_bookings || []) {
      const newLid   = vb.location_id ? (locationMap[vb.location_id] || null) : null;
      const newJobId = vb.job_id      ? (jobMap[vb.job_id]           || null) : null;
      if (!newLid) continue;
      await client.query(
        `INSERT INTO vehicle_bookings (company_id, location_id, job_id, date, start_time, end_time, booked_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, newLid, newJobId, vb.date, vb.start_time || (vb.period === 'afternoon' ? '13:00' : '08:00'), vb.end_time || (vb.period === 'morning' ? '12:00' : vb.period === 'afternoon' ? '17:00' : '17:00'), vb.booked_by ? (userMap[vb.booked_by] || null) : null, vb.notes || null],
      );
      stats.vehicle_bookings++;
    }

    // 13. User absences
    for (const a of data.user_absences || []) {
      const newUid = a.user_id ? (userMap[a.user_id] || null) : null;
      if (!newUid) continue;
      await client.query(
        `INSERT INTO user_absences (user_id, company_id, absence_date, reason, notes)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT DO NOTHING`,
        [newUid, cid, a.absence_date, a.reason || null, a.notes || null],
      ).catch(() => { /* table may not exist on older schemas */ });
      stats.user_absences++;
    }

    // 14. Company work shifts (single row per company, upsert)
    for (const ws of data.company_work_shifts || []) {
      await client.query(
        `INSERT INTO company_work_shifts (company_id, morning_start, morning_end, afternoon_start, afternoon_end, morning_late_threshold, afternoon_late_threshold, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (company_id) DO UPDATE SET
           morning_start            = EXCLUDED.morning_start,
           morning_end              = EXCLUDED.morning_end,
           afternoon_start          = EXCLUDED.afternoon_start,
           afternoon_end            = EXCLUDED.afternoon_end,
           morning_late_threshold   = EXCLUDED.morning_late_threshold,
           afternoon_late_threshold = EXCLUDED.afternoon_late_threshold,
           updated_at               = NOW()`,
        [cid, ws.morning_start, ws.morning_end, ws.afternoon_start, ws.afternoon_end,
          ws.morning_late_threshold, ws.afternoon_late_threshold],
      ).catch(() => { /* ignore */ });
    }

    // 15. Job photos
    for (const ph of data.job_photos || []) {
      const newJobId = ph.job_id ? (jobMap[ph.job_id] || null) : null;
      const newUid   = ph.created_by ? (userMap[ph.created_by] || null) : null;
      if (!newJobId) continue;
      await client.query(
        `INSERT INTO job_photos (company_id, job_id, type, url, filename, created_by, latitude, longitude, location_address, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [cid, newJobId, ph.type || 'problem', ph.url, ph.filename || null,
          newUid, ph.latitude || null, ph.longitude || null, ph.location_address || null,
          ph.created_at || new Date().toISOString()],
      ).catch(() => { /* ignore if table missing */ });
      stats.job_photos++;
    }

    await client.query('COMMIT');

    // 16. Media files: write to uploads/ outside the transaction
    if (mediaEntries.length) {
      const dir = uploadDir();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      for (const m of mediaEntries) {
        try {
          fs.writeFileSync(path.join(dir, m.name), m.data);
          stats.media_files++;
        } catch (e) {
          console.error('[data-transfer] media write failed', m.name, e.message);
        }
      }
    }

    res.json({ success: true, stats });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
