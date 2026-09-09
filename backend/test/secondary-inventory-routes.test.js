const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const routes = ['purchase-orders.js', 'jobs.js', 'audit.js'];

test('secondary inventory routes delegate stock and batch writes to the domain service', () => {
  for (const file of routes) {
    const route = fs.readFileSync(path.join(__dirname, '../src/routes', file), 'utf8');
    assert.match(route, /inventory-service/);
    assert.doesNotMatch(route, /(INSERT INTO|UPDATE)\s+(product_stocks|product_batches)/);
  }
});

test('warehouse reconciliation delegates to the domain service', () => {
  const route = fs.readFileSync(path.join(__dirname, '../src/routes/products.js'), 'utf8');
  const start = route.indexOf("router.post('/fix-unassigned'");
  const end = route.indexOf("// GET /api/products/barcode", start);
  const handler = route.slice(start, end);

  assert.match(handler, /reassignUnassignedStock/);
  assert.doesNotMatch(handler, /(INSERT INTO|UPDATE)\s+(product_stocks|product_batches|movements)/);
});
