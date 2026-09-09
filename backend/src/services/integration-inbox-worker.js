const { recordConfirmedMovement } = require('./inventory-service');
const { resolveExternalId } = require('./integration-mapping-service');

function workerError(error) {
  return { code: error.code || 'processing_error', error: error.message || 'Integration command processing failed' };
}

function movementForCommand(command) {
  const data = command.payload.data;
  const base = {
    productId: data.productId,
    quantity: data.quantity,
    batchNumber: data.batchNumber,
    expiryDate: data.expiryDate,
    purchasePrice: data.purchasePrice,
    unitCostSnapshot: data.unitCostSnapshot,
    notes: `ERP command ${command.command_id}`,
    createdBy: 'ERP integration',
    correlationId: command.payload.correlationId || command.command_id,
  };
  if (command.command_type === 'inventory.receipt') {
    return { ...base, type: 'carico', toLocationId: data.toLocationId || data.locationId };
  }
  if (command.command_type === 'inventory.issue') {
    return { ...base, type: 'scarico', fromLocationId: data.fromLocationId || data.locationId };
  }
  if (command.command_type === 'inventory.transfer') {
    return { ...base, type: 'trasferimento', fromLocationId: data.fromLocationId, toLocationId: data.toLocationId };
  }
  if (command.command_type === 'inventory.adjustment') {
    const quantity = Number(data.quantity);
    if (!Number.isFinite(quantity) || quantity === 0) {
      const error = new Error('inventory.adjustment quantity must be non-zero');
      error.code = 'invalid_quantity';
      error.status = 400;
      throw error;
    }
    return quantity > 0
      ? { ...base, type: 'carico', quantity, toLocationId: data.locationId }
      : { ...base, type: 'scarico', quantity: Math.abs(quantity), fromLocationId: data.locationId };
  }
  const error = new Error('Command requires an ERP mapping policy');
  error.code = 'needs_mapping';
  error.status = 422;
  throw error;
}

async function resolveMovementReferences(client, companyId, integrationKeyId, movement) {
  const resolved = { ...movement };
  resolved.productId = await resolveExternalId(client, { companyId, integrationKeyId, entityType: 'product', externalId: movement.productId });
  if (movement.fromLocationId != null) {
    resolved.fromLocationId = await resolveExternalId(client, { companyId, integrationKeyId, entityType: 'location', externalId: movement.fromLocationId });
  }
  if (movement.toLocationId != null) {
    resolved.toLocationId = await resolveExternalId(client, { companyId, integrationKeyId, entityType: 'location', externalId: movement.toLocationId });
  }
  return resolved;
}

async function claimNextIntegrationCommand(client) {
  const result = await client.query(
    `WITH candidate AS (
       SELECT command_id
       FROM integration_inbox_commands
       WHERE status = 'pending'
          OR (status = 'processing' AND processing_started_at < NOW() - INTERVAL '5 minutes')
       ORDER BY created_at ASC, command_id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE integration_inbox_commands inbox
     SET status = 'processing', processing_started_at = NOW(), attempt_count = attempt_count + 1, updated_at = NOW()
     FROM candidate
     WHERE inbox.command_id = candidate.command_id
     RETURNING inbox.command_id, inbox.company_id, inbox.integration_key_id, inbox.command_type, inbox.payload`,
  );
  return result.rows[0] || null;
}

async function processClaimedIntegrationCommand(client, command) {
  try {
    const commandMovement = await resolveMovementReferences(client, command.company_id, command.integration_key_id, movementForCommand(command));
    const movement = await recordConfirmedMovement(client, {
      companyId: command.company_id,
      ...commandMovement,
    });
    await client.query(
      `UPDATE integration_inbox_commands
       SET status = 'completed', result = $2::jsonb, error = NULL, processing_started_at = NULL, updated_at = NOW()
       WHERE command_id = $1`,
      [command.command_id, JSON.stringify({ movementId: String(movement.movement.id) })]
    );
    return { status: 'completed', commandId: command.command_id };
  } catch (error) {
    const status = error.code === 'needs_mapping' || error.code === 'mapping_missing' || error.code === 'product_not_found' || error.code === 'location_not_found'
      ? 'needs_mapping'
      : 'failed';
    await client.query(
      `UPDATE integration_inbox_commands
       SET status = $2, error = $3::jsonb, processing_started_at = NULL, updated_at = NOW()
       WHERE command_id = $1`,
      [command.command_id, status, JSON.stringify(workerError(error))]
    );
    return { status, commandId: command.command_id };
  }
}

async function processNextIntegrationCommand(pool) {
  const claimClient = await pool.connect();
  let command;
  try {
    await claimClient.query('BEGIN');
    command = await claimNextIntegrationCommand(claimClient);
    await claimClient.query('COMMIT');
  } catch (error) {
    await claimClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    claimClient.release();
  }
  if (!command) return null;

  const processClient = await pool.connect();
  try {
    await processClient.query('BEGIN');
    const result = await processClaimedIntegrationCommand(processClient, command);
    await processClient.query('COMMIT');
    return result;
  } catch (error) {
    await processClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    processClient.release();
  }
}

module.exports = { claimNextIntegrationCommand, movementForCommand, processNextIntegrationCommand, resolveMovementReferences };
