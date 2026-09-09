const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

// GET /api/suppliers
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    let conditions = ['s.company_id = $1'];
    let params     = [req.user.company_id];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(
        `(s.name ILIKE $${params.length} OR s.contact_name ILIKE $${params.length} OR s.email ILIKE $${params.length})`
      );
    }

    const result = await db.query(
      `SELECT s.*,
              COUNT(DISTINCT ps.product_id)::int AS product_count
       FROM suppliers s
       LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY s.id
       ORDER BY s.name`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM suppliers WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/suppliers
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { name, contact_name, phone, email, website, address, notes, delivery_days } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

    const result = await db.query(
      `INSERT INTO suppliers (company_id, name, contact_name, phone, email, website, address, notes, delivery_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, name, contact_name || null, phone || null, email || null,
       website || null, address || null, notes || null, delivery_days ? parseInt(delivery_days) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/suppliers/:id
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { name, contact_name, phone, email, website, address, notes, delivery_days } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

    const result = await db.query(
      `UPDATE suppliers
       SET name=$1, contact_name=$2, phone=$3, email=$4, website=$5,
           address=$6, notes=$7, delivery_days=$8, updated_at=NOW()
       WHERE id=$9 AND company_id=$10
       RETURNING *`,
      [name, contact_name || null, phone || null, email || null, website || null,
       address || null, notes || null, delivery_days ? parseInt(delivery_days) : null,
       req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── Product-Supplier links ─────────────────────────────────────────────────────

// GET /api/suppliers/product/:productId  — list suppliers for a product
router.get('/product/:productId', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT s.id, s.name, s.contact_name, s.phone, s.email, s.delivery_days,
              ps.purchase_price, ps.is_preferred, ps.notes AS link_notes
       FROM product_suppliers ps
       JOIN suppliers s ON ps.supplier_id = s.id
       WHERE ps.product_id = $1 AND s.company_id = $2
       ORDER BY ps.is_preferred DESC, s.name`,
      [req.params.productId, cid]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/suppliers/product/:productId  — link a supplier to a product
router.post('/product/:productId', adminOnly, async (req, res, next) => {
  try {
    const { supplier_id, purchase_price, is_preferred, notes } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });

    // Verify supplier belongs to same company
    const sup = await db.query(
      'SELECT id FROM suppliers WHERE id=$1 AND company_id=$2',
      [supplier_id, req.user.company_id]
    );
    if (!sup.rows.length) return res.status(404).json({ error: 'Supplier not found' });

    const result = await db.query(
      `INSERT INTO product_suppliers (product_id, supplier_id, purchase_price, is_preferred, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_id, supplier_id)
       DO UPDATE SET purchase_price=$3, is_preferred=$4, notes=$5
       RETURNING *`,
      [req.params.productId, supplier_id,
       purchase_price ? parseFloat(purchase_price) : null,
       is_preferred === true || is_preferred === 'true' || false,
       notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/suppliers/product/:productId/:supplierId  — unlink supplier from product
router.delete('/product/:productId/:supplierId', adminOnly, async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM product_suppliers WHERE product_id=$1 AND supplier_id=$2',
      [req.params.productId, req.params.supplierId]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// DELETE /api/suppliers/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM suppliers WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Supplier not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
