/**
 * First-run seeder: creates the default company + superadmin user
 * if no companies exist in the database.
 * Called once at backend startup.
 */
const bcrypt = require('bcryptjs');
const db     = require('../db');

const DEFAULT_COMPANY = process.env.DEFAULT_COMPANY_NAME || 'StockSimple Demo';
const DEFAULT_EMAIL   = process.env.DEFAULT_ADMIN_EMAIL  || 'admin@example.com';
const DEFAULT_PASS    = process.env.DEFAULT_ADMIN_PASS;

async function runMigrations() {
  // Idempotent column additions — safe to run on every startup
  await db.query(`
    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS signed_at              TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS customer_signature_url TEXT,
      ADD COLUMN IF NOT EXISTS report_pdf_url         TEXT,
      ADD COLUMN IF NOT EXISTS scheduled_time         VARCHAR(20) DEFAULT 'all_day',
      ADD COLUMN IF NOT EXISTS scheduled_time_custom  TIME
  `);

}

async function seedAdmin() {
  try {
    await runMigrations();

    const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM companies');
    if (rows[0].count > 0) return; // already seeded

    if (!DEFAULT_PASS) {
      throw new Error('DEFAULT_ADMIN_PASS is required for the first startup');
    }

    console.log('[seed] No companies found — creating default company and superadmin...');

    const companyResult = await db.query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
      [DEFAULT_COMPANY]
    );
    const companyId = companyResult.rows[0].id;

    const hash = await bcrypt.hash(DEFAULT_PASS, 10);
    await db.query(
      `INSERT INTO users (company_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'superadmin')`,
      [companyId, DEFAULT_EMAIL, hash, 'Administrator']
    );

    // Assign any existing unowned locations/products to the new company
    await db.query('UPDATE locations SET company_id = $1 WHERE company_id IS NULL', [companyId]);
    await db.query('UPDATE products  SET company_id = $1 WHERE company_id IS NULL', [companyId]);

    console.log(`[seed] Done. Login: ${DEFAULT_EMAIL} / ${DEFAULT_PASS}`);
  } catch (err) {
    console.error('[seed] Error during seeding:', err.message);
  }
}

module.exports = seedAdmin;
