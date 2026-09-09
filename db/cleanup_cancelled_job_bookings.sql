-- Cleanup script to remove vehicle bookings for cancelled jobs
-- Eliminates bookings where: job is cancelled, job doesn't exist, or booking has no job

-- Delete bookings for cancelled jobs (status='annullato')
DELETE FROM vehicle_bookings
WHERE job_id IN (
  SELECT id FROM jobs WHERE status = 'annullato'
);

-- Delete orphaned bookings (job_id exists but job doesn't)
DELETE FROM vehicle_bookings
WHERE job_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = vehicle_bookings.job_id
  );

-- Delete bookings with NULL job_id (not associated with any job)
DELETE FROM vehicle_bookings
WHERE job_id IS NULL;
