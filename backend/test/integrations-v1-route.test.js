const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('integration v1 read API is key-scoped and tenant-scoped', () => {
  const route = fs.readFileSync(path.join(root, 'src/routes/integrations-v1.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');

  assert.match(route, /router\.use\(requireIntegrationKey\)/);
  assert.match(route, /catalog:read/);
  assert.match(route, /inventory:read/);
  assert.match(route, /events:read/);
  assert.match(route, /commands:write/);
  assert.match(route, /submitIntegrationCommand/);
  assert.match(route, /company_id = \$1/);
  assert.match(route, /ORDER BY created_at ASC, event_id ASC/);
  assert.match(route, /encodeEventCursor/);
  assert.ok(app.indexOf("app.use('/api/integrations/v1'") < app.indexOf("app.use('/api/integrations',"));
});

test('inbox worker claims commands without holding a transaction for external work', () => {
  const worker = fs.readFileSync(path.join(root, 'src/services/integration-inbox-worker.js'), 'utf8');

  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /processing_started_at < NOW\(\) - INTERVAL '5 minutes'/);
  assert.match(worker, /recordConfirmedMovement/);
  assert.match(worker, /status = 'completed'/);
});
