const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createIntegrationApiKey,
  hashIntegrationKey,
  normalizeScopes,
} = require('../src/services/integration-api-key-service');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-integration-key-secret';

test('integration keys are random and only their HMAC is persisted', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [{ id: params[0], company_id: params[1], name: params[2], key_prefix: params[3], scopes: params[5] }] };
    },
  };

  const created = await createIntegrationApiKey(client, {
    companyId: 7,
    name: 'ERP produzione',
    scopes: ['events:read', 'inventory:read', 'events:read'],
  });

  assert.match(created.key, /^vsk_[A-Za-z0-9_-]{43}$/);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /INSERT INTO integration_api_keys/);
  assert.equal(queries[0].params[4], hashIntegrationKey(created.key));
  assert.notEqual(queries[0].params[4], created.key);
  assert.deepEqual(queries[0].params[5], ['events:read', 'inventory:read']);
});

test('integration scopes reject absent and unknown permissions', () => {
  assert.throws(() => normalizeScopes([]), /At least one/);
  assert.throws(() => normalizeScopes(['admin']), /Invalid integration scope/);
});
