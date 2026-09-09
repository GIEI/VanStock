const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_ANALYTICS'));
router.use(requireAuth.requireRole('admin', 'superadmin'));

// GET /api/analytics/movements-trend?weeks=8
router.get('/movements-trend', async (req, res, next) => {
  try {
    const cid   = req.user.company_id;
    const weeks = Math.min(Math.max(parseInt(req.query.weeks) || 8, 1), 26);

    const { rows } = await db.query(
      `SELECT
         date_trunc('week', m.created_at)                     AS week_start,
         to_char(date_trunc('week', m.created_at), 'DD/MM')   AS label,
         COALESCE(SUM(CASE WHEN m.type = 'carico'        THEN m.quantity END), 0)::int AS carichi,
         COALESCE(SUM(CASE WHEN m.type = 'scarico'       THEN m.quantity END), 0)::int AS scarichi,
         COALESCE(SUM(CASE WHEN m.type = 'trasferimento' THEN m.quantity END), 0)::int AS trasferimenti
       FROM movements m
       JOIN products p ON p.id = m.product_id
       WHERE p.company_id = $1
         AND m.created_at >= NOW() - ($2 * INTERVAL '1 week')
       GROUP BY 1, 2
       ORDER BY 1`,
      [cid, weeks]
    );

    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/analytics/top-products?weeks=8&limit=5
router.get('/top-products', async (req, res, next) => {
  try {
    const cid   = req.user.company_id;
    const weeks = Math.min(Math.max(parseInt(req.query.weeks) || 8, 1), 26);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 10);

    // Top N products by total quantity moved
    const top = await db.query(
      `SELECT p.id, p.name, SUM(m.quantity)::int AS total
       FROM movements m
       JOIN products p ON p.id = m.product_id
       WHERE p.company_id = $1
         AND m.created_at >= NOW() - ($2 * INTERVAL '1 week')
       GROUP BY p.id, p.name
       ORDER BY total DESC
       LIMIT $3`,
      [cid, weeks, limit]
    );

    if (!top.rows.length) return res.json({ labels: [], products: [] });

    const ids = top.rows.map(r => r.id);

    // Weekly breakdown for those products
    const weekly = await db.query(
      `SELECT
         p.id   AS product_id,
         p.name AS product_name,
         date_trunc('week', m.created_at)                   AS week_start,
         to_char(date_trunc('week', m.created_at), 'DD/MM') AS label,
         SUM(m.quantity)::int                               AS total
       FROM movements m
       JOIN products p ON p.id = m.product_id
       WHERE p.company_id = $1
         AND p.id = ANY($2)
         AND m.created_at >= NOW() - ($3 * INTERVAL '1 week')
       GROUP BY p.id, p.name, 3, 4
       ORDER BY 3`,
      [cid, ids, weeks]
    );

    // Build sorted unique labels from actual week_start timestamps
    const weekMap = new Map();
    weekly.rows.forEach(r => {
      if (!weekMap.has(r.label)) weekMap.set(r.label, r.week_start);
    });
    const labels = [...weekMap.entries()]
      .sort((a, b) => new Date(a[1]) - new Date(b[1]))
      .map(e => e[0]);

    const products = top.rows.map(p => ({
      id:    p.id,
      name:  p.name,
      weeks: labels.map(lbl => {
        const row = weekly.rows.find(r => r.product_id === p.id && r.label === lbl);
        return row ? row.total : 0;
      }),
    }));

    res.json({ labels, products });
  } catch (err) { next(err); }
});

module.exports = router;
