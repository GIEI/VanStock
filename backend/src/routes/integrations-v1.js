const express = require('express');
const db = require('../db');
const requireIntegrationKey = require('../middleware/integration-auth');
const { submitIntegrationCommand } = require('../services/integration-inbox-service');

const router = express.Router();
router.use(requireIntegrationKey);

function pagination(query) {
  const limit = query.limit == null ? 50 : Number.parseInt(query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    const error = new Error('limit must be an integer between 1 and 200');
    error.status = 400;
    throw error;
  }
  const cursor = query.cursor == null ? null : Number.parseInt(query.cursor, 10);
  if (query.cursor != null && (!Number.isInteger(cursor) || cursor < 0)) {
    const error = new Error('cursor must be a non-negative integer');
    error.status = 400;
    throw error;
  }
  return { cursor, limit };
}

function parseBalanceCursor(cursor) {
  if (cursor == null) return [0, 0];
  const match = /^(\d+):(\d+)$/.exec(cursor);
  if (!match) {
    const error = new Error('cursor must be productId:locationId');
    error.status = 400;
    throw error;
  }
  return [Number(match[1]), Number(match[2])];
}

function encodeEventCursor(row) {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, eventId: row.event_id })).toString('base64url');
}

function parseEventCursor(cursor) {
  if (cursor == null) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof value.createdAt !== 'string' || !value.eventId || Number.isNaN(new Date(value.createdAt).getTime())) throw new Error();
    return value;
  } catch {
    const error = new Error('Invalid event cursor');
    error.status = 400;
    throw error;
  }
}

router.post('/commands', requireIntegrationKey.requireScope('commands:write'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const submitted = await submitIntegrationCommand(client, {
      companyId: req.integration.companyId,
      keyId: req.integration.keyId,
      idempotencyKey: req.get('Idempotency-Key'),
      command: req.body,
    });
    await client.query('COMMIT');
    res.status(202).json({
      commandId: submitted.command.commandId,
      statusUrl: `/api/integrations/v1/commands/${submitted.command.commandId}`,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

router.get('/commands/:commandId', requireIntegrationKey.requireScope('commands:write'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT command_id, status, result, error
       FROM integration_inbox_commands
       WHERE command_id = $1 AND company_id = $2`,
      [req.params.commandId, req.integration.companyId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Integration command not found' });
    const row = result.rows[0];
    res.json({
      commandId: row.command_id,
      status: row.status,
      ...(row.result ? { result: row.result } : {}),
      ...(row.error ? { error: row.error } : {}),
    });
  } catch (error) { next(error); }
});

router.get('/catalog/items', requireIntegrationKey.requireScope('catalog:read'), async (req, res, next) => {
  try {
    const { cursor, limit } = pagination(req.query);
    const result = await db.query(
      `SELECT id, sku, barcode, name, description, unit, min_stock, price, tracks_batches, updated_at
       FROM products
       WHERE company_id = $1 AND id > $2
       ORDER BY id ASC
       LIMIT $3`,
      [req.integration.companyId, cursor || 0, limit + 1]
    );
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit).map(row => ({
      id: String(row.id), sku: row.sku, barcode: row.barcode, name: row.name,
      description: row.description, uom: row.unit, minStock: String(row.min_stock),
      price: row.price == null ? null : String(row.price), tracksBatches: row.tracks_batches,
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
    res.json({ data: rows, nextCursor: hasMore ? String(rows.at(-1).id) : null });
  } catch (error) { next(error); }
});

router.get('/inventory/locations', requireIntegrationKey.requireScope('inventory:read'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, COALESCE(NULLIF(plate, ''), 'LOC-' || id::text) AS code, name, type, status
       FROM locations WHERE company_id = $1 ORDER BY id ASC`,
      [req.integration.companyId]
    );
    res.json(result.rows.map(row => ({ ...row, id: String(row.id) })));
  } catch (error) { next(error); }
});

router.get('/inventory/balances', requireIntegrationKey.requireScope('inventory:read'), async (req, res, next) => {
  try {
    const { limit } = pagination({ limit: req.query.limit });
    const [productCursor, locationCursor] = parseBalanceCursor(req.query.cursor);
    const result = await db.query(
      `SELECT ps.product_id, ps.location_id, ps.quantity, p.unit, p.updated_at
       FROM product_stocks ps
       JOIN products p ON p.id = ps.product_id
       JOIN locations l ON l.id = ps.location_id
       WHERE p.company_id = $1
         AND ps.quantity > 0
         AND (ps.product_id, ps.location_id) > ($2, $3)
       ORDER BY ps.product_id ASC, ps.location_id ASC
       LIMIT $4`,
      [req.integration.companyId, productCursor, locationCursor, limit + 1]
    );
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit).map(row => ({
      itemId: String(row.product_id), locationId: String(row.location_id), quantity: String(row.quantity),
      uom: row.unit, asOf: new Date(row.updated_at).toISOString(),
    }));
    const last = result.rows[Math.min(result.rows.length, limit) - 1];
    res.json({ data: rows, nextCursor: hasMore ? `${last.product_id}:${last.location_id}` : null });
  } catch (error) { next(error); }
});

router.get('/events', requireIntegrationKey.requireScope('events:read'), async (req, res, next) => {
  try {
    const { limit } = pagination({ limit: req.query.limit });
    const cursor = parseEventCursor(req.query.cursor);
    const result = await db.query(
      `SELECT event_id, created_at, payload
       FROM integration_outbox_events
       WHERE company_id = $1
         AND ($2::timestamptz IS NULL OR (created_at, event_id) > ($2::timestamptz, $3::uuid))
       ORDER BY created_at ASC, event_id ASC
       LIMIT $4`,
      [req.integration.companyId, cursor?.createdAt || null, cursor?.eventId || null, limit + 1]
    );
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit).map(row => row.payload);
    res.json({ data: rows, nextCursor: hasMore ? encodeEventCursor(result.rows[limit - 1]) : null });
  } catch (error) { next(error); }
});

module.exports = router;
