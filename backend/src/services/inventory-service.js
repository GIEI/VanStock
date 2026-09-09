const { enqueueIntegrationEvent, enqueueInventoryMovementEvent } = require('./integration-outbox-service');

class InventoryDomainError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'InventoryDomainError';
    this.code = code;
    this.status = status;
  }
}

function parsePositiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InventoryDomainError('invalid_input', `${field} must be a positive integer`);
  }
  return parsed;
}

function parsePositiveQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new InventoryDomainError('invalid_quantity', 'quantity must be greater than zero');
  }
  return parsed;
}

function normalizeMovementCommand(command) {
  const type = command.type;
  if (!['carico', 'scarico', 'trasferimento'].includes(type)) {
    throw new InventoryDomainError('invalid_movement', 'type must be carico, scarico, or trasferimento');
  }

  const normalized = {
    ...command,
    productId: parsePositiveInteger(command.productId, 'productId'),
    quantity: parsePositiveQuantity(command.quantity),
    fromLocationId: command.fromLocationId == null ? null : parsePositiveInteger(command.fromLocationId, 'fromLocationId'),
    toLocationId: command.toLocationId == null ? null : parsePositiveInteger(command.toLocationId, 'toLocationId'),
    jobId: command.jobId == null ? null : parsePositiveInteger(command.jobId, 'jobId'),
    batchNumber: command.batchNumber?.trim() || null,
    expiryDate: command.expiryDate || null,
  };

  if (type === 'carico' && (!normalized.toLocationId || normalized.fromLocationId)) {
    throw new InventoryDomainError('invalid_movement', 'carico requires a destination location only');
  }
  if (type === 'scarico' && (!normalized.fromLocationId || normalized.toLocationId)) {
    throw new InventoryDomainError('invalid_movement', 'scarico requires a source location only');
  }
  if (type === 'trasferimento' && (!normalized.fromLocationId || !normalized.toLocationId || normalized.fromLocationId === normalized.toLocationId)) {
    throw new InventoryDomainError('invalid_movement', 'trasferimento requires distinct source and destination locations');
  }

  return normalized;
}

async function lockProduct(client, productId, companyId) {
  const result = await client.query(
    `SELECT id, tracks_batches
     FROM products
     WHERE id = $1 AND company_id = $2
     FOR UPDATE`,
    [productId, companyId]
  );
  if (!result.rows.length) {
    throw new InventoryDomainError('product_not_found', 'Product not found', 404);
  }
  return result.rows[0];
}

async function lockLocations(client, locationIds, companyId) {
  const uniqueIds = [...new Set(locationIds.filter(Boolean))].sort((a, b) => a - b);
  const result = await client.query(
    `SELECT id
     FROM locations
     WHERE company_id = $1 AND id = ANY($2::int[])
     ORDER BY id
     FOR UPDATE`,
    [companyId, uniqueIds]
  );
  if (result.rows.length !== uniqueIds.length) {
    throw new InventoryDomainError('location_not_found', 'Location not found', 404);
  }
}

async function lockLocationStock(client, productId, locationId) {
  const result = await client.query(
    `SELECT quantity
     FROM product_stocks
     WHERE product_id = $1 AND location_id = $2
     FOR UPDATE`,
    [productId, locationId]
  );
  return result.rows.length ? Number(result.rows[0].quantity) : 0;
}

