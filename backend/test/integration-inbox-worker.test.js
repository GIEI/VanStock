const assert = require('node:assert/strict');
const test = require('node:test');
const { movementForCommand, resolveMovementReferences } = require('../src/services/integration-inbox-worker');

function command(commandType, data) {
  return {
    command_id: '1a111111-1111-4111-8111-111111111111',
    command_type: commandType,
    payload: { correlationId: '2a222222-2222-4222-8222-222222222222', data },
  };
}

test('inbox worker maps ERP inventory commands to domain movements', () => {
  assert.deepEqual(
    movementForCommand(command('inventory.receipt', { productId: '4', locationId: '9', quantity: '2' })),
    {
      productId: '4', quantity: '2', batchNumber: undefined, expiryDate: undefined,
      purchasePrice: undefined, unitCostSnapshot: undefined, notes: 'ERP command 1a111111-1111-4111-8111-111111111111',
      createdBy: 'ERP integration', correlationId: '2a222222-2222-4222-8222-222222222222',
      type: 'carico', toLocationId: '9',
    }
  );
  const adjustment = movementForCommand(command('inventory.adjustment', { productId: 4, locationId: 9, quantity: '-1.5' }));
  assert.equal(adjustment.type, 'scarico');
  assert.equal(adjustment.quantity, 1.5);
  assert.equal(adjustment.fromLocationId, 9);
});

test('catalog and location commands wait for a dedicated mapping policy', () => {
  assert.throws(
    () => movementForCommand(command('catalog.item.upsert', {})),
    error => error.code === 'needs_mapping' && error.status === 422
  );
});

test('worker resolves ERP identifiers through tenant mappings before moving stock', async () => {
  const references = [];
  const client = {
    async query(_sql, params) {
      references.push(params);
      return { rows: [{ internal_id: params[2] === 'product' ? 4 : 9 }] };
    },
  };
  const resolved = await resolveMovementReferences(client, 2, '2a222222-2222-4222-8222-222222222222', movementForCommand(command('inventory.receipt', {
    productId: 'ERP-SKU-1', locationId: 'CENTRALE', quantity: '2',
  })));
  assert.equal(resolved.productId, 4);
  assert.equal(resolved.toLocationId, 9);
  assert.deepEqual(references, [
    [2, '2a222222-2222-4222-8222-222222222222', 'product', 'ERP-SKU-1'],
    [2, '2a222222-2222-4222-8222-222222222222', 'location', 'CENTRALE'],
  ]);
});
