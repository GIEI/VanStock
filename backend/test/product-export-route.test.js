const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('product Excel export uses the linked category name with legacy fallback', () => {
  const route = fs.readFileSync(path.join(__dirname, '../src/routes/products.js'), 'utf8');
  const start = route.indexOf("router.get('/export'");
  const end = route.indexOf("// POST /api/products/import", start);
  const handler = route.slice(start, end);

  assert.match(handler, /COALESCE\(pc\.name, p\.category\) AS category/);
  assert.match(handler, /SELECT p\.id, p\.name, p\.sku/);
  assert.match(handler, /LEFT JOIN product_categories pc ON pc\.id = p\.category_id/);
  assert.match(handler, /XLSX\.utils\.aoa_to_sheet/);
  assert.match(handler, /bookType: 'xlsx'/);
  assert.match(handler, /filename="prodotti\.xlsx"/);
});

test('product import resolves the category to category_id and exposes migration coverage', () => {
  const route = fs.readFileSync(path.join(__dirname, '../src/routes/products.js'), 'utf8');

  assert.match(route, /router\.get\('\/category-migration-status'/);
  assert.match(route, /INSERT INTO product_categories \(company_id, name\)/);
  assert.match(route, /category=NULL,category_id=\$8/);
  assert.match(route, /min_stock,category_id,price,notes,company_id/);
  assert.match(route, /router\.get\('\/import-template'/);
  assert.match(route, /SKU \$\{sku\} già esistente: inserisci l'id/);
});
