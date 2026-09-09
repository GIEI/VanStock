-- v40: durable, transactional events for external integrations.
--
-- Producers insert an event through the same PostgreSQL transaction that
-- changes inventory. Dispatchers can retry independently without losing an
-- event when a connector or ERP is temporarily unavailable.

CREATE TABLE IF NOT EXISTS integration_outbox_events (
  event_id        UUID PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  schema_version  TEXT NOT NULL DEFAULT '1.0',
  payload         JSONB NOT NULL,
  occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMP WITH TIME ZONE,
  attempt_count   INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_error      TEXT
);

CREATE INDEX IF NOT EXISTS idx_integration_outbox_pending
  ON integration_outbox_events (next_attempt_at, event_id)
  WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_integration_outbox_company_event
  ON integration_outbox_events (company_id, event_id);
