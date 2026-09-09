require('dotenv').config();
const db = require('./src/db');

async function run() {
  try {
    const res = await db.query(`
      SELECT p.id, p.sku, p.name, p.quantity, p.company_id,
             COALESCE((SELECT SUM(quantity) FROM product_stocks WHERE product_id = p.id), 0) as assigned
      FROM products p
      LIMIT 50
    `);
    
    console.log('--- DB STOCK CHECK ---');
    res.rows.forEach(r => {
      const diff = parseFloat(r.quantity) - parseFloat(r.assigned);
      console.log(`[${r.sku}] ${r.name} (CID: ${r.company_id}) - Total: ${r.quantity}, Assigned: ${r.assigned}, Diff: ${diff}`);
    });
    console.log('-----------------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
