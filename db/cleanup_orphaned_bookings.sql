-- Cleanup script to remove vehicle bookings where the job no longer exists
-- This fixes the data inconsistency where vans are booked for deleted jobs

-- Check for orphaned bookings (optional - just for visibility)
SELECT vb.id, vb.location_id, vb.job_id, vb.date, vb.start_time, vb.end_time
FROM vehicle_bookings vb
WHERE vb.job_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.id = vb.job_id);

-- Delete orphaned bookings
DELETE FROM vehicle_bookings vb
WHERE vb.job_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.id = vb.job_id);
