-- v45: explicit external ERP identifiers for products and locations.

CREATE TABLE IF NOT EXISTS integration_entity_mappings (
  id          BIGSERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_key_id UUID NOT NULL REFERENCES integration_api_keys(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'location')),
  external_id TEXT NOT NULL,
  internal_id INTEGER NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_integration_entity_mapping_external UNIQUE (integration_key_id, entity_type, external_id),
  CONSTRAINT uq_integration_entity_mapping_internal UNIQUE (integration_key_id, entity_type, internal_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_entity_mappings_lookup
  ON integration_entity_mappings (integration_key_id, entity_type, external_id);
