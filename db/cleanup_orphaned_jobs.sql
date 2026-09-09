-- Cleanup script: Delete jobs assigned to a user but without a vehicle booking
-- Run this script to remove orphaned jobs (jobs that have an assigned_to user but no van booked)

-- STEP 1: Preview jobs that will be deleted
-- Uncomment to see which jobs will be deleted before running the delete
SELECT
  j.id,
  j.title,
  j.company_id,
  u.name as assigned_to_name,
  j.scheduled_date,
  j.status,
  j.created_at
FROM jobs j
LEFT JOIN users u ON j.assigned_to = u.id
WHERE j.assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_bookings vb WHERE vb.job_id = j.id
  )
ORDER BY j.created_at DESC;

-- STEP 2: Delete orphaned jobs (those with assigned_to but no vehicle_booking)
-- Note: This will also cascade delete:
--   - job_photos (ON DELETE CASCADE)
--   - ore_lavorate (ON DELETE CASCADE)
--   - movements with this job_id (ON DELETE SET NULL)

DELETE FROM jobs
WHERE assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_bookings vb WHERE vb.job_id = jobs.id
  );

-- STEP 3: Show summary
SELECT COUNT(*) as deleted_rows FROM jobs;
