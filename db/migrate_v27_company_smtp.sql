-- v27: per-company SMTP configuration for sending invite emails.
--
-- password_enc is encrypted at rest by backend/src/services/crypto.js
-- (AES-256-GCM) and is never returned plaintext by the API.

CREATE TABLE IF NOT EXISTS company_smtp_settings (
  id            SERIAL      PRIMARY KEY,
  company_id    INT         NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  host          VARCHAR(255) NOT NULL,
  port          INT          NOT NULL DEFAULT 587,
  secure        BOOLEAN      NOT NULL DEFAULT FALSE,
  username      VARCHAR(255) NOT NULL,
  password_enc  TEXT         NOT NULL,
  from_email    VARCHAR(255) NOT NULL,
  from_name     VARCHAR(255),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_smtp_company ON company_smtp_settings(company_id);
