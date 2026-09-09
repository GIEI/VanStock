const express = require('express');
const db      = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/inventory/batches
 * Returns all current batches with quantity > 0.
 * When product_id is specified, also includes a synthetic "Non tracciato" row
 * for each location where product_stocks > SUM(product_batches) (legacy untracked stock).
 */
router.get('/batches', async (req, res, next) => {
  try {
    const { product_id, location_id } = req.query;
    const cid = req.user.company_id;

    if (!product_id) {
      // Generic listing without product filter — return tracked batches only
      let query = `SELECT pb.*, l.name AS location_name
                   FROM product_batches pb
                   JOIN locations l ON l.id = pb.location_id
                   WHERE pb.company_id = $1 AND pb.quantity > 0`;
      const params = [cid];
      if (location_id) { params.push(parseInt(location_id)); query += ` AND pb.location_id = $${params.length}`; }
      query += ` ORDER BY pb.expiry_date ASC NULLS LAST`;
      const result = await db.query(query, params);
      return res.json(result.rows);
    }

    const pid = parseInt(product_id);
    const locFilter = location_id ? `AND ps.location_id = ${parseInt(location_id)}` : '';
    const locFilterBatch = location_id ? `AND pb.location_id = ${parseInt(location_id)}` : '';

    // Tracked batches + synthetic untracked row per location in one query
    const result = await db.query(
      `-- Tracked batch rows
       SELECT pb.id, pb.company_id, pb.product_id, pb.location_id,
              pb.batch_number, pb.expiry_date, pb.quantity::float, pb.created_at,
              l.name AS location_name
       FROM product_batches pb
       JOIN locations l ON l.id = pb.location_id
       WHERE pb.company_id = $1 AND pb.product_id = $2 AND pb.quantity > 0
       ${locFilterBatch}

       UNION ALL

       -- Synthetic "untracked" row: stock_qty - tracked_qty per location
       SELECT NULL::int         AS id,
              $1::int           AS company_id,
              ps.product_id,
              ps.location_id,
              'Non tracciato'   AS batch_number,
              NULL              AS expiry_date,
              (ps.quantity - COALESCE(SUM(pb2.quantity), 0))::float AS quantity,
              NOW()             AS created_at,
              l.name            AS location_name
       FROM product_stocks ps
       LEFT JOIN product_batches pb2
              ON pb2.product_id  = ps.product_id
             AND pb2.location_id = ps.location_id
             AND pb2.company_id  = $1
       JOIN locations l ON l.id = ps.location_id
       WHERE ps.product_id = $2
       ${locFilter}
       GROUP BY ps.product_id, ps.location_id, ps.quantity, l.name
       HAVING (ps.quantity - COALESCE(SUM(pb2.quantity), 0)) > 0

       ORDER BY expiry_date ASC NULLS LAST`,
      [cid, pid]
    );

    res.json(result.rows);
  } catch (err) { next(err); }
});

/**
 * GET /api/inventory/expiring
 * Returns batches expiring within X days (default 60).
 */
router.get('/expiring', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || 60);
    const result = await db.query(
      `SELECT pb.*, p.name AS product_name, p.sku, l.name AS location_name
       FROM product_batches pb
       JOIN products p ON p.id = pb.product_id
       JOIN locations l ON l.id = pb.location_id
       WHERE pb.company_id = $1 
         AND pb.quantity > 0
         AND pb.expiry_date IS NOT NULL
         AND pb.expiry_date <= CURRENT_DATE + interval '${days} days'
       ORDER BY pb.expiry_date ASC`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// PATCH /api/inventory/batches/:id  — update expiry_date (and optionally batch_number)
router.patch('/batches/:id', async (req, res, next) => {
  try {
    const { expiry_date } = req.body;
    const result = await db.query(
      `UPDATE product_batches
       SET expiry_date = $1
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [expiry_date || null, req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Batch not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
