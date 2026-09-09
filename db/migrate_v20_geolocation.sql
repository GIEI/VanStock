-- Migration v20: Add geolocation tracking for job photos and state changes

-- ── Add geolocation to job photos ──────────────────────────────────────────

ALTER TABLE job_photos
  ADD COLUMN IF NOT EXISTS latitude  DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_address VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_job_photos_location ON job_photos (latitude, longitude) WHERE latitude IS NOT NULL;

-- ── Job state changes with geolocation ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_state_changes (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id        INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  change_type   VARCHAR(20) NOT NULL
                CHECK (change_type IN ('accept', 'arrived', 'completed', 'rejected')),
  latitude      DECIMAL(10, 8),
  longitude     DECIMAL(11, 8),
  location_address VARCHAR(500),
  changed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jsc_job       ON job_state_changes (job_id);
CREATE INDEX IF NOT EXISTS idx_jsc_company   ON job_state_changes (company_id);
CREATE INDEX IF NOT EXISTS idx_jsc_type      ON job_state_changes (change_type);
CREATE INDEX IF NOT EXISTS idx_jsc_timestamp ON job_state_changes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jsc_location  ON job_state_changes (latitude, longitude)
  WHERE latitude IS NOT NULL;
