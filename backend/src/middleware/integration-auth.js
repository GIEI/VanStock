const db = require('../db');
const { hashIntegrationKey } = require('../services/integration-api-key-service');

async function requireIntegrationKey(req, res, next) {
  const rawKey = req.get('X-Integration-Key');
  if (!rawKey || rawKey.length > 255) return res.status(401).json({ error: 'Integration key required' });

  try {
    const result = await db.query(
      `SELECT id, company_id, scopes
       FROM integration_api_keys
       WHERE secret_hash = $1
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [hashIntegrationKey(rawKey)]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid or expired integration key' });

    const key = result.rows[0];
    req.integration = { keyId: key.id, companyId: key.company_id, scopes: key.scopes };
    await db.query('UPDATE integration_api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]);
    next();
  } catch (error) {
    next(error);
  }
}

requireIntegrationKey.requireScope = function requireScope(scope) {
  return (req, res, next) => {
    if (!req.integration?.scopes?.includes(scope)) {
      return res.status(403).json({ error: 'Integration key does not have the required scope' });
    }
    next();
  };
};

module.exports = requireIntegrationKey;
