require('dotenv').config();
const db = require('./src/db');

async function checkSchema() {
  try {
    const { rows } = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
      ORDER BY ordinal_position
    `);
    console.log('Jobs table columns:');
    rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkSchema();
