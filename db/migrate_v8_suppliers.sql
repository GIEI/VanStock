-- Migration v8: Supplier catalog

CREATE TABLE IF NOT EXISTS suppliers (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(255)  NOT NULL,
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

-- Link products to suppliers with purchase price
CREATE TABLE IF NOT EXISTS product_suppliers (
  product_id     INTEGER        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id    INTEGER        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_price DECIMAL(10, 2),
  is_preferred   BOOLEAN        NOT NULL DEFAULT false,
  notes          TEXT,
  PRIMARY KEY (product_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers (supplier_id);
