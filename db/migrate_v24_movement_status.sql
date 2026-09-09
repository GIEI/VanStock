-- v24: add status column to movements for pending/confirmed lifecycle.
-- Pending = scarico recorded by mobile during an active job but not yet
-- applied to stock. Confirmed = stock has been moved (current behaviour).
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'confirmed';

UPDATE movements SET status = 'confirmed' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_movements_job_status ON movements(job_id, status);
