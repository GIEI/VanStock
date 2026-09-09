const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { ALLOWED_SCOPES, createIntegrationApiKey } = require('../services/integration-api-key-service');
const { createWebhookSubscription } = require('../services/integration-webhook-service');
const { createEntityMapping } = require('../services/integration-mapping-service');

const router = express.Router();
router.use(requireAuth, requireAuth.requireRole('admin', 'superadmin'));

router.get('/keys', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, key_prefix, scopes, created_at, expires_at, revoked_at, last_used_at
       FROM integration_api_keys
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/keys', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, scopes, expires_at: expiresAt = null } = req.body;
    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
      return res.status(400).json({ error: 'expires_at non valida' });
    }
    const created = await createIntegrationApiKey(client, {
      companyId: req.user.company_id,
      name,
      scopes,
      expiresAt,
    });
    res.status(201).json({ ...created.record, key: created.key });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  } finally {
    client.release();
  }
});

router.delete('/keys/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE integration_api_keys SET revoked_at = NOW()
       WHERE id = $1 AND company_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Integration key non trovata o già revocata' });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get('/scopes', (_req, res) => res.json([...ALLOWED_SCOPES]));

router.get('/webhooks', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, endpoint_url, event_types, active, created_at, disabled_at
       FROM integration_webhook_subscriptions WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.get('/mappings', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, integration_key_id, entity_type, external_id, internal_id, created_at, updated_at
       FROM integration_entity_mappings WHERE company_id = $1 ORDER BY entity_type, external_id`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/mappings', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const mapping = await createEntityMapping(client, {
      companyId: req.user.company_id,
      integrationKeyId: req.body.integration_key_id,
      entityType: req.body.entity_type,
      externalId: req.body.external_id,
      internalId: req.body.internal_id,
    });
    res.status(201).json(mapping);
  } catch (error) {
    if (error.status === 422) return res.status(400).json({ error: error.message });
    if (error.code === '23505') return res.status(409).json({ error: 'Mapping esterno o interno già presente' });
    next(error);
  } finally { client.release(); }
});

router.delete('/mappings/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM integration_entity_mappings WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Mapping non trovato' });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post('/webhooks', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const created = await createWebhookSubscription(client, {
      companyId: req.user.company_id,
      name: req.body.name,
      endpointUrl: req.body.endpoint_url,
      eventTypes: req.body.event_types || [],
    });
    res.status(201).json({ ...created.subscription, secret: created.secret });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('must be')) return res.status(400).json({ error: error.message });
    next(error);
  } finally { client.release(); }
});

router.delete('/webhooks/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE integration_webhook_subscriptions
       SET active = FALSE, disabled_at = NOW()
       WHERE id = $1 AND company_id = $2 AND active = TRUE
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Webhook non trovato o già disattivato' });
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
