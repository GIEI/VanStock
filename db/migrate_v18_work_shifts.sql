-- Migration v18: Company Work Shifts
-- Configurable morning/afternoon time slots per company for the badge system.
-- Default: morning 08:00–13:30, afternoon 13:31–20:00.

CREATE TABLE IF NOT EXISTS company_work_shifts (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  morning_start   TIME NOT NULL DEFAULT '08:00',
  morning_end     TIME NOT NULL DEFAULT '13:30',
  afternoon_start TIME NOT NULL DEFAULT '13:31',
  afternoon_end   TIME NOT NULL DEFAULT '20:00',
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_work_shifts_company ON company_work_shifts(company_id);
