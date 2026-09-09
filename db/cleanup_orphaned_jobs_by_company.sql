-- Cleanup script: Delete jobs assigned to a user but without a vehicle booking
-- For a specific company (safer than global delete)
-- Replace COMPANY_ID with your actual company ID

-- STEP 1: Preview jobs that will be deleted
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
WHERE j.company_id = :company_id
  AND j.assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_bookings vb WHERE vb.job_id = j.id
  )
ORDER BY j.created_at DESC;

-- STEP 2: Delete orphaned jobs for this company
DELETE FROM jobs
WHERE company_id = :company_id
  AND assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_bookings vb WHERE vb.job_id = jobs.id
  );

-- STEP 3: Show count
SELECT COUNT(*) as jobs_deleted;