async function allocateBatches(client, { productId, locationId, quantity, batchNumber }) {
  const params = [productId, locationId];
  let batchFilter = '';
  if (batchNumber) {
    params.push(batchNumber);
    batchFilter = ` AND batch_number = $${params.length}`;
  }

  const result = await client.query(
    `SELECT id, quantity, batch_number, expiry_date
     FROM product_batches
     WHERE product_id = $1 AND location_id = $2 AND quantity > 0${batchFilter}
     ORDER BY expiry_date ASC NULLS LAST, created_at ASC, id ASC
     FOR UPDATE`,
    params
  );

  let remaining = quantity;
  const allocations = [];
  for (const batch of result.rows) {
    if (remaining <= 0) break;
    const allocated = Math.min(Number(batch.quantity), remaining);
    allocations.push({
      productBatchId: batch.id,
      quantity: allocated,
      batchNumber: batch.batch_number,
      expiryDate: batch.expiry_date,
    });
    remaining -= allocated;
  }

  if (remaining > 0) {
    throw new InventoryDomainError(
      'insufficient_batch_stock',
      batchNumber ? `Insufficient quantity in batch ${batchNumber}` : 'Insufficient tracked batch stock',
      422
    );
  }
  return allocations;
}

async function insertMovement(client, command, allocation) {
  const firstAllocation = allocation[0];
  const result = await client.query(
    `INSERT INTO movements
       (product_id, type, quantity, from_location_id, to_location_id, notes, job_id,
        created_by, purchase_price, batch_number, expiry_date, status,
        unit_cost_snapshot, unit_price_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed', $12, $13)
     RETURNING *`,
    [
      command.productId, command.type, command.quantity, command.fromLocationId,
      command.toLocationId, command.notes || null, command.jobId, command.createdBy || null,
      command.purchasePrice ?? null, command.batchNumber || firstAllocation?.batchNumber || null,
      command.expiryDate || firstAllocation?.expiryDate || null,
      command.unitCostSnapshot ?? null, command.unitPriceSnapshot ?? null,
    ]
  );
  return result.rows[0];
}

