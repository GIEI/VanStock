-- Cleanup script for duplicate vehicle bookings
-- Removes duplicate van bookings for 2026-04-20
-- Keeps the oldest record (lowest ID) and deletes duplicates

BEGIN TRANSACTION;

-- First, let's see what duplicates we have for 2026-04-20
SELECT 'DUPLICATES FOUND:' as info;
SELECT id, location_id, date, start_time, end_time, booked_by, created_at
FROM vehicle_bookings
WHERE date = '2026-04-20'
ORDER BY id;

-- Create temp table with IDs to delete (keep lowest ID, delete the rest)
CREATE TEMP TABLE temp_dup_booking_ids AS
SELECT id
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY location_id, date, start_time, end_time ORDER BY id) as rn
  FROM vehicle_bookings
  WHERE date = '2026-04-20'
) t
WHERE rn > 1;

-- Show what will be deleted
SELECT 'IDS TO DELETE:' as info;
SELECT * FROM temp_dup_booking_ids;

-- Delete the duplicate records
DELETE FROM vehicle_bookings
WHERE id IN (SELECT id FROM temp_dup_booking_ids);

-- Verify cleanup
SELECT 'REMAINING RECORDS AFTER CLEANUP:' as info;
SELECT id, location_id, date, start_time, end_time, booked_by, created_at
FROM vehicle_bookings
WHERE date = '2026-04-20'
ORDER BY id;

COMMIT;  -- Uncomment to execute
-- ROLLBACK;  -- Uncomment to undo changes
