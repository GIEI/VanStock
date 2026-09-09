const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_SCOPES = new Set(['catalog:read', 'inventory:read', 'events:read', 'commands:write']);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function keyPepper() {
  const pepper = process.env.INTEGRATION_KEY_PEPPER || process.env.JWT_SECRET;
  if (!pepper) throw new Error('INTEGRATION_KEY_PEPPER or JWT_SECRET is required');
  return pepper;
}

function hashIntegrationKey(key) {
  return crypto.createHmac('sha256', keyPepper()).update(key).digest('hex');
}

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw validationError('At least one integration scope is required');
  }
  const normalized = [...new Set(scopes.map(scope => String(scope).trim()))];
  if (normalized.some(scope => !ALLOWED_SCOPES.has(scope))) {
    throw validationError('Invalid integration scope');
  }
  return normalized;
}

async function createIntegrationApiKey(client, { companyId, name, scopes, expiresAt = null }) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    throw validationError('A key name of up to 120 characters is required');
  }
  const normalizedScopes = normalizeScopes(scopes);
  const rawKey = `vsk_${crypto.randomBytes(32).toString('base64url')}`;
  const keyPrefix = rawKey.slice(0, 12);
  const id = uuidv4();

  const result = await client.query(
    `INSERT INTO integration_api_keys (id, company_id, name, key_prefix, secret_hash, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, company_id, name, key_prefix, scopes, created_at, expires_at`,
    [id, companyId, name.trim(), keyPrefix, hashIntegrationKey(rawKey), normalizedScopes, expiresAt]
  );
  return { key: rawKey, record: result.rows[0] };
}

module.exports = { ALLOWED_SCOPES, createIntegrationApiKey, hashIntegrationKey, normalizeScopes };
