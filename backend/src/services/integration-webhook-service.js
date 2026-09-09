const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function encryptionKey() {
  const secret = process.env.INTEGRATION_WEBHOOK_SECRET_KEY;
  if (!secret) throw new Error('INTEGRATION_WEBHOOK_SECRET_KEY is required');
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptSecret(ciphertext) {
  const [ivValue, tagValue, encryptedValue] = String(ciphertext).split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid webhook secret ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function validateEndpointUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('endpoint_url must be a valid HTTPS URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('endpoint_url must be an HTTPS URL without credentials or a custom port');
  }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || /^127\.|^0\.0\.0\.0$|^::1$/.test(host) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    throw new Error('endpoint_url must not target a private address');
  }
  return url.toString();
}

function signWebhookPayload(payload, secret) {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

async function createWebhookSubscription(client, { companyId, name, endpointUrl, eventTypes = [] }) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) throw new Error('A webhook name of up to 120 characters is required');
  if (!Array.isArray(eventTypes) || eventTypes.some(type => typeof type !== 'string' || !type.trim())) throw new Error('event_types must be an array of event names');
  const secret = crypto.randomBytes(32).toString('base64url');
  const result = await client.query(
    `INSERT INTO integration_webhook_subscriptions
       (id, company_id, name, endpoint_url, secret_ciphertext, event_types)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, endpoint_url, event_types, active, created_at`,
    [uuidv4(), companyId, name.trim(), validateEndpointUrl(endpointUrl), encryptSecret(secret), [...new Set(eventTypes.map(type => type.trim()))]]
  );
  return { subscription: result.rows[0], secret };
}

module.exports = { createWebhookSubscription, decryptSecret, encryptSecret, signWebhookPayload, validateEndpointUrl };
