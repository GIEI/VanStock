-- Migration v2: add per-location stock tracking
-- Run with: docker compose exec db psql -U stockuser -d stocksimple -f /docker-entrypoint-initdb.d/migrate_v2_per_location_stocks.sql
-- Or: docker compose exec -T db psql -U stockuser -d stocksimple < db/migrate_v2_per_location_stocks.sql

CREATE TABLE IF NOT EXISTS product_stocks (
  product_id  INTEGER        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  location_id INTEGER        NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  quantity    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  CONSTRAINT product_stocks_qty_check CHECK (quantity >= 0),
  PRIMARY KEY (product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks (product_id);

-- Migrate existing product quantities into product_stocks
INSERT INTO product_stocks (product_id, location_id, quantity)
SELECT id, location_id, quantity
FROM products
WHERE location_id IS NOT NULL
ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;
