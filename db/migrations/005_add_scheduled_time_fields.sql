-- Add scheduled_time and scheduled_time_custom fields to jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(20) DEFAULT 'all_day',
  ADD COLUMN IF NOT EXISTS scheduled_time_custom TIME;

-- Add constraint for valid scheduled_time values
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_scheduled_time_check,
  ADD CONSTRAINT jobs_scheduled_time_check
    CHECK (scheduled_time IN ('morning', 'afternoon', 'all_day', 'custom'));
