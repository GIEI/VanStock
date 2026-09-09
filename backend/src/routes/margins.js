const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_MARGINS'));

// GET /api/margins/products
// Vista listino: costo medio reale (da movimenti di carico, ora obbligatorio) e
// prezzo di listino, con margine assoluto e percentuale calcolati.
router.get('/products', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const result = await db.query(
      `SELECT
         p.id,
         p.name,
         p.sku,
         p.unit,
         p.category,
         p.price              AS sale_price,
         p.quantity           AS current_stock,
         ROUND(AVG(m.purchase_price)::numeric, 4)              AS avg_purchase_price,
         ROUND(SUM(m.quantity * m.purchase_price)::numeric, 2) AS total_loaded_cost,
         SUM(m.quantity)                                       AS total_loaded_qty,
         ROUND((p.price - AVG(m.purchase_price))::numeric, 4) AS margin_abs,
         CASE WHEN p.price > 0 AND AVG(m.purchase_price) IS NOT NULL
              THEN ROUND((((p.price - AVG(m.purchase_price)) / p.price) * 100)::numeric, 2)
              ELSE NULL END AS margin_pct,
         ROUND((p.quantity * AVG(m.purchase_price))::numeric, 2) AS stock_value_cost,
         ROUND((p.quantity * p.price)::numeric, 2)               AS stock_value_sale
       FROM products p
       LEFT JOIN movements m
         ON m.product_id = p.id
         AND m.type = 'carico'
         AND m.purchase_price IS NOT NULL
       WHERE p.company_id = $1
       GROUP BY p.id, p.name, p.sku, p.unit, p.category, p.price, p.quantity
       HAVING AVG(m.purchase_price) IS NOT NULL OR p.price IS NOT NULL
       ORDER BY p.name`,
      [cid]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/margins/jobs?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
// Costo e valore materiali per lavoro, usando i valori congelati al momento
// dello scarico (unit_cost_snapshot / unit_price_snapshot) per margini storici accurati.
router.get('/jobs', async (req, res, next) => {
  try {
    const cid       = req.user.company_id;
    const dateFrom  = req.query.date_from || null;
    const dateTo    = req.query.date_to   || null;
    const result = await db.query(
      `SELECT
         j.id,
         j.title,
         j.status,
         j.scheduled_date,
         c.name AS client_name,
         ROUND(SUM(m.quantity * COALESCE(m.unit_cost_snapshot, m.purchase_price, avg_pp.avg_price, 0))::numeric, 2) AS material_cost,
         ROUND(SUM(m.quantity * COALESCE(m.unit_price_snapshot, 0))::numeric, 2) AS material_value,
         COUNT(m.id) AS movement_count
       FROM jobs j
       JOIN movements m
         ON m.job_id = j.id
         AND m.type = 'scarico'
       LEFT JOIN (
         SELECT product_id, AVG(purchase_price) AS avg_price
         FROM movements
         WHERE type = 'carico' AND purchase_price IS NOT NULL
         GROUP BY product_id
       ) avg_pp ON avg_pp.product_id = m.product_id
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.company_id = $1
         AND ($2::date IS NULL OR j.scheduled_date >= $2::date)
         AND ($3::date IS NULL OR j.scheduled_date <= $3::date)
       GROUP BY j.id, j.title, j.status, j.scheduled_date, c.name
       ORDER BY material_cost DESC`,
      [cid, dateFrom, dateTo]
    );
    const rows = result.rows.map(r => {
      const cost   = parseFloat(r.material_cost)  || 0;
      const value  = parseFloat(r.material_value) || 0;
      const margin_abs = value > 0 ? Math.round((value - cost) * 100) / 100 : null;
      const margin_pct = value > 0 ? Math.round(((value - cost) / value) * 100 * 100) / 100 : null;
      return { ...r, margin_abs, margin_pct };
    });
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/margins/summary?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
// KPI aggregati per la dashboard margini: valore di magazzino (costo/listino),
// margine potenziale sul listino, e margine reale sui lavori nel periodo.
router.get('/summary', async (req, res, next) => {
  try {
    const cid      = req.user.company_id;
    const dateFrom = req.query.date_from || null;
    const dateTo   = req.query.date_to   || null;

    const products = await db.query(
      `SELECT
         COUNT(*) AS product_count,
         COUNT(avg_cost) AS products_with_cost,
         ROUND(SUM(p.quantity * avg_cost)::numeric, 2) AS stock_value_cost,
         ROUND(SUM(p.quantity * p.price)::numeric, 2)  AS stock_value_sale
       FROM products p
       LEFT JOIN (
         SELECT product_id, AVG(purchase_price) AS avg_cost
         FROM movements WHERE type = 'carico' AND purchase_price IS NOT NULL
         GROUP BY product_id
       ) c ON c.product_id = p.id
       WHERE p.company_id = $1`,
      [cid]
    );

    const jobs = await db.query(
      `SELECT
         ROUND(SUM(m.quantity * COALESCE(m.unit_cost_snapshot, m.purchase_price, avg_pp.avg_price, 0))::numeric, 2) AS material_cost,
         ROUND(SUM(m.quantity * COALESCE(m.unit_price_snapshot, 0))::numeric, 2) AS material_value,
         COUNT(DISTINCT j.id) AS job_count
       FROM jobs j
       JOIN movements m ON m.job_id = j.id AND m.type = 'scarico'
       LEFT JOIN (
         SELECT product_id, AVG(purchase_price) AS avg_price
         FROM movements WHERE type = 'carico' AND purchase_price IS NOT NULL
         GROUP BY product_id
       ) avg_pp ON avg_pp.product_id = m.product_id
       WHERE j.company_id = $1
         AND ($2::date IS NULL OR j.scheduled_date >= $2::date)
         AND ($3::date IS NULL OR j.scheduled_date <= $3::date)`,
      [cid, dateFrom, dateTo]
    );

    const p = products.rows[0];
    const j = jobs.rows[0];
    const stockCost = parseFloat(p.stock_value_cost) || 0;
    const stockSale = parseFloat(p.stock_value_sale) || 0;
    const jobCost    = parseFloat(j.material_cost)  || 0;
    const jobValue   = parseFloat(j.material_value) || 0;

    res.json({
      product_count:        parseInt(p.product_count, 10),
      products_with_cost:   parseInt(p.products_with_cost, 10),
      stock_value_cost:     stockCost,
      stock_value_sale:     stockSale,
      stock_margin_abs:     Math.round((stockSale - stockCost) * 100) / 100,
      stock_margin_pct:     stockSale > 0 ? Math.round(((stockSale - stockCost) / stockSale) * 100 * 100) / 100 : null,
      job_count:            parseInt(j.job_count, 10),
      job_material_cost:    jobCost,
      job_material_value:   jobValue,
      job_margin_abs:       Math.round((jobValue - jobCost) * 100) / 100,
      job_margin_pct:       jobValue > 0 ? Math.round(((jobValue - jobCost) / jobValue) * 100 * 100) / 100 : null,
    });
  } catch (err) { next(err); }
});

module.exports = router;
