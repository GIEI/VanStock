const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/locations
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT l.*,
              COUNT(ps.product_id)::int AS product_count,
              COALESCE(SUM(ps.quantity), 0) AS total_items
       FROM locations l
       LEFT JOIN product_stocks ps ON ps.location_id = l.id AND ps.quantity > 0
       WHERE l.company_id = $1
       GROUP BY l.id
       ORDER BY l.name`,
      [req.user.company_id]
    );
    console.log('[DEBUG] GET /locations called by user:', req.user.email, 'company_id:', req.user.company_id);
    console.log('[DEBUG] Locations found:', result.rows.length);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/locations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM locations WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/locations
router.post('/', async (req, res, next) => {
  try {
    const { name, type, plate, address, description, status } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

    const result = await db.query(
      `INSERT INTO locations (company_id, name, type, plate, address, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.company_id, name, type || 'van', plate || null, address || null, description || null, status || 'disponibile']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/locations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, type, plate, address, description, status } = req.body;
    const result = await db.query(
      `UPDATE locations SET name=$1, type=$2, plate=$3, address=$4, description=$5, status=$6
       WHERE id=$7 AND company_id=$8 RETURNING *`,
      [name, type || 'van', plate || null, address || null, description || null, status || 'disponibile', req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/locations/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['disponibile', 'occupato', 'in_manutenzione'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Stato non valido' });

    const result = await db.query(
      `UPDATE locations SET status=$1 WHERE id=$2 AND company_id=$3 RETURNING *`,
      [status, req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Location not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/locations/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM locations WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Location not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
