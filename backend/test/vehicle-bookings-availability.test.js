const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('available vans expose the exact material shortage', () => {
  const route = fs.readFileSync(
    path.join(__dirname, '../src/routes/vehicle-bookings.js'),
    'utf8'
  );
  const start = route.indexOf("router.get('/available'");
  const end = route.indexOf('// ── POST /api/vehicle-bookings', start);
  const handler = route.slice(start, end);

  assert.match(handler, /p\.sku, p\.unit/);
  assert.match(handler, /quantity_available: quantityAvailable/);
  assert.match(handler, /quantity_missing: quantityRequired - quantityAvailable/);
  assert.match(handler, /is_stock_sufficient: requiredMaterials\.length \? missingMaterials\.length === 0 : null/);
});
