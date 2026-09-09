const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const contractPath = path.join(__dirname, '../../docs/integrations/openapi-v1.yaml');

test('integration OpenAPI contract declares the v1 machine boundary', () => {
  const contract = fs.readFileSync(contractPath, 'utf8');

  assert.match(contract, /^openapi: 3\.1\.0$/m);
  assert.match(contract, /^  \/commands:$/m);
  assert.match(contract, /^  \/events:$/m);
  assert.match(contract, /^    integrationApiKey:$/m);
  assert.match(contract, /Idempotency-Key/);
  assert.match(contract, /inventory\.movement\.confirmed/);
});
