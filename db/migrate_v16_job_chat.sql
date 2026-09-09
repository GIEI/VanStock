-- Migration v16: Job Chat / Internal Messaging
-- Adds support for per-job internal chat between technicians and office.

CREATE TABLE IF NOT EXISTS job_messages (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT,
  type            TEXT DEFAULT 'text', -- text, audio
  audio_url       TEXT,
  audio_duration  FLOAT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_messages_job ON job_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_company ON job_messages(company_id);
