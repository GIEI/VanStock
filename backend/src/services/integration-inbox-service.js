const crypto = require('crypto');

const COMMAND_TYPES = new Set([
  'catalog.item.upsert',
  'inventory.location.upsert',
  'inventory.receipt',
  'inventory.issue',
  'inventory.transfer',
  'inventory.adjustment',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function integrationError(message, status = 400, code = 'validation_error') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

function commandHash(command) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(command))).digest('hex');
}

function validateCommand(command, idempotencyKey) {
  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 255) {
    throw integrationError('Idempotency-Key is required and must be at most 255 characters');
  }
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    throw integrationError('Command body must be an object');
  }
  if (command.schemaVersion !== '1.0') throw integrationError('schemaVersion must be 1.0');
  if (!UUID_PATTERN.test(command.commandId || '')) throw integrationError('commandId must be a UUID');
  if (!COMMAND_TYPES.has(command.type)) throw integrationError('Unsupported integration command type');
  if (!command.occurredAt || Number.isNaN(new Date(command.occurredAt).getTime())) {
    throw integrationError('occurredAt must be a valid ISO date-time');
  }
  if (command.correlationId != null && !UUID_PATTERN.test(command.correlationId)) {
    throw integrationError('correlationId must be a UUID');
  }
  if (!command.data || typeof command.data !== 'object' || Array.isArray(command.data)) {
    throw integrationError('data must be an object');
  }
}

function commandStatus(row) {
  return {
    commandId: row.command_id,
    status: row.status,
    ...(row.result ? { result: row.result } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}

async function submitIntegrationCommand(client, { companyId, keyId, idempotencyKey, command }) {
  validateCommand(command, idempotencyKey);
  const hash = commandHash(command);
  const existing = await client.query(
    `SELECT command_id, idempotency_key, request_hash, status, result, error
     FROM integration_inbox_commands
     WHERE company_id = $1 AND (idempotency_key = $2 OR command_id = $3)
     FOR UPDATE`,
    [companyId, idempotencyKey, command.commandId]
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    if (row.request_hash !== hash) {
      throw integrationError('Idempotency-Key or commandId was already used with a different command', 409, 'idempotency_conflict');
    }
    return { replayed: true, command: commandStatus(row) };
  }

  const inserted = await client.query(
    `INSERT INTO integration_inbox_commands
     (command_id, company_id, integration_key_id, idempotency_key, request_hash,
        schema_version, command_type, occurred_at, correlation_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT DO NOTHING
     RETURNING command_id, status, result, error`,
    [command.commandId, companyId, keyId, idempotencyKey, hash, command.schemaVersion,
      command.type, command.occurredAt, command.correlationId || null, JSON.stringify(command)]
  );
  if (inserted.rows.length) return { replayed: false, command: commandStatus(inserted.rows[0]) };

  // A concurrent request may have inserted the same command after the first
  // lookup. ON CONFLICT keeps this transaction usable so it can return the
  // original result instead of surfacing a database uniqueness error.
  const concurrent = await client.query(
    `SELECT command_id, idempotency_key, request_hash, status, result, error
     FROM integration_inbox_commands
     WHERE company_id = $1 AND (idempotency_key = $2 OR command_id = $3)`,
    [companyId, idempotencyKey, command.commandId]
  );
  const row = concurrent.rows[0];
  if (!row || row.request_hash !== hash) {
    throw integrationError('Idempotency-Key or commandId was already used with a different command', 409, 'idempotency_conflict');
  }
  return { replayed: true, command: commandStatus(row) };
}

module.exports = { COMMAND_TYPES, commandHash, submitIntegrationCommand, validateCommand };
