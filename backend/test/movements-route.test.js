const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const routePath = path.join(__dirname, '../src/routes/movements.js');

test('movement route delegates inventory writes to the domain service', () => {
  const route = fs.readFileSync(routePath, 'utf8');

  assert.match(route, /recordConfirmedMovement/);
  assert.match(route, /recordPendingJobConsumption/);
  assert.match(route, /deleteMovementAndReverseStock/);
  assert.doesNotMatch(route, /UPDATE product_stocks/);
  assert.doesNotMatch(route, /INSERT INTO product_stocks/);
  assert.doesNotMatch(route, /UPDATE product_batches/);
  assert.doesNotMatch(route, /INSERT INTO product_batches/);
});
