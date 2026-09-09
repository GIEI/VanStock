CREATE TABLE IF NOT EXISTS job_required_materials (
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_required NUMERIC(12,3) NOT NULL CHECK (quantity_required > 0),
  PRIMARY KEY (job_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_job_required_materials_job ON job_required_materials(job_id);
