-- v42: idempotent command inbox for inbound ERP requests.

CREATE TABLE IF NOT EXISTS integration_inbox_commands (
  command_id          UUID PRIMARY KEY,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_key_id  UUID REFERENCES integration_api_keys(id) ON DELETE SET NULL,
  idempotency_key     VARCHAR(255) NOT NULL,
  request_hash        TEXT NOT NULL,
  schema_version      TEXT NOT NULL,
  command_type        TEXT NOT NULL,
  occurred_at         TIMESTAMP WITH TIME ZONE NOT NULL,
  correlation_id      UUID,
  payload             JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter', 'needs_mapping')),
  result              JSONB,
  error               JSONB,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_integration_inbox_idempotency UNIQUE (company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_integration_inbox_pending
  ON integration_inbox_commands (created_at, command_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_integration_inbox_company_command
  ON integration_inbox_commands (company_id, command_id);
