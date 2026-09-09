const crypto = require('crypto');

/**
 * AES-256-GCM symmetric encryption for secrets stored at rest (e.g. SMTP
 * passwords). The key comes from APP_ENCRYPTION_KEY in env — must be 32 bytes
 * encoded as hex (64 hex chars) or base64. The ciphertext blob includes the
 * IV and the auth tag and is stored as a single string in the DB.
 *
 * Format on disk: "v1:<iv-hex>:<tag-hex>:<ciphertext-hex>"
 */

const ALGO = 'aes-256-gcm';

function loadKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('APP_ENCRYPTION_KEY non configurata. Genera una chiave con: openssl rand -hex 32');
  }
  // Accept hex (64 chars) or base64 (44 chars)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY deve essere 32 byte (hex 64 char o base64 44 char)');
  }
  return buf;
}

function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return null;
  const key = loadKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

function decrypt(blob) {
  if (!blob) return null;
  const parts = blob.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Formato cifrato non valido');
  }
  const key = loadKey();
  const iv  = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const ct  = Buffer.from(parts[3], 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

module.exports = { encrypt, decrypt };
