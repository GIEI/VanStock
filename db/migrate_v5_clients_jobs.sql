-- Migration v5: Clienti, Lavori (Cantieri) e associazione ai movimenti

-- Anagrafica clienti
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  phone       VARCHAR(50),
  email       VARCHAR(255),
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients (company_id);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lavori / Cantieri
CREATE TABLE IF NOT EXISTS jobs (
  id             SERIAL PRIMARY KEY,
  company_id     INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id      INTEGER      REFERENCES clients(id) ON DELETE SET NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  address        TEXT,
  assigned_to    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  scheduled_date DATE,
  status         VARCHAR(20)  NOT NULL DEFAULT 'aperto'
                 CHECK (status IN ('aperto', 'in_corso', 'completato', 'annullato')),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_company      ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client       ON jobs (client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to  ON jobs (assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_status       ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_date         ON jobs (scheduled_date);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Collegamento movimenti → lavoro
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movements_job ON movements (job_id) WHERE job_id IS NOT NULL;
