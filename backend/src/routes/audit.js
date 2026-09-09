const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { recordConfirmedMovement } = require('../services/inventory-service');

const router   = express.Router();
const adminOnly = requireAuth.requireRole('admin', 'superadmin');
router.use(requireAuth);

// GET /api/audit/preview?location_id=X
// Returns all products with stock at this location (system quantities)
router.get('/preview', adminOnly, async (req, res, next) => {
  try {
    const { location_id } = req.query;
    const cid = req.user.company_id;

    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required' });
    }

    const lid = parseInt(location_id);

    const locResult = await db.query(
      'SELECT id, name FROM locations WHERE id = $1 AND company_id = $2',
      [lid, cid]
    );
    if (!locResult.rows.length) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // All products with stock at this location
    const result = await db.query(
      `SELECT p.id, p.name, p.sku, p.unit, p.barcode,
              COALESCE(ps.quantity, 0)::float AS system_quantity
       FROM products p
       JOIN product_stocks ps ON ps.product_id = p.id AND ps.location_id = $1
       WHERE p.company_id = $2
         AND ps.quantity > 0
       ORDER BY p.name`,
      [lid, cid]
    );

    res.json({
      location: locResult.rows[0],
      products: result.rows,
    });
  } catch (err) { next(err); }
});

// POST /api/audit/apply
// Body: { location_id, counts: [{ product_id, physical_qty }] }
// Creates carico/scarico rectification movements for each discrepancy
router.post('/apply', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { location_id, counts } = req.body;
    const cid       = req.user.company_id;
    const createdBy = req.user.name;

    if (!location_id || !Array.isArray(counts) || counts.length === 0) {
      return res.status(400).json({ error: 'location_id and a non-empty counts array are required' });
    }

    const lid       = parseInt(location_id);
    const auditDate = new Date().toLocaleDateString('it-IT');
    const notes     = `Rettifica inventario - ${auditDate}`;

    await client.query('BEGIN');

    // Verify location belongs to this company
    const locResult = await client.query(
      'SELECT id FROM locations WHERE id = $1 AND company_id = $2',
      [lid, cid]
    );
    if (!locResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Location not found' });
    }

    const discrepancies = [];

    for (const entry of counts) {
      const pid      = parseInt(entry.product_id);
      const physQty  = parseFloat(entry.physical_qty);

      if (isNaN(pid) || isNaN(physQty) || physQty < 0) continue;

      // Verify product ownership and get current stock at this location
      const productResult = await client.query(
        `SELECT p.name, p.sku, p.unit, p.tracks_batches,
                COALESCE(ps.quantity, 0)::float AS system_quantity
         FROM products p
         LEFT JOIN product_stocks ps ON ps.product_id = p.id AND ps.location_id = $2
         WHERE p.id = $1 AND p.company_id = $3
         FOR UPDATE OF p`,
        [pid, lid, cid]
      );
      if (!productResult.rows.length) continue;

      const { name, sku, unit, tracks_batches: tracksBatches, system_quantity: sysQty } = productResult.rows[0];
      const diff = physQty - sysQty;

      if (Math.abs(diff) < 0.0001) continue; // no discrepancy

      discrepancies.push({
        product_id:        pid,
        product_name:      name,
        sku,
        unit,
        system_quantity:   sysQty,
        physical_quantity: physQty,
        difference:        Math.round(diff * 1000) / 1000,
      });

      if (tracksBatches) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Il conteggio per ${name} richiede una rettifica per lotto` });
      }

      await recordConfirmedMovement(client, {
        companyId: cid,
        productId: pid,
        type: diff > 0 ? 'carico' : 'scarico',
        quantity: Math.abs(diff),
        fromLocationId: diff < 0 ? lid : null,
        toLocationId: diff > 0 ? lid : null,
        notes,
        createdBy,
      });
    }

    await client.query('COMMIT');

    res.json({ applied: discrepancies.length, discrepancies });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
