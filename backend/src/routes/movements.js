const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { notifyRoles } = require('../notification-helper');
const {
  deleteMovementAndReverseStock,
  recordConfirmedMovement,
  recordPendingJobConsumption,
  runInInventoryTransaction,
} = require('../services/inventory-service');

const router = express.Router();
router.use(requireAuth);

// GET /api/movements
router.get('/', async (req, res, next) => {
  try {
    const { product_id, type, from, to, location_id, page = 1, limit = 500 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const cid = req.user.company_id;
    const conditions = ['p.company_id = $1', "m.status = 'confirmed'"];
    const params = [cid];

    if (req.user.role === 'user') {
      params.push(req.user.name);
      conditions.push(`m.created_by = $${params.length}`);
      if (!from && !to) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        params.push(todayStart.toISOString()); conditions.push(`m.created_at >= $${params.length}`);
        params.push(todayEnd.toISOString()); conditions.push(`m.created_at <= $${params.length}`);
      }
    } else if (req.query.created_by) {
      params.push(req.query.created_by);
      conditions.push(`m.created_by = $${params.length}`);
    }

    if (product_id) { params.push(parseInt(product_id)); conditions.push(`m.product_id = $${params.length}`); }
    if (type) { params.push(type); conditions.push(`m.type = $${params.length}`); }
    if (from) { params.push(from); conditions.push(`m.created_at >= $${params.length}`); }
    if (to) { params.push(to); conditions.push(`m.created_at <= $${params.length}`); }
    if (location_id) {
      params.push(parseInt(location_id));
      conditions.push(`(m.from_location_id = $${params.length} OR m.to_location_id = $${params.length})`);
    }

    params.push(parseInt(limit), offset);
    const result = await db.query(
      `SELECT m.*, p.name AS product_name, p.sku, p.unit,
              fl.name AS from_location_name, tl.name AS to_location_name, j.title AS job_title
       FROM movements m
       JOIN products p ON m.product_id = p.id
       LEFT JOIN locations fl ON m.from_location_id = fl.id
       LEFT JOIN locations tl ON m.to_location_id = tl.id
       LEFT JOIN jobs j ON m.job_id = j.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/movements
router.post('/', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const {
      product_id, type, quantity, from_location_id, to_location_id,
      notes, job_id, purchase_price, batch_number, expiry_date,
    } = req.body;
    const companyId = req.user.company_id;

    if (!product_id || !type || !quantity) {
      return res.status(400).json({ error: 'product_id, type, and quantity are required' });
    }
    if (type === 'carico' && (purchase_price == null || purchase_price === '')) {
      return res.status(400).json({ error: 'purchase_price è obbligatorio per i carichi' });
    }

    const productId = parseInt(product_id);
    const jobId = job_id ? parseInt(job_id) : null;
    const purchasePrice = type === 'carico' ? parseFloat(purchase_price) : null;
    let unitCostSnapshot = type === 'carico' ? purchasePrice : null;
    let unitPriceSnapshot = null;

    if (type === 'scarico') {
      const costResult = await db.query(
        `SELECT SUM(quantity * purchase_price) / SUM(quantity) AS avg_cost
         FROM movements WHERE product_id = $1 AND type = 'carico' AND purchase_price IS NOT NULL`,
        [productId]
      );
      unitCostSnapshot = costResult.rows[0].avg_cost != null ? Number(costResult.rows[0].avg_cost) : null;
      const priceResult = await db.query('SELECT price FROM products WHERE id = $1', [productId]);
      unitPriceSnapshot = priceResult.rows[0]?.price != null ? Number(priceResult.rows[0].price) : null;
    }

    let pendingJobScarico = false;
    if (jobId) {
      const job = await db.query(
        'SELECT started_at, signed_at FROM jobs WHERE id = $1 AND company_id = $2',
        [jobId, companyId]
      );
      if (!job.rows.length) return res.status(404).json({ error: 'Job not found' });
      if (!job.rows[0].started_at || job.rows[0].signed_at) {
        return res.status(400).json({ error: 'Materiali consentiti solo a lavoro arrivato e non firmato' });
      }
      pendingJobScarico = type === 'scarico';
    }

    await client.query('BEGIN');
    const command = {
      companyId,
      productId,
      type,
      quantity,
      fromLocationId: from_location_id || null,
      toLocationId: to_location_id || null,
      notes,
      jobId,
      createdBy: req.user.name,
      purchasePrice,
      batchNumber: batch_number,
      expiryDate: expiry_date,
      unitCostSnapshot,
      unitPriceSnapshot,
    };
    const result = pendingJobScarico
      ? { movement: await recordPendingJobConsumption(client, command) }
      : await recordConfirmedMovement(client, command);
    await client.query('COMMIT');
    res.status(201).json(result.movement);

    if (type === 'scarico' || type === 'trasferimento') {
      db.query('SELECT name, quantity, min_stock, unit FROM products WHERE id = $1', [productId]).then(result => {
        const product = result.rows[0];
        if (product && Number(product.quantity) < Number(product.min_stock) && Number(product.min_stock) > 0) {
          notifyRoles(companyId, ['admin', 'superadmin'], {
            type: 'low_stock',
            title: 'Scorta minima raggiunta',
            body: `${product.name}: ${product.quantity} ${product.unit} (sotto la scorta minima)`,
            url: '/products?low_stock=true',
          });
        }
      }).catch(() => {});
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/movements/:id — compatibility endpoint: reverses then deletes.
router.delete('/:id', async (req, res, next) => {
  try {
    await runInInventoryTransaction(db.pool, client => deleteMovementAndReverseStock(client, {
      companyId: req.user.company_id,
      movementId: req.params.id,
    }));
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
