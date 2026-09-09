/**
 * Cleanup script: Delete vehicle bookings that are not assigned to any job
 * Usage: node src/scripts/cleanup-orphaned-bookings.js [--dry-run]
 */

const db = require('../db');

async function cleanup() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n🔍 Cleanup: Orphaned Vehicle Bookings\n');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Step 1: Find orphaned bookings
    const orphanedQuery = `
      SELECT
        vb.id,
        vb.company_id,
        loc.name as van_name,
        loc.plate,
        vb.date,
        vb.start_time,
        vb.end_time,
        u.name as booked_by_name,
        vb.notes,
        vb.created_at
      FROM vehicle_bookings vb
      LEFT JOIN locations loc ON vb.location_id = loc.id
      LEFT JOIN users u ON vb.booked_by = u.id
      WHERE vb.job_id IS NULL
      ORDER BY vb.created_at DESC
    `;

    const orphanedBookings = await db.query(orphanedQuery);

    if (orphanedBookings.rows.length === 0) {
      console.log('✅ No orphaned bookings found!\n');
      await db.end();
      process.exit(0);
    }

    console.log(`Found ${orphanedBookings.rows.length} orphaned booking(s):\n`);
    console.table(orphanedBookings.rows);
    console.log();

    // Step 2: Delete
    if (dryRun) {
      console.log(`Would delete ${orphanedBookings.rows.length} booking(s)\n`);
    } else {
      console.log('⚠️  Deleting orphaned bookings...\n');

      const deleteQuery = `DELETE FROM vehicle_bookings WHERE job_id IS NULL`;
      const result = await db.query(deleteQuery);
      console.log(`✅ Deleted ${result.rowCount} booking(s)\n`);
    }

    console.log('✨ Cleanup complete!\n');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.end();
    process.exit(1);
  }
}

cleanup();
