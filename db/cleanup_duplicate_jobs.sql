-- Cleanup script for duplicate jobs
-- Removes duplicate "test nuova app" job from 2026-04-20
-- Keeps the oldest record (lowest ID) and deletes duplicates

BEGIN TRANSACTION;

-- First, let's see what duplicates we have
SELECT 'DUPLICATES FOUND:' as info;
SELECT id, title, scheduled_date, scheduled_time_custom, created_at
FROM jobs
WHERE title = 'test nuova app'
  AND scheduled_date = '2026-04-20'
ORDER BY id;

-- Create temp table with IDs to delete
CREATE TEMP TABLE temp_duplicate_ids AS
SELECT id
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY title, scheduled_date ORDER BY id) as rn
  FROM jobs
  WHERE title = 'test nuova app'
    AND scheduled_date = '2026-04-20'
) t
WHERE rn > 1;

-- Show what will be deleted
SELECT 'IDS TO DELETE:' as info;
SELECT * FROM temp_duplicate_ids;

-- Delete associated data first (job_messages, job_photos, etc.)
DELETE FROM job_photos
WHERE job_id IN (SELECT id FROM temp_duplicate_ids);

DELETE FROM job_messages
WHERE job_id IN (SELECT id FROM temp_duplicate_ids);

-- Delete the duplicate job records
DELETE FROM jobs
WHERE id IN (SELECT id FROM temp_duplicate_ids);

-- Verify cleanup
SELECT 'REMAINING RECORDS AFTER CLEANUP:' as info;
SELECT id, title, scheduled_date, scheduled_time_custom, created_at
FROM jobs
WHERE title = 'test nuova app'
  AND scheduled_date = '2026-04-20'
ORDER BY id;

COMMIT;  -- Uncomment to execute
-- ROLLBACK;  -- Uncomment to undo changes
