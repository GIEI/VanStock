const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    console.log('[DASHBOARD /stats] Loading stats for company:', req.user.company_id);
    const cid = req.user.company_id;
    const [products, lowStock, movements, locations, productMissingJobs] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(SUM(quantity),0) AS total_items,
                COALESCE(SUM(quantity * price) FILTER (WHERE price IS NOT NULL), 0) AS total_value
         FROM products WHERE company_id = $1`,
        [cid]
      ),
      db.query(
        `SELECT COUNT(DISTINCT p.id)::int AS count
         FROM products p
         JOIN (
           SELECT ps.product_id, COALESCE(SUM(ps.quantity), 0) as total_qty
           FROM product_stocks ps
           JOIN locations l ON l.id = ps.location_id AND l.type = 'warehouse'
           GROUP BY ps.product_id
         ) ps ON ps.product_id = p.id
         WHERE p.company_id = $1 AND p.min_stock > 0 AND ps.total_qty < p.min_stock`,
        [cid]
      ),
      db.query(
        `SELECT COUNT(*)::int AS today,
                (SELECT COUNT(*)::int FROM movements m2
                 JOIN products p2 ON m2.product_id = p2.id
                 WHERE p2.company_id = $1) AS total
         FROM movements m
         JOIN products p ON m.product_id = p.id
         WHERE p.company_id = $1 AND m.created_at >= CURRENT_DATE`,
        [cid]
      ),
      db.query(
        'SELECT COUNT(*)::int AS total FROM locations WHERE company_id = $1',
        [cid]
      ),
      db.query(
        'SELECT COUNT(*)::int AS count FROM jobs WHERE company_id = $1 AND product_missing = TRUE',
        [cid]
      ),
    ]);

    res.json({
      total_products:  products.rows[0].total,
      total_items:     parseFloat(products.rows[0].total_items),
      total_value:     parseFloat(products.rows[0].total_value),
      low_stock_count:        lowStock.rows[0].count,
      product_missing_count:  productMissingJobs.rows[0].count,
      movements_today:        movements.rows[0].today,
      total_movements: movements.rows[0].total,
      total_locations: locations.rows[0].total,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/alerts  — products below min_stock (magazzino only)
router.get('/alerts', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              whs.wh_location_name AS location_name,
              whs.wh_qty AS quantity
       FROM products p
       JOIN (
         SELECT ps.product_id,
                COALESCE(SUM(ps.quantity), 0)::float AS wh_qty,
                (SELECT l3.name FROM product_stocks ps3
                 JOIN locations l3 ON l3.id = ps3.location_id
                 WHERE ps3.product_id = ps.product_id AND l3.type = 'warehouse'
                 ORDER BY ps3.quantity DESC LIMIT 1) AS wh_location_name
         FROM product_stocks ps
         JOIN locations l2 ON l2.id = ps.location_id AND l2.type = 'warehouse'
         GROUP BY ps.product_id
       ) whs ON whs.product_id = p.id
       WHERE p.company_id = $1 AND p.min_stock > 0 AND whs.wh_qty < p.min_stock
       ORDER BY (whs.wh_qty - p.min_stock) ASC, p.name`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/recent-movements
router.get('/recent-movements', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.*,
              p.name AS product_name, p.sku, p.unit,
              fl.name AS from_location_name,
              tl.name AS to_location_name
       FROM movements m
       JOIN products p ON m.product_id = p.id
       LEFT JOIN locations fl ON m.from_location_id = fl.id
       LEFT JOIN locations tl ON m.to_location_id   = tl.id
       WHERE p.company_id = $1
       ORDER BY m.created_at DESC
       LIMIT 10`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
