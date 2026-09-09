-- Migration v15: Attendance and Badge System
-- Added support for user clock-in/out and manual override requests.

CREATE TABLE IF NOT EXISTS attendance (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  morning_in      TIMESTAMP WITH TIME ZONE,
  morning_out     TIMESTAMP WITH TIME ZONE,
  afternoon_in    TIMESTAMP WITH TIME ZONE,
  afternoon_out   TIMESTAMP WITH TIME ZONE,
  status          TEXT DEFAULT 'active', -- active, closed
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_requests (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL, -- morning_in, morning_out, afternoon_in, afternoon_out
  requested_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_req_company ON attendance_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_req_status ON attendance_requests(status);
