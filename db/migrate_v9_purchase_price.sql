-- v9: Add purchase_price to movements for cost tracking and margin calculation
ALTER TABLE movements
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2);
