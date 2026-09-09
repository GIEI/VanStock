-- v44: outbound webhook subscriptions and per-delivery retry state.

CREATE TABLE IF NOT EXISTS integration_webhook_subscriptions (
  id                UUID PRIMARY KEY,
  company_id        INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  endpoint_url      TEXT NOT NULL,
  secret_ciphertext TEXT NOT NULL,
  event_types       TEXT[] NOT NULL DEFAULT '{}',
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  disabled_at       TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_integration_webhooks_active
  ON integration_webhook_subscriptions (company_id, created_at)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS integration_webhook_deliveries (
  id              BIGSERIAL PRIMARY KEY,
  event_id        UUID NOT NULL REFERENCES integration_outbox_events(event_id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES integration_webhook_subscriptions(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'dead_letter')),
  attempt_count   INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMP WITH TIME ZONE,
  last_error      TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_integration_webhook_delivery UNIQUE (event_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_webhook_deliveries_pending
  ON integration_webhook_deliveries (next_attempt_at, id)
  WHERE status = 'pending';
