-- v41: service-to-service credentials, never stored in clear text.

CREATE TABLE IF NOT EXISTS integration_api_keys (
  id          UUID PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  scopes      TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMP WITH TIME ZONE,
  revoked_at  TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_active
  ON integration_api_keys (secret_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_company
  ON integration_api_keys (company_id, created_at DESC);
