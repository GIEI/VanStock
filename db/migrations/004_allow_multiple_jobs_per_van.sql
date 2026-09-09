-- Migration 004: Allow multiple jobs per van slot
-- Removed the UNIQUE constraint that prevented multiple jobs in the same van+date+period
-- This allows multiple jobs to be scheduled for the same van/time slot

-- Drop the old UNIQUE constraint
ALTER TABLE vehicle_bookings DROP CONSTRAINT IF EXISTS vehicle_bookings_location_id_date_period_key;

-- Add a composite PRIMARY KEY constraint to ensure data integrity
-- Each booking is unique by itself, but multiple bookings can exist for the same van+date+period
ALTER TABLE vehicle_bookings ADD CONSTRAINT vehicle_bookings_location_date_period_uniq UNIQUE (id);
