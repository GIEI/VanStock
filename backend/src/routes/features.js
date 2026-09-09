const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAuth.requireRole('superadmin'));

function validFeatureKey(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,62}$/.test(value);
}

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT f.*, (COUNT(cf.company_id) FILTER (WHERE cf.enabled))::int AS enabled_company_count
         FROM features f
         LEFT JOIN company_features cf ON cf.feature_key = f.feature_key
        GROUP BY f.feature_key
        ORDER BY f.name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { feature_key, name, description } = req.body;
    if (!validFeatureKey(feature_key)) {
      return res.status(400).json({ error: 'feature_key non valido: usare maiuscole, numeri e underscore' });
    }
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name è obbligatorio' });
    }
    const { rows } = await db.query(
      `INSERT INTO features (feature_key, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [feature_key, name.trim(), typeof description === 'string' ? description.trim() || null : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'feature_key già esistente' });
    next(err);
  }
});

router.patch('/:featureKey', async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'name non valido' });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'description non valida' });
    }
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active non valido' });
    }
    const { rows } = await db.query(
      `UPDATE features
          SET name = COALESCE($1, name),
              description = CASE WHEN $2::boolean THEN $3 ELSE description END,
              is_active = COALESCE($4, is_active),
              updated_at = NOW()
        WHERE feature_key = $5
        RETURNING *`,
      [name?.trim() ?? null, description !== undefined, description?.trim?.() ?? description ?? null, is_active ?? null, req.params.featureKey]
    );
    if (!rows.length) return res.status(404).json({ error: 'Feature non trovata' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/resources/catalog', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM feature_resources WHERE is_active = TRUE ORDER BY platform, resource_type, name');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:featureKey/resources', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.* FROM feature_resources r
       JOIN feature_resource_bindings b ON b.resource_key = r.resource_key
       WHERE b.feature_key = $1 ORDER BY r.platform, r.resource_type, r.name`,
      [req.params.featureKey]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/:featureKey/resources', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { resource_keys } = req.body;
    if (!Array.isArray(resource_keys) || resource_keys.some(key => typeof key !== 'string')) {
      return res.status(400).json({ error: 'resource_keys deve essere un array di codici validi' });
    }
    await client.query('BEGIN');
    const feature = await client.query('SELECT 1 FROM features WHERE feature_key = $1', [req.params.featureKey]);
    if (!feature.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Feature non trovata' }); }
    const resources = await client.query('SELECT resource_key FROM feature_resources WHERE resource_key = ANY($1)', [resource_keys]);
    if (resources.rows.length !== new Set(resource_keys).size) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Uno o più target tecnici non sono registrati' }); }
    // A resource has a single owner. Reassign selected resources atomically when
    // the superadmin moves a menu, route, API group or job to another feature.
    await client.query(
      `DELETE FROM feature_resource_bindings
       WHERE resource_key = ANY($1) AND feature_key <> $2`,
      [resource_keys, req.params.featureKey]
    );
    await client.query('DELETE FROM feature_resource_bindings WHERE feature_key = $1', [req.params.featureKey]);
    for (const resourceKey of new Set(resource_keys)) {
      await client.query('INSERT INTO feature_resource_bindings (feature_key, resource_key) VALUES ($1, $2)', [req.params.featureKey, resourceKey]);
    }
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});

module.exports = router;
