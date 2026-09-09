-- migrate_v14_ore_lavorate.sql
-- Tracciamento ore lavorate per lavoro

CREATE TABLE IF NOT EXISTS ore_lavorate (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time    TIMESTAMP WITH TIME ZONE,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ore_lavorate_company ON ore_lavorate(company_id);
CREATE INDEX IF NOT EXISTS idx_ore_lavorate_job    ON ore_lavorate(job_id);
CREATE INDEX IF NOT EXISTS idx_ore_lavorate_user   ON ore_lavorate(user_id);