async function saveAllocations(client, movementId, allocations) {
  for (const allocation of allocations) {
    await client.query(
      `INSERT INTO movement_batch_allocations
         (movement_id, product_batch_id, quantity, batch_number, expiry_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [movementId, allocation.productBatchId, allocation.quantity, allocation.batchNumber, allocation.expiryDate]
    );
  }
}

async function decreaseAllocatedBatches(client, allocations) {
  for (const allocation of allocations) {
    const result = await client.query(
      `UPDATE product_batches
       SET quantity = quantity - $2
       WHERE id = $1 AND quantity >= $2`,
      [allocation.productBatchId, allocation.quantity]
    );
    if (result.rowCount !== 1) {
      throw new InventoryDomainError('insufficient_batch_stock', 'Batch stock changed while processing the movement', 422);
    }
  }
}

async function addBatchStock(client, companyId, productId, locationId, batchNumber, expiryDate, quantity) {
  const result = await client.query(
    `INSERT INTO product_batches (company_id, product_id, location_id, batch_number, expiry_date, quantity)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (product_id, location_id, batch_number)
     DO UPDATE SET quantity = product_batches.quantity + EXCLUDED.quantity,
                   expiry_date = COALESCE(EXCLUDED.expiry_date, product_batches.expiry_date)
     RETURNING id, batch_number, expiry_date`,
    [companyId, productId, locationId, batchNumber, expiryDate, quantity]
  );
  return result.rows[0];
}

async function updateProductTotal(client, productId, latestLocationId = null) {
  await client.query(
    `UPDATE products
     SET quantity = (SELECT COALESCE(SUM(quantity), 0) FROM product_stocks WHERE product_id = $1),
         location_id = COALESCE($2, location_id)
     WHERE id = $1`,
    [productId, latestLocationId]
  );
}

async function recordPendingJobConsumption(client, { companyId, ...rawCommand }) {
  const command = normalizeMovementCommand(rawCommand);
  if (command.type !== 'scarico' || !command.jobId) {
    throw new InventoryDomainError('invalid_movement', 'A pending movement must be a job scarico');
  }

  await lockProduct(client, command.productId, companyId);
  await lockLocations(client, [command.fromLocationId], companyId);
  const result = await client.query(
    `INSERT INTO movements
       (product_id, type, quantity, from_location_id, to_location_id, notes, job_id,
        created_by, purchase_price, batch_number, expiry_date, status,
        unit_cost_snapshot, unit_price_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13)
     RETURNING *`,
    [
      command.productId, command.type, command.quantity, command.fromLocationId,
      command.toLocationId, command.notes || null, command.jobId, command.createdBy || null,
      command.purchasePrice ?? null, command.batchNumber, command.expiryDate,
      command.unitCostSnapshot ?? null, command.unitPriceSnapshot ?? null,
    ]
  );
  return result.rows[0];
}

async function confirmPendingJobConsumption(client, { companyId, movementId }) {
  const movement = await getMovementForReversal(client, parsePositiveInteger(movementId, 'movementId'), companyId);
  if (movement.status !== 'pending' || movement.type !== 'scarico' || !movement.job_id) {
    throw new InventoryDomainError('invalid_movement', 'Only pending job scarichi can be confirmed');
  }

  await lockLocations(client, [movement.from_location_id], companyId);
  const quantity = Number(movement.quantity);
  const availableStock = await lockLocationStock(client, movement.product_id, movement.from_location_id);
  if (availableStock < quantity) {
    throw new InventoryDomainError('insufficient_stock', `Insufficient stock (${availableStock})`, 422);
  }

  const allocations = movement.tracks_batches
    ? await allocateBatches(client, {
      productId: movement.product_id,
      locationId: movement.from_location_id,
      quantity,
      batchNumber: movement.batch_number,
    })
    : [];

  await subtractLocationStock(client, movement.product_id, movement.from_location_id, quantity);
  await decreaseAllocatedBatches(client, allocations);
  if (allocations.length) await saveAllocations(client, movement.id, allocations);
  await updateProductTotal(client, movement.product_id);
  const result = await client.query(
    "UPDATE movements SET status = 'confirmed' WHERE id = $1 RETURNING *",
    [movement.id]
  );
  const confirmed = result.rows[0];
  await enqueueInventoryMovementEvent(client, { companyId, movement: confirmed, allocations, correlationId: movement.correlationId || null });
  return { movement: confirmed, allocations };
}

async function getMovementForReversal(client, movementId, companyId) {
  const result = await client.query(
    `SELECT m.*, p.tracks_batches
     FROM movements m
     JOIN products p ON p.id = m.product_id
     WHERE m.id = $1 AND p.company_id = $2
     FOR UPDATE OF m, p`,
    [movementId, companyId]
  );
  if (!result.rows.length) {
    throw new InventoryDomainError('movement_not_found', 'Movement not found', 404);
  }
  return result.rows[0];
}

async function getMovementAllocations(client, movementId, movement) {
  const result = await client.query(
    `SELECT product_batch_id, quantity, batch_number, expiry_date
     FROM movement_batch_allocations
     WHERE movement_id = $1
     ORDER BY id`,
    [movementId]
  );
  if (result.rows.length || !movement.batch_number) return result.rows.map(row => ({
    productBatchId: row.product_batch_id,
    quantity: Number(row.quantity),
    batchNumber: row.batch_number,
    expiryDate: row.expiry_date,
  }));

  // Historical movements have no precise allocation record. Preserve their
  // legacy one-batch behaviour without inventing a FEFO history.
  return [{
    productBatchId: null,
    quantity: Number(movement.quantity),
    batchNumber: movement.batch_number,
    expiryDate: movement.expiry_date,
  }];
}

async function subtractLocationStock(client, productId, locationId, quantity) {
  const result = await client.query(
    `UPDATE product_stocks
     SET quantity = quantity - $3
     WHERE product_id = $1 AND location_id = $2 AND quantity >= $3`,
    [productId, locationId, quantity]
  );
  if (result.rowCount !== 1) {
    throw new InventoryDomainError('insufficient_stock', 'Current stock cannot reverse this movement', 422);
  }
}

async function subtractBatchAtLocation(client, productId, locationId, allocation) {
  const result = await client.query(
    `UPDATE product_batches
     SET quantity = quantity - $4
     WHERE product_id = $1 AND location_id = $2 AND batch_number = $3 AND quantity >= $4`,
    [productId, locationId, allocation.batchNumber, allocation.quantity]
  );
  if (result.rowCount !== 1) {
    throw new InventoryDomainError('insufficient_batch_stock', 'Current batch stock cannot reverse this movement', 422);
  }
}

async function deleteMovementAndReverseStock(client, { companyId, movementId }) {
  const id = parsePositiveInteger(movementId, 'movementId');
  const movement = await getMovementForReversal(client, id, companyId);
  const quantity = Number(movement.quantity);

  if (movement.status === 'pending') {
    await client.query('DELETE FROM movements WHERE id = $1', [id]);
    return;
  }

  const allocations = await getMovementAllocations(client, id, movement);
  if (movement.type === 'carico') {
    await subtractLocationStock(client, movement.product_id, movement.to_location_id, quantity);
    if (movement.batch_number) {
      await subtractBatchAtLocation(client, movement.product_id, movement.to_location_id, {
        batchNumber: movement.batch_number,
        quantity,
      });
    }
  } else if (movement.type === 'scarico') {
    await client.query(
      `INSERT INTO product_stocks (product_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = product_stocks.quantity + EXCLUDED.quantity`,
      [movement.product_id, movement.from_location_id, quantity]
    );
    for (const allocation of allocations) {
      await addBatchStock(client, companyId, movement.product_id, movement.from_location_id,
        allocation.batchNumber, allocation.expiryDate, allocation.quantity);
    }
  } else {
    await subtractLocationStock(client, movement.product_id, movement.to_location_id, quantity);
    await client.query(
      `INSERT INTO product_stocks (product_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = product_stocks.quantity + EXCLUDED.quantity`,
      [movement.product_id, movement.from_location_id, quantity]
    );
    for (const allocation of allocations) {
      await subtractBatchAtLocation(client, movement.product_id, movement.to_location_id, allocation);
      await addBatchStock(client, companyId, movement.product_id, movement.from_location_id,
        allocation.batchNumber, allocation.expiryDate, allocation.quantity);
    }
  }

  await updateProductTotal(client, movement.product_id);
  await client.query('DELETE FROM movements WHERE id = $1', [id]);
  await enqueueInventoryMovementEvent(client, {
    companyId,
    movement,
    allocations,
    type: 'inventory.movement.deleted',
  });
}

async function reassignUnassignedStock(client, { companyId, productId, destinationLocationId }) {
  const id = parsePositiveInteger(productId, 'productId');
  const locationId = parsePositiveInteger(destinationLocationId, 'destinationLocationId');
  const product = await lockProduct(client, id, companyId);
  await lockLocations(client, [locationId], companyId);

  if (product.tracks_batches) {
    throw new InventoryDomainError(
      'batch_reconciliation_required',
      'Products tracked by batch must be reconciled by batch and expiry date'
    );
  }

  const totals = await client.query(
    `SELECT p.quantity AS total_quantity, COALESCE(SUM(ps.quantity), 0) AS assigned_quantity
     FROM products p
     LEFT JOIN product_stocks ps ON ps.product_id = p.id
     WHERE p.id = $1
     GROUP BY p.quantity`,
    [id]
  );
  const unassigned = Number(totals.rows[0].total_quantity) - Number(totals.rows[0].assigned_quantity);
  if (Math.abs(unassigned) < 0.001) return { quantity: 0 };

  if (unassigned > 0) {
    await client.query(
      `INSERT INTO product_stocks (product_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = product_stocks.quantity + EXCLUDED.quantity`,
      [id, locationId, unassigned]
    );
  } else {
    let excess = -unassigned;
    const stocks = await client.query(
      `SELECT location_id, quantity
       FROM product_stocks
       WHERE product_id = $1
       ORDER BY (location_id = $2) DESC, quantity DESC
       FOR UPDATE`,
      [id, locationId]
    );
    for (const stock of stocks.rows) {
      if (excess <= 0) break;
      const removed = Math.min(excess, Number(stock.quantity));
      await subtractLocationStock(client, id, stock.location_id, removed);
      excess -= removed;
    }
  }

  await updateProductTotal(client, id);
  await enqueueIntegrationEvent(client, {
    companyId,
    type: 'inventory.balance.reconciled',
    data: {
      productId: String(id),
      destinationLocationId: String(locationId),
      reassignedQuantity: String(unassigned),
    },
  });
  return { quantity: unassigned };
}

/**
 * Applies a confirmed inventory movement using an already-open transaction.
 * This is the sole movement writer for new domain callers; routes are migrated
 * in the following PR to preserve their existing HTTP compatibility.
 */
async function recordConfirmedMovement(client, { companyId, ...rawCommand }) {
  const command = normalizeMovementCommand(rawCommand);
  const product = await lockProduct(client, command.productId, companyId);
  await lockLocations(client, [command.fromLocationId, command.toLocationId], companyId);

  if (product.tracks_batches && command.type === 'carico' && (!command.batchNumber || !command.expiryDate)) {
    throw new InventoryDomainError('batch_required', 'Batch number and expiry date are required for this product');
  }

  let allocations = [];
  if (command.type !== 'carico') {
    const availableStock = await lockLocationStock(client, command.productId, command.fromLocationId);
    if (availableStock < command.quantity) {
      throw new InventoryDomainError('insufficient_stock', `Insufficient stock (${availableStock})`, 422);
    }
    if (product.tracks_batches) {
      allocations = await allocateBatches(client, {
        productId: command.productId,
        locationId: command.fromLocationId,
        quantity: command.quantity,
        batchNumber: command.batchNumber,
      });
    }
  }

  const movement = await insertMovement(client, command, allocations);

  if (command.type === 'carico') {
    await client.query(
      `INSERT INTO product_stocks (product_id, location_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET quantity = product_stocks.quantity + EXCLUDED.quantity`,
      [command.productId, command.toLocationId, command.quantity]
    );
    if (product.tracks_batches || command.batchNumber) {
      await addBatchStock(client, companyId, command.productId, command.toLocationId, command.batchNumber, command.expiryDate, command.quantity);
    }
  } else {
    const stockUpdate = await client.query(
      `UPDATE product_stocks
       SET quantity = quantity - $3
       WHERE product_id = $1 AND location_id = $2 AND quantity >= $3`,
      [command.productId, command.fromLocationId, command.quantity]
    );
    if (stockUpdate.rowCount !== 1) {
      throw new InventoryDomainError('insufficient_stock', 'Stock changed while processing the movement', 422);
    }
    await decreaseAllocatedBatches(client, allocations);

    if (command.type === 'trasferimento') {
      await client.query(
        `INSERT INTO product_stocks (product_id, location_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, location_id)
         DO UPDATE SET quantity = product_stocks.quantity + EXCLUDED.quantity`,
        [command.productId, command.toLocationId, command.quantity]
      );
      for (const allocation of allocations) {
        await addBatchStock(
          client, companyId, command.productId, command.toLocationId,
          allocation.batchNumber, allocation.expiryDate, allocation.quantity
        );
      }
    }
    if (allocations.length) await saveAllocations(client, movement.id, allocations);
  }

  await updateProductTotal(client, command.productId, command.toLocationId);
  await enqueueInventoryMovementEvent(client, { companyId, movement, allocations, correlationId: command.correlationId || null });
  return { movement, allocations };
}

async function runInInventoryTransaction(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  InventoryDomainError,
  normalizeMovementCommand,
  recordConfirmedMovement,
  recordPendingJobConsumption,
  confirmPendingJobConsumption,
  deleteMovementAndReverseStock,
  reassignUnassignedStock,
  runInInventoryTransaction,
};
