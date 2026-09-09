/**
 * Cleanup script: Delete jobs that have an assigned_to user but no vehicle booking
 * Usage: node src/scripts/cleanup-orphaned-jobs.js [--company-id=ID] [--dry-run]
 */

const db = require('../db');

async function cleanup() {
  const args = process.argv.slice(2);
  const companyId = args.find(arg => arg.startsWith('--company-id='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  console.log('\n🔍 Cleanup: Orphaned Jobs\n');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Step 1: Find orphaned jobs
    let query = `
      SELECT
        j.id,
        j.title,
        j.company_id,
        u.name as assigned_to_name,
        j.scheduled_date,
        j.status,
        j.created_at,
        (SELECT COUNT(*) FROM job_photos WHERE job_id = j.id) as photo_count,
        (SELECT COUNT(*) FROM movements WHERE job_id = j.id) as movement_count
      FROM jobs j
      LEFT JOIN users u ON j.assigned_to = u.id
      WHERE j.assigned_to IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM vehicle_bookings vb WHERE vb.job_id = j.id
        )
    `;

    if (companyId) {
      query += ` AND j.company_id = $1`;
    }

    query += ` ORDER BY j.created_at DESC`;

    const params = companyId ? [companyId] : [];
    const orphanedJobs = await db.query(query, params);

    if (orphanedJobs.rows.length === 0) {
      console.log('✅ No orphaned jobs found!\n');
      await db.end();
      process.exit(0);
    }

    console.log(`Found ${orphanedJobs.rows.length} orphaned job(s):\n`);
    console.table(orphanedJobs.rows);
    console.log();

    // Step 2: Delete
    if (dryRun) {
      console.log(`Would delete ${orphanedJobs.rows.length} job(s) and related records\n`);
    } else {
      console.log('⚠️  Deleting orphaned jobs...\n');

      let deleteQuery = `
        DELETE FROM jobs
        WHERE assigned_to IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM vehicle_bookings vb WHERE vb.job_id = jobs.id
          )
      `;

      if (companyId) {
        deleteQuery += ` AND company_id = $1`;
      }

      const result = await db.query(deleteQuery, params);
      console.log(`✅ Deleted ${result.rowCount} job(s) and all related records\n`);
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
