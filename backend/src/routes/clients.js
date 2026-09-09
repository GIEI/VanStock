const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    let conditions = ['c.company_id = $1'];
    let params     = [req.user.company_id];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
    }

    const result = await db.query(
      `SELECT c.*,
              COUNT(j.id)::int AS job_count
       FROM clients c
       LEFT JOIN jobs j ON j.client_id = c.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY c.id
       ORDER BY c.name`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/clients
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

    const result = await db.query(
      `INSERT INTO clients (company_id, name, phone, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.company_id, name, phone || null, email || null, address || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/clients/:id
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

    const result = await db.query(
      `UPDATE clients
       SET name=$1, phone=$2, email=$3, address=$4, notes=$5
       WHERE id=$6 AND company_id=$7
       RETURNING *`,
      [name, phone || null, email || null, address || null, notes || null, req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/clients/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM clients WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
