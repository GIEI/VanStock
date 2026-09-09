const ENTITY_TABLES = { product: 'products', location: 'locations' };

function mappingError(message, code = 'mapping_missing') {
  const error = new Error(message);
  error.code = code;
  error.status = 422;
  return error;
}

function validateMappingInput(entityType, externalId, internalId) {
  if (!ENTITY_TABLES[entityType]) throw mappingError('entity_type must be product or location', 'invalid_mapping');
  if (typeof externalId !== 'string' || !externalId.trim() || externalId.trim().length > 255) {
    throw mappingError('external_id is required and must be at most 255 characters', 'invalid_mapping');
  }
  const id = Number(internalId);
  if (!Number.isInteger(id) || id <= 0) throw mappingError('internal_id must be a positive integer', 'invalid_mapping');
  return { externalId: externalId.trim(), internalId: id };
}

async function ensureInternalEntity(client, companyId, entityType, internalId) {
  const result = await client.query(
    `SELECT id FROM ${ENTITY_TABLES[entityType]} WHERE id = $1 AND company_id = $2`,
    [internalId, companyId]
  );
  if (!result.rows.length) throw mappingError(`${entityType} does not belong to this company`, 'invalid_mapping');
}

async function createEntityMapping(client, { companyId, integrationKeyId, entityType, externalId, internalId }) {
  const input = validateMappingInput(entityType, externalId, internalId);
  if (typeof integrationKeyId !== 'string') throw mappingError('integration_key_id is required', 'invalid_mapping');
  const key = await client.query('SELECT id FROM integration_api_keys WHERE id = $1 AND company_id = $2 AND revoked_at IS NULL', [integrationKeyId, companyId]);
  if (!key.rows.length) throw mappingError('integration_key_id does not belong to this company', 'invalid_mapping');
  await ensureInternalEntity(client, companyId, entityType, input.internalId);
  const result = await client.query(
    `INSERT INTO integration_entity_mappings (company_id, integration_key_id, entity_type, external_id, internal_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, integration_key_id, entity_type, external_id, internal_id, created_at, updated_at`,
    [companyId, integrationKeyId, entityType, input.externalId, input.internalId]
  );
  return result.rows[0];
}

async function resolveExternalId(client, { companyId, integrationKeyId, entityType, externalId }) {
  if (typeof externalId !== 'string' || !externalId.trim()) throw mappingError(`Missing ${entityType} external identifier`);
  const result = await client.query(
    `SELECT internal_id FROM integration_entity_mappings
     WHERE company_id = $1 AND integration_key_id = $2 AND entity_type = $3 AND external_id = $4`,
    [companyId, integrationKeyId, entityType, externalId.trim()]
  );
  if (!result.rows.length) throw mappingError(`No ${entityType} mapping exists for external id ${externalId}`);
  return result.rows[0].internal_id;
}

module.exports = { createEntityMapping, resolveExternalId, validateMappingInput };
