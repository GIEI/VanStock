-- Migration v3: Multi-tenancy — companies and users
-- Run: Get-Content db\migrate_v3_auth.sql | docker compose exec -T db psql -U stockuser -d stocksimple

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  role                VARCHAR(20) NOT NULL DEFAULT 'user'
                      CHECK (role IN ('superadmin', 'admin', 'user')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  reset_token         VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_company   ON users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_reset_tok ON users (reset_token) WHERE reset_token IS NOT NULL;

-- Add company_id to existing tables (nullable — seed-admin.js will assign values)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE products  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
