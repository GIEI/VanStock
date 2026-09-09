-- v39: persist the exact lots allocated to an outbound inventory movement.
--
-- A movement can consume more than one lot under FEFO. The batch_number stored
-- on movements is only a compatibility summary and cannot safely reconstruct
-- those allocations during a reversal.

CREATE TABLE IF NOT EXISTS movement_batch_allocations (
  id               SERIAL PRIMARY KEY,
  movement_id      INTEGER NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  product_batch_id INTEGER NOT NULL REFERENCES product_batches(id) ON DELETE RESTRICT,
  quantity         NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  batch_number     TEXT NOT NULL,
  expiry_date      DATE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- A batch is allocated at most once in the same movement; a FEFO allocation
  -- is therefore unambiguous and can be reversed from its immutable snapshot.
  CONSTRAINT uq_movement_batch_allocation UNIQUE (movement_id, product_batch_id)
);

CREATE INDEX IF NOT EXISTS idx_movement_batch_allocations_movement
  ON movement_batch_allocations (movement_id);

CREATE INDEX IF NOT EXISTS idx_movement_batch_allocations_batch
  ON movement_batch_allocations (product_batch_id);
