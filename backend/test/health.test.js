const assert = require('node:assert/strict');
const test = require('node:test');

process.env.DB_HOST ??= 'localhost';
process.env.DB_NAME ??= 'stocksimple_test';
process.env.DB_USER ??= 'stockuser';
process.env.DB_PASSWORD ??= 'stockpass';
process.env.JWT_SECRET ??= 'test-secret';
process.env.UPLOAD_DIR ??= '/tmp/stocksimple-test-uploads';

const { app } = require('../src/index');

test('health route is importable without starting the production server', () => {
  const healthLayer = app._router.stack.find(layer => layer.route?.path === '/api/health');
  assert.ok(healthLayer, 'expected the health route to be registered');

  let body;
  healthLayer.route.stack[0].handle({}, { json: value => { body = value; } });

  assert.equal(body.status, 'ok');
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
});
