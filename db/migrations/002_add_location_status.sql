-- Migration 002: Add status column to locations
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'disponibile'
    CHECK (status IN ('disponibile', 'occupato', 'in_manutenzione'));
