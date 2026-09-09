-- v25: seat-based licensing per company.
--
-- One subscription row per company, enforced 1:1 by UNIQUE(company_id).
-- plan_type, max_seats, expires_at and status drive the entitlement engine
-- in backend/src/services/entitlements.js (added in a later commit).
--
-- Backfill: every existing company gets a BASIC plan with 5 seats and no
-- expiry. Acceptable per product decision (no current customers exceed 5).

CREATE TABLE IF NOT EXISTS subscriptions (
  id          SERIAL      PRIMARY KEY,
  company_id  INT         NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  plan_type   VARCHAR(32) NOT NULL DEFAULT 'BASIC',
  max_seats   INT         NOT NULL DEFAULT 5 CHECK (max_seats >= 0),
  expires_at  TIMESTAMP   NULL,
  status      VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
              CHECK (status IN ('ACTIVE','SUSPENDED','TRIAL','PAST_DUE')),
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

-- Backfill subscriptions for existing companies that don't have one yet.
INSERT INTO subscriptions (company_id, plan_type, max_seats, status)
SELECT c.id, 'BASIC', 5, 'ACTIVE'
FROM companies c
LEFT JOIN subscriptions s ON s.company_id = c.id
WHERE s.id IS NULL;
