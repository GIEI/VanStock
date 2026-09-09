-- v8: aggiunge campo priority alla tabella jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'normale'
    CHECK (priority IN ('bassa', 'normale', 'alta', 'urgente'));
