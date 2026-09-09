-- v34: freeze unit cost/price on movements at transaction time, so historical
-- margin analysis stays accurate even if products.price or purchase costs change later.
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS unit_cost_snapshot DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS unit_price_snapshot DECIMAL(10,2);

-- Backfill existing scarico rows: best-effort weighted-average cost from carico
-- movements of the same product recorded up to that point in time, falling back
-- to the all-time average for that product when none preceded it.
UPDATE movements m
SET unit_cost_snapshot = COALESCE(
  (SELECT SUM(c.quantity * c.purchase_price) / SUM(c.quantity) FROM movements c
   WHERE c.product_id = m.product_id AND c.type = 'carico' AND c.purchase_price IS NOT NULL
     AND c.created_at <= m.created_at),
  (SELECT SUM(c.quantity * c.purchase_price) / SUM(c.quantity) FROM movements c
   WHERE c.product_id = m.product_id AND c.type = 'carico' AND c.purchase_price IS NOT NULL)
)
WHERE m.type = 'scarico' AND m.unit_cost_snapshot IS NULL;

-- Backfill existing scarico rows: best-effort sale price using the product's
-- current list price (no historical price record existed before this feature).
UPDATE movements m
SET unit_price_snapshot = p.price
FROM products p
WHERE p.id = m.product_id AND m.type = 'scarico' AND m.unit_price_snapshot IS NULL AND p.price IS NOT NULL;
