-- Migration v17: Batch & Expiry Management
-- Adds tracking for batch numbers and expiry dates per product/location.

-- 1. Add tracks_batches flag to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tracks_batches BOOLEAN DEFAULT FALSE;

-- 2. Add batch/expiry info to movements for history
ALTER TABLE movements ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 3. Create product_batches table for current per-batch giacenza
-- This allows knowing exactly which batches are in which location and their quantity.
CREATE TABLE IF NOT EXISTS product_batches (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id     INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  batch_number    TEXT NOT NULL,
  expiry_date     DATE,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate batch rows for the same product/location
  CONSTRAINT uk_product_batch UNIQUE (product_id, location_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_location ON product_batches(location_id);

-- Check constraint to ensure quantity doesn't drop to 0 if we want to cleanup, 
-- but we allow 0 and then we can delete or keep it for history. 
-- For simplicity, we just check non-negative.
ALTER TABLE product_batches ADD CONSTRAINT product_batches_qty_check CHECK (quantity >= 0);
