-- Migration: Make job_id NOT NULL in vehicle_bookings
-- All vehicle bookings MUST be assigned to a job
-- Run cleanup-orphaned-bookings.js BEFORE this migration

-- Step 1: Delete any orphaned bookings first (if they still exist)
DELETE FROM vehicle_bookings WHERE job_id IS NULL;

-- Step 2: Add NOT NULL constraint
ALTER TABLE vehicle_bookings
  ALTER COLUMN job_id SET NOT NULL;

-- Confirmation
SELECT COUNT(*) as total_bookings FROM vehicle_bookings;
