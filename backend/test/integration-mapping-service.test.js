const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveExternalId, validateMappingInput } = require('../src/services/integration-mapping-service');

test('mapping input accepts only explicit product and location references', () => {
  assert.deepEqual(validateMappingInput('product', 'ERP-SKU-1', '4'), { externalId: 'ERP-SKU-1', internalId: 4 });
  assert.throws(() => validateMappingInput('user', 'x', 1), error => error.code === 'invalid_mapping');
  assert.throws(() => validateMappingInput('location', '', 1), error => error.code === 'invalid_mapping');
});

test('external references resolve only within the current company', async () => {
  const client = {
    async query(_sql, params) {
      assert.deepEqual(params, [8, '2a222222-2222-4222-8222-222222222222', 'product', 'ERP-SKU-1']);
      return { rows: [{ internal_id: 4 }] };
    },
  };
  assert.equal(await resolveExternalId(client, { companyId: 8, integrationKeyId: '2a222222-2222-4222-8222-222222222222', entityType: 'product', externalId: 'ERP-SKU-1' }), 4);
});
