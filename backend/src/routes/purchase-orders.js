const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { recordConfirmedMovement } = require('../services/inventory-service');

const router = express.Router();
router.use(requireAuth);
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

// GET /api/purchase-orders  — list all orders for company
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let conditions = ['po.company_id = $1'];
    let params     = [req.user.company_id];

    if (status) {
      params.push(status);
      conditions.push(`po.status = $${params.length}`);
    }

    const result = await db.query(
      `SELECT po.id, po.status, po.notes, po.ordered_at, po.received_at,
              po.created_by, po.created_at, po.updated_at,
              s.id AS supplier_id, s.name AS supplier_name,
              COUNT(poi.id)::int AS item_count,
              COALESCE(SUM(poi.quantity_ordered * poi.unit_price), 0)::numeric(10,2) AS total_value
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY po.id, s.id, s.name
       ORDER BY po.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/purchase-orders/suggest  — low-stock products with preferred supplier
router.get('/suggest', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.id AS product_id, p.name AS product_name, p.sku, p.unit,
              COALESCE(whs.wh_qty, p.quantity, 0) AS current_qty, p.min_stock,
              p.min_stock - COALESCE(whs.wh_qty, p.quantity, 0) AS qty_to_order,
              sup.id AS supplier_id, sup.name AS supplier_name,
              psup.purchase_price, sup.delivery_days
       FROM products p
       LEFT JOIN (
         SELECT ps2.product_id,
                COALESCE(SUM(ps2.quantity), 0)::float AS wh_qty
         FROM product_stocks ps2
         JOIN locations l ON l.id = ps2.location_id AND l.type = 'warehouse'
         GROUP BY ps2.product_id
       ) whs ON whs.product_id = p.id
       LEFT JOIN product_suppliers psup ON psup.product_id = p.id AND psup.is_preferred = true
       LEFT JOIN suppliers sup ON sup.id = psup.supplier_id
       WHERE p.company_id = $1
         AND p.min_stock > 0
         AND COALESCE(whs.wh_qty, p.quantity, 0) < p.min_stock
       ORDER BY (p.min_stock - COALESCE(whs.wh_qty, p.quantity, 0)) DESC, p.name`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/purchase-orders/:id  — detail with items
router.get('/:id', async (req, res, next) => {
  try {
    const poResult = await db.query(
      `SELECT po.*, s.name AS supplier_name, s.email AS supplier_email,
              s.phone AS supplier_phone, s.contact_name AS supplier_contact
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1 AND po.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!poResult.rows.length) return res.status(404).json({ error: 'Order not found' });

    const itemsResult = await db.query(
      `SELECT poi.*,
              p.name AS product_name, p.sku, p.unit, p.quantity AS current_qty,
              (poi.track_lots OR COALESCE(p.tracks_batches, false)) AS track_lots
       FROM purchase_order_items poi
       JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1
       ORDER BY p.name`,
      [req.params.id]
    );

    res.json({ ...poResult.rows[0], items: itemsResult.rows });
  } catch (err) { next(err); }
});

// POST /api/purchase-orders  — create draft order
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { supplier_id, notes, items } = req.body;

    const poResult = await db.query(
      `INSERT INTO purchase_orders (company_id, supplier_id, status, notes, created_by)
       VALUES ($1, $2, 'bozza', $3, $4) RETURNING *`,
      [req.user.company_id, supplier_id || null, notes || null, req.user.email || req.user.username]
    );
    const po = poResult.rows[0];

    if (items && items.length) {
      for (const item of items) {
        await db.query(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price, notes, track_lots)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (purchase_order_id, product_id) DO UPDATE
             SET quantity_ordered=$3, unit_price=$4, notes=$5, track_lots=$6`,
          [po.id, item.product_id, item.quantity_ordered,
           item.unit_price != null ? parseFloat(item.unit_price) : null,
           item.notes || null,
           item.track_lots === true || item.track_lots === 'true']
        );
      }
    }

    // Return full detail
    const detail = await db.query(
      `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = $1`, [po.id]
    );
    const itemsBack = await db.query(
      `SELECT poi.*, p.name AS product_name, p.sku, p.unit, p.quantity AS current_qty
       FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1 ORDER BY p.name`, [po.id]
    );
    res.status(201).json({ ...detail.rows[0], items: itemsBack.rows });
  } catch (err) { next(err); }
});

