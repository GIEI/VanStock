-- Migration: Add user_absences table for managing operator days off
-- Allows operators to register absence dates (vacation, sick leave, etc.)

CREATE TABLE IF NOT EXISTS user_absences (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  absence_date DATE       NOT NULL,
  reason      VARCHAR(100),
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, absence_date)
);

CREATE INDEX IF NOT EXISTS idx_user_absences_user ON user_absences (user_id);
CREATE INDEX IF NOT EXISTS idx_user_absences_date ON user_absences (absence_date);
CREATE INDEX IF NOT EXISTS idx_user_absences_company_date ON user_absences (company_id, absence_date);

-- Confirmation
SELECT COUNT(*) as total_absences FROM user_absences;
