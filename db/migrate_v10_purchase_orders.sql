-- v10: Purchase orders with status workflow bozza → inviato → ricevuto

CREATE TABLE IF NOT EXISTS purchase_orders (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id  INTEGER       REFERENCES suppliers(id) ON DELETE SET NULL,
  status       VARCHAR(20)   NOT NULL DEFAULT 'bozza', -- bozza | inviato | ricevuto
  notes        TEXT,
  ordered_at   TIMESTAMP WITH TIME ZONE,
  received_at  TIMESTAMP WITH TIME ZONE,
  created_by   VARCHAR(255),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company  ON purchase_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status   ON purchase_orders (company_id, status);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INTEGER        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        INTEGER        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_ordered  DECIMAL(10,3)  NOT NULL,
  quantity_received DECIMAL(10,3),
  unit_price        DECIMAL(10,2),
  notes             TEXT,
  UNIQUE (purchase_order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_order ON purchase_order_items (purchase_order_id);
