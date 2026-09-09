-- Migration 006: Replace period slot system with time range (start_time/end_time)
-- This allows van bookings to be made for any specific time range instead of fixed slots

-- 1. Add start_time and end_time columns (initially nullable to allow data migration)
ALTER TABLE vehicle_bookings
  ADD COLUMN start_time TIME,
  ADD COLUMN end_time   TIME;

-- 2. Migrate existing data: convert period slots to time ranges
UPDATE vehicle_bookings SET start_time='08:00', end_time='12:00' WHERE period='morning';
UPDATE vehicle_bookings SET start_time='13:00', end_time='17:00' WHERE period='afternoon';
UPDATE vehicle_bookings SET start_time='08:00', end_time='17:00' WHERE period='all_day';

-- 3. Make start_time and end_time NOT NULL
ALTER TABLE vehicle_bookings
  ALTER COLUMN start_time SET NOT NULL,
  ALTER COLUMN end_time   SET NOT NULL;

-- 4. Drop the old period-based UNIQUE constraint (if it still exists)
ALTER TABLE vehicle_bookings DROP CONSTRAINT IF EXISTS vehicle_bookings_location_id_date_period_key;

-- 5. Remove the period column (no longer needed)
ALTER TABLE vehicle_bookings DROP COLUMN period;
