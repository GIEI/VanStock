const express     = require('express');
const multer      = require('multer');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');
const XLSX        = require('xlsx');
const mailer      = require('../utils/mailer');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { recordConfirmedMovement, reassignUnassignedStock } = require('../services/inventory-service');

const router = express.Router();
router.use(requireAuth);
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const mimeMap = {
      'image/jpeg': '.jpg',
      'image/jpg':  '.jpg',
      'image/png':  '.png',
      'image/webp': '.webp',
    };
    const ext = mimeMap[file.mimetype] || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { q, category, location_id, low_stock, location_type, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const cid    = req.user.company_id;
    const lid    = location_id ? parseInt(location_id) : null;

    let conditions = ['p.company_id = $1'];
    let params     = [cid];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
    }
    if (category) {
      // Support both category_id (number) and legacy category name (string)
      if (/^\d+$/.test(category)) {
        params.push(parseInt(category));
        conditions.push(`p.category_id = $${params.length}`);
      } else {
        params.push(category);
        conditions.push(`p.category = $${params.length}`);
      }
    }

    if (location_type) {
      params.push(location_type);
      conditions.push(
        `EXISTS (SELECT 1 FROM product_stocks ps_t JOIN locations l_t ON l_t.id = ps_t.location_id WHERE ps_t.product_id = p.id AND l_t.type = $${params.length} AND ps_t.quantity > 0)`
      );
    }

    let lidParamIdx = -1;
    if (lid) {
      params.push(lid);
      lidParamIdx = params.length;
      conditions.push(`ps.quantity > 0`);
    }

    // Sotoscorta: solo magazzino (type = 'warehouse')
    const isLowStock = low_stock === 'true';
    let warehouseJoin = '';
    if (isLowStock) {
      if (lid) {
        conditions.push(`p.min_stock > 0 AND COALESCE(ps.quantity, 0) < p.min_stock`);
      } else {
        warehouseJoin = `
          LEFT JOIN (
            SELECT ps2.product_id,
                   COALESCE(SUM(ps2.quantity), 0)::float AS wh_qty,
                   (SELECT l3.name FROM product_stocks ps3
                    JOIN locations l3 ON l3.id = ps3.location_id
                    WHERE ps3.product_id = ps2.product_id AND l3.type = 'warehouse'
                    ORDER BY ps3.quantity DESC LIMIT 1) AS wh_location_name
            FROM product_stocks ps2
            JOIN locations l2 ON l2.id = ps2.location_id
            WHERE l2.type = 'warehouse'
            GROUP BY ps2.product_id
          ) whs ON whs.product_id = p.id`;
        conditions.push(`p.min_stock > 0 AND COALESCE(whs.wh_qty, 0) < p.min_stock`);
      }
    }

    const where     = `WHERE ${conditions.join(' AND ')}`;
    const stockJoin = lid
      ? `LEFT JOIN product_stocks ps ON ps.product_id = p.id AND ps.location_id = $${lidParamIdx}
         LEFT JOIN locations ls ON ls.id = ps.location_id`
      : `LEFT JOIN product_stocks ps ON FALSE`;

    const locationNameExpr = lid ? `ls.name` : (isLowStock && !lid) ? `whs.wh_location_name` : `l.name`;
    const quantityExpr     = (isLowStock && !lid) ? `COALESCE(whs.wh_qty, 0)` : `COALESCE(ps.quantity, p.quantity)`;

    params.push(parseInt(limit), offset);
    const countResult = await db.query(
      `SELECT COUNT(*) FROM products p ${stockJoin} ${warehouseJoin} ${where}`,
      params.slice(0, -2)
    );

    const result = await db.query(
      `SELECT p.*,
              ${locationNameExpr} AS location_name, l.type AS location_type,
              ${quantityExpr} AS quantity,
              ps.location_id AS stock_location_id,
              pc.name AS category_name
       FROM products p
       LEFT JOIN locations l ON p.location_id = l.id
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       ${stockJoin}
       ${warehouseJoin}
       ${where}
       ORDER BY p.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data:  result.rows,
      total: parseInt(countResult.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// GET /api/products/unassigned — list products with stock not assigned to any location
router.get('/unassigned', adminOnly, async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    console.log(`[DEBUG] Fetching unassigned products for company_id: ${cid}`);
    
    const query = `
      WITH product_stats AS (
        SELECT 
          p.id, p.name, p.sku, p.unit, p.company_id,
          p.quantity::numeric AS total_qty,
          COALESCE((SELECT SUM(ps.quantity) FROM product_stocks ps WHERE ps.product_id = p.id), 0)::numeric AS assigned_qty
        FROM products p
        WHERE p.company_id = $1
      )
      SELECT 
        id, name, sku, unit, company_id,
        total_qty::float AS total_quantity,
        assigned_qty::float AS assigned_quantity,
        (total_qty - assigned_qty)::float AS unassigned_quantity
      FROM product_stats
      WHERE ABS(total_qty - assigned_qty) > 0.001
      ORDER BY name ASC
    `;

    const result = await db.query(query, [cid]);
    console.log(`[DEBUG] Found ${result.rows.length} products with stock mismatch. Payload:`, JSON.stringify(result.rows));
    
    res.json(result.rows);
  } catch (err) { 
    console.error('[ERROR] Error in /unassigned:', err);
    next(err); 
  }
});

// POST /api/products/fix-unassigned — move unassigned stock to a specific location
router.post('/fix-unassigned', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { product_ids, location_id } = req.body;
    if (!product_ids || !product_ids.length || !location_id) {
      return res.status(400).json({ error: 'product_ids and location_id are required' });
    }

    await client.query('BEGIN');

    for (const pid of product_ids) {
      await reassignUnassignedStock(client, {
        companyId: req.user.company_id,
        productId: pid,
        destinationLocationId: location_id,
      });
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, l.name AS location_name, l.type AS location_type
       FROM products p
       LEFT JOIN locations l ON p.location_id = l.id
       WHERE p.barcode = $1 AND p.company_id = $2`,
      [req.params.barcode, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/products/categories
router.get('/categories', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name FROM product_categories
       WHERE company_id = $1
       ORDER BY name`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/products/categories
router.post('/categories', adminOnly, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name è obbligatorio' });
    const result = await db.query(
      `INSERT INTO product_categories (company_id, name)
       VALUES ($1, $2)
       ON CONFLICT (company_id, LOWER(name)) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      // Note: ON CONFLICT works because the unique index is on (company_id, LOWER(name))
      [req.user.company_id, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/products/categories/:id
router.delete('/categories/:id', adminOnly, async (req, res, next) => {
  try {
    const inUse = await db.query(
      'SELECT id FROM products WHERE category_id = $1 AND company_id = $2 LIMIT 1',
      [req.params.id, req.user.company_id]
    );
    if (inUse.rows.length) {
      return res.status(409).json({ error: 'Categoria in uso da uno o più prodotti' });
    }
    await db.query(
      'DELETE FROM product_categories WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/products/category-migration-status — verify legacy category coverage before dropping the column
router.get('/category-migration-status', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE category_id IS NOT NULL)::int AS linked,
              COUNT(*) FILTER (WHERE category_id IS NULL AND category IS NOT NULL AND TRIM(category) <> '')::int AS legacy_unlinked,
              COUNT(*) FILTER (WHERE category_id IS NULL AND (category IS NULL OR TRIM(category) = ''))::int AS uncategorized
       FROM products WHERE company_id = $1`,
      [req.user.company_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// Multer config for CSV/XLSX import (memory storage)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.xlsx$/i.test(file.originalname) ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (ok) cb(null, true); else cb(new Error('Carica un file Excel .xlsx'));
  },
});

// GET /api/products/export  — download all products as Excel workbook
router.get('/export', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.sku, p.barcode, p.description, p.quantity, p.unit,
              p.min_stock, COALESCE(pc.name, p.category) AS category, p.price, p.notes
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       WHERE p.company_id = $1
       ORDER BY p.name ASC`,
      [req.user.company_id]
    );
    const COLS = ['id','name','sku','barcode','description','quantity','unit','min_stock','category','price','notes'];
    const sheet = XLSX.utils.aoa_to_sheet([
      COLS,
      ...result.rows.map(row => COLS.map(column => row[column] ?? '')),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Prodotti');
    const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="prodotti.xlsx"');
    res.send(file);
  } catch (err) { next(err); }
});

// GET /api/products/import-template — Excel template aligned with the importer
router.get('/import-template', adminOnly, (_req, res) => {
  const columns = ['id','name','sku','barcode','description','quantity','unit','min_stock','category','price','notes'];
  const sheet = XLSX.utils.aoa_to_sheet([columns]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Prodotti');
  const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="template_prodotti.xlsx"');
  res.send(file);
});

// POST /api/products/import  — bulk create/update from XLSX
router.post('/import', adminOnly, importUpload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });
  try {
    const wb      = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws      = wb.Sheets[wb.SheetNames[0]];
    const rows    = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const cid     = req.user.company_id;
    const results = { created: 0, updated: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const r    = rows[i];
      const rawId = String(r['id'] || r['ID'] || '').trim();
      const productId = rawId ? Number(rawId) : null;
      if (rawId && (!Number.isInteger(productId) || productId <= 0)) {
        results.errors.push({ row: i + 2, reason: 'id deve essere un numero intero positivo' });
        continue;
      }
      const name = String(r['name'] || r['Nome'] || '').trim();
      const sku  = String(r['sku']  || r['SKU']  || '').trim();
      if (!name || !sku) {
        results.errors.push({ row: i + 2, reason: 'name e sku obbligatori' });
        continue;
      }
      const categoryName = String(r['category'] || r['Categoria'] || '').trim();
      let categoryId = null;
      if (categoryName) {
        const categoryResult = await db.query(
          `INSERT INTO product_categories (company_id, name)
           VALUES ($1, $2)
           ON CONFLICT (company_id, LOWER(name)) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [cid, categoryName]
        );
        categoryId = categoryResult.rows[0].id;
      }
      const vals = [
        name, sku,
        String(r['barcode']     || r['Barcode']     || '').trim() || null,
        String(r['description'] || r['Descrizione'] || '').trim() || null,
        parseFloat(r['quantity']  || r['Quantità']  || 0) || 0,
        String(r['unit']          || r['Unità']     || 'pz').trim() || 'pz',
        parseFloat(r['min_stock'] || r['Min Stock'] || 0) || 0,
        categoryId,
        parseFloat(r['price']     || r['Prezzo']    || '') || null,
        String(r['notes']         || r['Note']      || '').trim() || null,
      ];
      try {
        if (productId) {
          const existing = await db.query(
            'SELECT id FROM products WHERE id=$1 AND company_id=$2',
            [productId, cid]
          );
          if (!existing.rows.length) {
            results.errors.push({ row: i + 2, reason: `Prodotto con id ${productId} non trovato` });
            continue;
          }
          await db.query(
            `UPDATE products SET name=$1,barcode=$3,description=$4,quantity=$5,unit=$6,
             min_stock=$7,category=NULL,category_id=$8,price=$9,notes=$10
             WHERE id=$11 AND company_id=$12`,
            [...vals, productId, cid]
          );
          results.updated++;
        } else {
          const sameSku = await db.query('SELECT id FROM products WHERE sku=$1 AND company_id=$2', [sku, cid]);
          if (sameSku.rows.length) {
            results.errors.push({ row: i + 2, reason: `SKU ${sku} già esistente: inserisci l'id per aggiornare il prodotto` });
            continue;
          }
          await db.query(
            `INSERT INTO products (name,sku,barcode,description,quantity,unit,min_stock,category_id,price,notes,company_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [...vals, cid]
          );
          results.created++;
        }
      } catch (rowErr) {
        results.errors.push({ row: i + 2, reason: rowErr.message });
      }
    }
    res.json(results);
  } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, l.name AS location_name, l.type AS location_type, pc.name AS category_name
       FROM products p
       LEFT JOIN locations l ON p.location_id = l.id
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });

    const movements = await db.query(
      `SELECT m.*,
              fl.name AS from_location_name,
              tl.name AS to_location_name
       FROM movements m
       LEFT JOIN locations fl ON m.from_location_id = fl.id
       LEFT JOIN locations tl ON m.to_location_id   = tl.id
       WHERE m.product_id = $1
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    const stocks = await db.query(
      `SELECT ps.quantity, l.id AS location_id, l.name AS location_name, l.type AS location_type
       FROM product_stocks ps
       JOIN locations l ON ps.location_id = l.id
       WHERE ps.product_id = $1 AND ps.quantity > 0
       ORDER BY ps.quantity DESC`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], movements: movements.rows, stocks: stocks.rows });
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, sku, barcode, description, quantity, unit, min_stock, location_id, category, category_id, price, notes, tracks_batches, batch_number, expiry_date } = req.body;
    if (!name || !sku) return res.status(400).json({ error: 'name e sku sono obbligatori' });
    const qty = parseFloat(quantity) || 0;
    const tracksBatches = tracks_batches === true || tracks_batches === 'true';
    if (qty > 0 && !location_id) {
      return res.status(400).json({ error: 'Il magazzino è obbligatorio quando la quantità iniziale è maggiore di zero' });
    }
    if (tracksBatches && qty > 0 && (!location_id || !batch_number || !expiry_date)) {
      return res.status(400).json({ error: 'Per prodotti con lotti e scadenze, magazzino, lotto e scadenza sono obbligatori quando la quantità è maggiore di zero' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO products (company_id, name, sku, barcode, description, quantity, unit, min_stock, location_id, category, category_id, price, notes, tracks_batches)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [req.user.company_id, name, sku, barcode || null, description || null,
       0, unit || 'pz',
       parseFloat(min_stock) || 0, location_id ? parseInt(location_id) : null,
       category || null, category_id ? parseInt(category_id) : null,
       price ? parseFloat(price) : null, notes || null,
       tracksBatches]
    );

    if (qty > 0) {
      await recordConfirmedMovement(client, {
        companyId: req.user.company_id,
        productId: result.rows[0].id,
        type: 'carico',
        quantity: qty,
        toLocationId: parseInt(location_id),
        notes: 'Giacenza iniziale prodotto',
        createdBy: req.user.name,
        batchNumber: batch_number,
        expiryDate: expiry_date,
      });
    }

    const created = await client.query('SELECT * FROM products WHERE id = $1', [result.rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json(created.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'SKU già esistente' });
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/products/:id
router.put('/:id', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, sku, barcode, description, quantity, unit, min_stock, location_id, category, category_id, price, notes, tracks_batches, batch_number, expiry_date } = req.body;
    const qty = parseFloat(quantity) || 0;
    const tracksBatches = tracks_batches === true || tracks_batches === 'true';

    await client.query('BEGIN');
    const previous = await client.query(
      'SELECT quantity, tracks_batches FROM products WHERE id=$1 AND company_id=$2 FOR UPDATE',
      [req.params.id, req.user.company_id]
    );
    if (!previous.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    const quantityIncreased = qty > parseFloat(previous.rows[0].quantity);
    const trackingWasEnabled = previous.rows[0].tracks_batches === true;
    if (tracksBatches && !trackingWasEnabled && parseFloat(previous.rows[0].quantity) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Per abilitare i lotti, porta prima la quantità del prodotto a zero e ricaricala con lotto e scadenza' });
    }
    if (!tracksBatches && trackingWasEnabled && parseFloat(previous.rows[0].quantity) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Non puoi disabilitare i lotti finché il prodotto ha giacenza' });
    }
    if (tracksBatches && qty > 0 && (!trackingWasEnabled || quantityIncreased) && (!location_id || !batch_number || !expiry_date)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Per aumentare la quantità di un prodotto con lotti e scadenze, magazzino, lotto e scadenza sono obbligatori' });
    }

    const result = await client.query(
      `UPDATE products
       SET name=$1, sku=$2, barcode=$3, description=$4, quantity=$5, unit=$6,
           min_stock=$7, location_id=$8, category=$9, category_id=$10, price=$11, notes=$12, tracks_batches=$13
       WHERE id=$14 AND company_id=$15
       RETURNING *`,
      [name, sku, barcode || null, description || null,
       qty, unit || 'pz',
       parseFloat(min_stock) || 0, location_id ? parseInt(location_id) : null,
       category || null, category_id ? parseInt(category_id) : null,
       price ? parseFloat(price) : null, notes || null,
       tracksBatches,
       req.params.id, req.user.company_id]
    );
    const delta = qty - parseFloat(previous.rows[0].quantity);
    if (delta !== 0) {
      if (!location_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Il magazzino è obbligatorio per modificare la quantità' });
      }
      await recordConfirmedMovement(client, {
        companyId: req.user.company_id,
        productId: parseInt(req.params.id),
        type: delta > 0 ? 'carico' : 'scarico',
        quantity: Math.abs(delta),
        fromLocationId: delta < 0 ? parseInt(location_id) : null,
        toLocationId: delta > 0 ? parseInt(location_id) : null,
        notes: 'Rettifica quantità da modifica prodotto',
        createdBy: req.user.name,
        batchNumber: batch_number,
        expiryDate: expiry_date,
      });
    }
    const updated = await client.query('SELECT * FROM products WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'SKU già esistente' });
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/products/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM products WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/products/:id/reorder-request — notifica rifornimento all'amministratore
router.post('/:id/reorder-request', async (req, res, next) => {
  try {
    // Verifica che il prodotto esista e appartenga alla società dell'utente
    const prodResult = await db.query(
      `SELECT p.*, l.name AS location_name
       FROM products p LEFT JOIN locations l ON p.location_id = l.id
       WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!prodResult.rows.length) return res.status(404).json({ error: 'Product not found' });
    const product = prodResult.rows[0];

    // Recupera le email degli admin della società
    const adminResult = await db.query(
      `SELECT email, name FROM users
       WHERE company_id = $1 AND role IN ('admin','superadmin') AND is_active = true`,
      [req.user.company_id]
    );
    const adminEmails = adminResult.rows.map(r => r.email);

    const requester = req.user.name || req.user.email;
    const subject   = `[StockSimple] Richiesta rifornimento: ${product.name}`;
    const text = [
      `Richiesta rifornimento da: ${requester}`,
      ``,
      `Prodotto:  ${product.name} (SKU: ${product.sku})`,
      `Posizione: ${product.location_name || '—'}`,
      `Quantità attuale: ${product.quantity} ${product.unit || ''}`,
      `Scorta minima:    ${product.min_stock} ${product.unit || ''}`,
      ``,
      `Accedi a StockSimple per procedere al rifornimento.`,
    ].join('\n');

    if (adminEmails.length > 0) {
      await mailer.sendEmail({
        to:   adminEmails.join(', '),
        subject,
        text,
      });
      console.log(`[reorder-request] Notifica inviata per prodotto: ${product.name}`);
    } else {
      // Fallback: log in console se email non configurata
      console.log(`[reorder-request] SMTP non configurato. Richiesta ricevuta:\n${text}`);
    }

    res.json({ ok: true, emailSent: !!(transporter && adminEmails.length > 0) });
  } catch (err) { next(err); }
});

// POST /api/products/:id/photo
router.post('/:id/photo', adminOnly, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const photoUrl = `/uploads/${req.file.filename}`;
    const result   = await db.query(
      'UPDATE products SET photo_url=$1 WHERE id=$2 AND company_id=$3 RETURNING *',
      [photoUrl, req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
