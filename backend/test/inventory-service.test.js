const assert = require('node:assert/strict');
const test = require('node:test');
const {
  InventoryDomainError,
  deleteMovementAndReverseStock,
  confirmPendingJobConsumption,
  normalizeMovementCommand,
  recordConfirmedMovement,
} = require('../src/services/inventory-service');

test('inventory movement commands enforce the location shape before opening a transaction', () => {
  assert.throws(
    () => normalizeMovementCommand({ productId: 1, type: 'carico', quantity: 1 }),
    error => error instanceof InventoryDomainError && error.code === 'invalid_movement'
  );
  assert.throws(
    () => normalizeMovementCommand({ productId: 1, type: 'trasferimento', quantity: 1, fromLocationId: 2, toLocationId: 2 }),
    error => error instanceof InventoryDomainError && error.code === 'invalid_movement'
  );
});

test('inventory movement commands normalize decimal quantities and optional batch data', () => {
  const command = normalizeMovementCommand({
    productId: '4',
    type: 'scarico',
    quantity: '1.25',
    fromLocationId: '9',
    batchNumber: ' LOT-10 ',
    expiryDate: '2027-01-01',
  });

  assert.equal(command.productId, 4);
  assert.equal(command.quantity, 1.25);
  assert.equal(command.batchNumber, 'LOT-10');
  assert.equal(command.expiryDate, '2027-01-01');
});

test('tracked withdrawals persist the exact FEFO allocations', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('FROM products')) return { rows: [{ id: 4, tracks_batches: true }] };
      if (sql.includes('FROM locations')) return { rows: [{ id: 9 }] };
      if (sql.includes('FROM product_stocks')) return { rows: [{ quantity: '5.00' }] };
      if (sql.includes('FROM product_batches')) {
        return {
          rows: [
            { id: 20, quantity: '1.50', batch_number: 'LOT-A', expiry_date: '2027-01-01' },
            { id: 21, quantity: '3.50', batch_number: 'LOT-B', expiry_date: '2027-02-01' },
          ],
        };
      }
      if (sql.includes('INSERT INTO movements')) return { rows: [{ id: 55, type: 'scarico' }] };
      return { rows: [], rowCount: 1 };
    },
  };

  const result = await recordConfirmedMovement(client, {
    companyId: 1,
    productId: 4,
    type: 'scarico',
    quantity: 2,
    fromLocationId: 9,
    createdBy: 'Tester',
  });

  assert.deepEqual(result.allocations.map(a => [a.batchNumber, a.quantity]), [
    ['LOT-A', 1.5],
    ['LOT-B', 0.5],
  ]);
  const allocationWrites = queries.filter(query => query.sql.includes('INSERT INTO movement_batch_allocations'));
  assert.equal(allocationWrites.length, 2);
  assert.deepEqual(allocationWrites.map(query => query.params.slice(0, 3)), [
    [55, 20, 1.5],
    [55, 21, 0.5],
  ]);
  assert.ok(queries.some(query => query.sql.includes('INSERT INTO integration_outbox_events')));
});

test('transfer deletion restores every persisted lot allocation', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('SELECT m.*, p.tracks_batches')) {
        return {
          rows: [{
            id: 55, product_id: 4, type: 'trasferimento', quantity: '2.00',
            from_location_id: 9, to_location_id: 10, tracks_batches: true,
            batch_number: 'LOT-A', expiry_date: '2027-01-01', status: 'confirmed',
          }],
        };
      }
      if (sql.includes('FROM movement_batch_allocations')) {
        return {
          rows: [
            { product_batch_id: 20, quantity: '1.50', batch_number: 'LOT-A', expiry_date: '2027-01-01' },
            { product_batch_id: 21, quantity: '0.50', batch_number: 'LOT-B', expiry_date: '2027-02-01' },
          ],
        };
      }
      if (sql.includes('INSERT INTO product_batches')) return { rows: [{ id: 1 }] };
      return { rows: [], rowCount: 1 };
    },
  };

  await deleteMovementAndReverseStock(client, { companyId: 1, movementId: 55 });

  const destinationBatchDecrements = queries.filter(query =>
    query.sql.includes('UPDATE product_batches') && query.params[1] === 10
  );
  const sourceBatchRestores = queries.filter(query =>
    query.sql.includes('INSERT INTO product_batches') && query.params[2] === 9
  );
  assert.equal(destinationBatchDecrements.length, 2);
  assert.deepEqual(destinationBatchDecrements.map(query => query.params.slice(2)), [
    ['LOT-A', 1.5],
    ['LOT-B', 0.5],
  ]);
  assert.equal(sourceBatchRestores.length, 2);
});

test('pending job consumption is confirmed through the same lot allocation flow', async () => {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('SELECT m.*, p.tracks_batches')) {
        return { rows: [{
          id: 72, product_id: 4, type: 'scarico', quantity: '2.00',
          from_location_id: 9, job_id: 12, status: 'pending',
          tracks_batches: true, batch_number: null,
        }] };
      }
      if (sql.includes('FROM locations')) return { rows: [{ id: 9 }] };
      if (sql.includes('FROM product_stocks')) return { rows: [{ quantity: '3.00' }] };
      if (sql.includes('FROM product_batches')) {
        return { rows: [{ id: 20, quantity: '3.00', batch_number: 'LOT-A', expiry_date: '2027-01-01' }] };
      }
      if (sql.includes("UPDATE movements SET status = 'confirmed'")) return { rows: [{ id: 72, status: 'confirmed' }] };
      return { rows: [], rowCount: 1 };
    },
  };

  const result = await confirmPendingJobConsumption(client, { companyId: 1, movementId: 72 });

  assert.equal(result.movement.status, 'confirmed');
  assert.deepEqual(result.allocations.map(a => [a.batchNumber, a.quantity]), [['LOT-A', 2]]);
  assert.ok(queries.some(query => query.sql.includes('INSERT INTO movement_batch_allocations')));
});
