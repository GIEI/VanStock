const assert = require('node:assert/strict');
const test = require('node:test');
const { commandHash, submitIntegrationCommand } = require('../src/services/integration-inbox-service');

const command = {
  schemaVersion: '1.0',
  commandId: '1a111111-1111-4111-8111-111111111111',
  type: 'inventory.receipt',
  occurredAt: '2026-09-02T10:00:00.000Z',
  data: { quantity: '2', productId: 'sku-1' },
};

test('command hashes are insensitive to object key order', () => {
  assert.equal(
    commandHash(command),
    commandHash({ data: { productId: 'sku-1', quantity: '2' }, occurredAt: command.occurredAt, type: command.type, commandId: command.commandId, schemaVersion: '1.0' })
  );
});

test('inbox accepts a command once and replays an identical retry', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT command_id')) return { rows: [] };
      return { rows: [{ command_id: command.commandId, status: 'pending', result: null, error: null }] };
    },
  };
  const submitted = await submitIntegrationCommand(client, {
    companyId: 2, keyId: '2a222222-2222-4222-8222-222222222222', idempotencyKey: 'erp-42', command,
  });

  assert.equal(submitted.replayed, false);
  assert.equal(submitted.command.status, 'pending');
  assert.ok(queries.some(query => query.sql.includes('INSERT INTO integration_inbox_commands')));

  const replayClient = {
    async query(sql) {
      if (sql.includes('SELECT command_id')) return { rows: [{ command_id: command.commandId, idempotency_key: 'erp-42', request_hash: commandHash(command), status: 'pending', result: null, error: null }] };
      throw new Error('should not insert a replay');
    },
  };
  const replay = await submitIntegrationCommand(replayClient, {
    companyId: 2, keyId: '2a222222-2222-4222-8222-222222222222', idempotencyKey: 'erp-42', command,
  });
  assert.equal(replay.replayed, true);
});

test('inbox rejects reusing an idempotency key with a different command', async () => {
  const client = {
    async query() {
      return { rows: [{ command_id: command.commandId, idempotency_key: 'erp-42', request_hash: 'different', status: 'pending' }] };
    },
  };
  await assert.rejects(
    submitIntegrationCommand(client, { companyId: 2, keyId: 'key', idempotencyKey: 'erp-42', command }),
    error => error.status === 409 && error.code === 'idempotency_conflict'
  );
});

test('inbox replays a concurrent insert instead of leaking a uniqueness error', async () => {
  let selectCount = 0;
  const row = { command_id: command.commandId, idempotency_key: 'erp-42', request_hash: commandHash(command), status: 'pending', result: null, error: null };
  const client = {
    async query(sql) {
      if (sql.includes('SELECT command_id')) return { rows: selectCount++ === 0 ? [] : [row] };
      if (sql.includes('INSERT INTO integration_inbox_commands')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const result = await submitIntegrationCommand(client, {
    companyId: 2, keyId: 'key', idempotencyKey: 'erp-42', command,
  });
  assert.equal(result.replayed, true);
});
