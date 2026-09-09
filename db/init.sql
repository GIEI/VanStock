-- StockSimple Database Schema — fully consolidated (v14)
-- NOTE: Seed data (company, admin user, locations, products) is created by
--       backend/src/scripts/seed-admin.js on first startup.

-- ── Utility function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Core tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  logo_url   TEXT,
  currency   VARCHAR(3)   NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  role                VARCHAR(20)  NOT NULL DEFAULT 'user'
                      CHECK (role IN ('superadmin', 'admin', 'user')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  reset_token         VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  photo_url           TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_company   ON users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_reset_tok ON users (reset_token) WHERE reset_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS locations (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER      REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50)  NOT NULL DEFAULT 'van'
              CHECK (type IN ('warehouse', 'van', 'site', 'other')),
  status      VARCHAR(30)  NOT NULL DEFAULT 'disponibile'
              CHECK (status IN ('disponibile', 'occupato', 'in_manutenzione')),
  plate       VARCHAR(20),
  address     TEXT,
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_company ON locations (company_id);

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS product_categories (
  id         SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_company_name
  ON product_categories (company_id, LOWER(name));

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER        REFERENCES companies(id) ON DELETE CASCADE,
  name        VARCHAR(255)   NOT NULL,
  sku         VARCHAR(100)   NOT NULL,
  barcode     VARCHAR(200),
  description TEXT,
  quantity    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit        VARCHAR(50)    NOT NULL DEFAULT 'pz',
  min_stock   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  location_id INTEGER        REFERENCES locations(id) ON DELETE SET NULL,
  category    VARCHAR(100),
  category_id INTEGER        REFERENCES product_categories(id) ON DELETE SET NULL,
  photo_url   VARCHAR(500),
  price       DECIMAL(10, 2),
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_sku      ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_company  ON products (company_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode  ON products (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_location ON products (location_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS product_stocks (
  product_id  INTEGER        NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  location_id INTEGER        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  CONSTRAINT product_stocks_qty_check CHECK (quantity >= 0),
  PRIMARY KEY (product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks (product_id);

-- ── Clients & Jobs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id         SERIAL PRIMARY KEY,
  company_id INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(50),
  email      VARCHAR(255),
  address    TEXT,
  notes      TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients (company_id);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS jobs (
  id             SERIAL PRIMARY KEY,
  company_id     INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id      INTEGER      REFERENCES clients(id) ON DELETE SET NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  address        TEXT,
  assigned_to    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  scheduled_date DATE,
  scheduled_time VARCHAR(20)  DEFAULT 'all_day'
                 CHECK (scheduled_time IN ('morning', 'afternoon', 'all_day', 'custom')),
  scheduled_time_custom TIME,
  status         VARCHAR(20)  NOT NULL DEFAULT 'aperto'
                 CHECK (status IN ('aperto', 'in_corso', 'completato', 'annullato')),
  priority       VARCHAR(10)  NOT NULL DEFAULT 'normale'
                 CHECK (priority IN ('bassa', 'normale', 'alta', 'urgente')),
  started_at              TIMESTAMP WITH TIME ZONE,
  completed_at            TIMESTAMP WITH TIME ZONE,
  signed_at               TIMESTAMP WITH TIME ZONE,
  customer_signature_url  VARCHAR(500),
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_company     ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client      ON jobs (client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs (assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_date        ON jobs (scheduled_date);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Movements ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS movements (
  id               SERIAL PRIMARY KEY,
  product_id       INTEGER        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type             VARCHAR(20)    NOT NULL CHECK (type IN ('carico', 'scarico', 'trasferimento')),
  quantity         DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  from_location_id INTEGER        REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id   INTEGER        REFERENCES locations(id) ON DELETE SET NULL,
  job_id           INTEGER        REFERENCES jobs(id) ON DELETE SET NULL,
  purchase_price   DECIMAL(10, 2),
  notes            TEXT,
  created_by       VARCHAR(100),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON movements (product_id);
CREATE INDEX IF NOT EXISTS idx_movements_date    ON movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type    ON movements (type);
CREATE INDEX IF NOT EXISTS idx_movements_job     ON movements (job_id) WHERE job_id IS NOT NULL;

-- ── Push & Settings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT         NOT NULL,
  updated_at TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL  PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- ── Vehicle bookings ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_bookings (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
  job_id      INTEGER          REFERENCES jobs(id)       ON DELETE SET NULL,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  booked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vbookings_company  ON vehicle_bookings (company_id);
CREATE INDEX IF NOT EXISTS idx_vbookings_location ON vehicle_bookings (location_id);
CREATE INDEX IF NOT EXISTS idx_vbookings_job      ON vehicle_bookings (job_id);
CREATE INDEX IF NOT EXISTS idx_vbookings_date     ON vehicle_bookings (date);

-- ── Job photos ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_photos (
  id         SERIAL PRIMARY KEY,
  company_id INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id     INTEGER      NOT NULL REFERENCES jobs(id)      ON DELETE CASCADE,
  type       VARCHAR(10)  NOT NULL CHECK (type IN ('problem', 'repair')),
  url        VARCHAR(500) NOT NULL,
  filename   VARCHAR(255),
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job  ON job_photos (job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_type ON job_photos (job_id, type);

-- ── Daily reports ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_reports (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  report_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_company ON daily_reports (company_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_user    ON daily_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date    ON daily_reports (report_date);

-- ── Suppliers & Purchase orders ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  phone         VARCHAR(50),
  email         VARCHAR(255),
  website       VARCHAR(500),
  address       TEXT,
  notes         TEXT,
  delivery_days INTEGER,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers (company_id);

CREATE TABLE IF NOT EXISTS product_suppliers (
  product_id     INTEGER        NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  supplier_id    INTEGER        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_price DECIMAL(10, 2),
  is_preferred   BOOLEAN        NOT NULL DEFAULT false,
  notes          TEXT,
  PRIMARY KEY (product_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers (supplier_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER      NOT NULL REFERENCES companies(id)  ON DELETE CASCADE,
  supplier_id INTEGER               REFERENCES suppliers(id)  ON DELETE SET NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'bozza',
  notes       TEXT,
  ordered_at  TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_by  VARCHAR(255),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company  ON purchase_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status   ON purchase_orders (company_id, status);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        INTEGER        NOT NULL REFERENCES products(id)        ON DELETE CASCADE,
  quantity_ordered  DECIMAL(10, 3) NOT NULL,
  quantity_received DECIMAL(10, 3),
  unit_price        DECIMAL(10, 2),
  notes             TEXT,
  UNIQUE (purchase_order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_order ON purchase_order_items (purchase_order_id);