// PUT /api/purchase-orders/:id  — update status / notes
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { status, notes, supplier_id } = req.body;
    const allowed = ['bozza', 'inviato', 'ricevuto'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const current = await db.query(
      'SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!current.rows.length) return res.status(404).json({ error: 'Order not found' });

    const newStatus   = status    ?? current.rows[0].status;
    const newNotes    = notes     !== undefined ? notes    : current.rows[0].notes;
    const newSupplier = supplier_id !== undefined ? supplier_id : current.rows[0].supplier_id;
    const orderedAt   = newStatus === 'inviato' && current.rows[0].status === 'bozza'
      ? 'NOW()' : null;

    const result = await db.query(
      `UPDATE purchase_orders
       SET status=$1, notes=$2, supplier_id=$3,
           ordered_at = COALESCE(${orderedAt ? 'NOW()' : 'ordered_at'}, ordered_at),
           updated_at = NOW()
       WHERE id=$4 AND company_id=$5 RETURNING *`,
      [newStatus, newNotes, newSupplier, req.params.id, req.user.company_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/purchase-orders/:id  — delete draft only
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status='bozza' RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Only draft orders can be deleted' });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/purchase-orders/:id/items  — add/update item
router.post('/:id/items', adminOnly, async (req, res, next) => {
  try {
    const po = await db.query(
      'SELECT id FROM purchase_orders WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!po.rows.length) return res.status(404).json({ error: 'Order not found' });

    const { product_id, quantity_ordered, unit_price, notes, track_lots } = req.body;
    if (!product_id || !quantity_ordered) {
      return res.status(400).json({ error: 'product_id and quantity_ordered are required' });
    }

    // Auto-enable lot tracking if the product has tracks_batches=true
    const productCheck = await db.query(
      'SELECT tracks_batches FROM products WHERE id=$1',
      [product_id]
    );
    const productTracksLots = productCheck.rows[0]?.tracks_batches === true;
    const effectiveTrackLots = (track_lots === true || track_lots === 'true') || productTracksLots;

    const result = await db.query(
      `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price, notes, track_lots)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (purchase_order_id, product_id) DO UPDATE
         SET quantity_ordered=$3, unit_price=$4, notes=$5, track_lots=$6
       RETURNING *`,
      [req.params.id, product_id, parseFloat(quantity_ordered),
       unit_price != null ? parseFloat(unit_price) : null, notes || null,
       effectiveTrackLots]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/purchase-orders/:id/items/:itemId
router.delete('/:id/items/:itemId', adminOnly, async (req, res, next) => {
  try {
    await db.query(
      `DELETE FROM purchase_order_items WHERE id=$1 AND purchase_order_id=$2`,
      [req.params.itemId, req.params.id]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/purchase-orders/:id/receive  — mark received + auto-create carico movements
router.post('/:id/receive', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { location_id, lot_entries = [] } = req.body;
    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required to receive products' });
    }

    await client.query('BEGIN');

    const po = await client.query(
      'SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 FOR UPDATE',
      [req.params.id, req.user.company_id]
    );
    if (!po.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    if (po.rows[0].status === 'ricevuto') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order already received' });
    }

    const items = await client.query(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id=$1',
      [req.params.id]
    );

    // Build lot_entries map: item_id → { batch_number, expiry_date }
    const lotMap = {};
    for (const e of lot_entries) {
      lotMap[parseInt(e.item_id)] = {
        batch_number: e.batch_number?.trim() || null,
        expiry_date:  e.expiry_date || null,
      };
    }

    // Validate: tracked items always need both batch number and expiry date.
    for (const item of items.rows) {
      if (item.track_lots) {
        const entry = lotMap[item.id];
        if (!entry || !entry.batch_number || !entry.expiry_date) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Lotto e scadenza obbligatori per il prodotto con ID ${item.product_id}`,
            item_id: item.id,
          });
        }
      }
    }

    const lid = parseInt(location_id);

    // Create carico movements for each item
    for (const item of items.rows) {
      const qty = item.quantity_received ?? item.quantity_ordered;
      if (qty > 0) {
        const lotEntry    = lotMap[item.id] || {};
        const batchNumber = item.track_lots ? lotEntry.batch_number : null;
        const expiryDate  = item.track_lots ? lotEntry.expiry_date  : null;

        await recordConfirmedMovement(client, {
          companyId: req.user.company_id,
          productId: item.product_id,
          type: 'carico',
          quantity: qty,
          toLocationId: lid,
          purchasePrice: item.unit_price || null,
          unitCostSnapshot: item.unit_price || null,
          notes: `Ricezione Ordine #${req.params.id}`,
          createdBy: req.user.name,
          batchNumber,
          expiryDate,
        });

        // Update quantity_received on item
        await client.query(
          'UPDATE purchase_order_items SET quantity_received=$1 WHERE id=$2',
          [qty, item.id]
        );
      }
    }

    // Mark order as received
    const result = await client.query(
      `UPDATE purchase_orders SET status='ricevuto', received_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
