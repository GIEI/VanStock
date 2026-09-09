-- v43: lease metadata for safe, recoverable inbox processing.

ALTER TABLE integration_inbox_commands
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0);

CREATE INDEX IF NOT EXISTS idx_integration_inbox_claimable
  ON integration_inbox_commands (created_at, command_id)
  WHERE status IN ('pending', 'processing');
