-- v26: introduce users.status to drive seat consumption.
--
-- ACTIVE   -> consumes one seat (counted by entitlements engine)
-- INACTIVE -> consumes zero seats (frees the seat)
-- INVITED  -> consumes one seat (reserved for the future invite flow)
--
-- We keep the legacy users.is_active boolean for backward compatibility with
-- existing endpoints/UIs; status is derived from it at backfill time and the
-- two are kept in sync by application code from now on.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('ACTIVE','INACTIVE','INVITED'));
  END IF;
END $$;

UPDATE users
SET status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END
WHERE status NOT IN ('ACTIVE','INACTIVE','INVITED')
   OR (is_active = TRUE  AND status <> 'ACTIVE')
   OR (is_active = FALSE AND status <> 'INACTIVE');

CREATE INDEX IF NOT EXISTS idx_users_company_status ON users(company_id, status);
