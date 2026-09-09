-- Migration v23: Late thresholds (morning/afternoon)
-- Configurable per-company late-arrival thresholds for the attendance overview.
-- Default: 09:10 morning, 14:10 afternoon.

ALTER TABLE company_work_shifts
  ADD COLUMN IF NOT EXISTS morning_late_threshold   TIME NOT NULL DEFAULT '09:10',
  ADD COLUMN IF NOT EXISTS afternoon_late_threshold TIME NOT NULL DEFAULT '14:10';
