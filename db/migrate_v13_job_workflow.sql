-- Migration v13: Job intervention workflow
-- Adds arrival/completion timestamps to jobs and a photo table.

-- Timestamps on jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS started_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Job photos: 'problem' = before/issue photos, 'repair' = after/solution photos
CREATE TABLE IF NOT EXISTS job_photos (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('problem', 'repair')),
  url         VARCHAR(500) NOT NULL,
  filename    VARCHAR(255),
  created_by  VARCHAR(100),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job  ON job_photos (job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_type ON job_photos (job_id, type);
