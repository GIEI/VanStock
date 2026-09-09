const assert = require('node:assert/strict');
const test = require('node:test');
const {
  attendanceEventData,
  enqueueAttendanceEvent,
  enqueueInventoryMovementEvent,
} = require('../src/services/integration-outbox-service');

test('inventory events are stored as a versioned canonical envelope', async () => {
  const queries = [];
  const client = { query: async (sql, params) => queries.push({ sql, params }) };

  const event = await enqueueInventoryMovementEvent(client, {
    companyId: 3,
    movement: {
      id: 9, product_id: 4, type: 'scarico', quantity: '1.25',
      from_location_id: 2, to_location_id: null, job_id: null,
      batch_number: 'LOT-1', expiry_date: '2027-01-01',
      created_at: '2026-09-02T10:00:00.000Z',
    },
    allocations: [{ batchNumber: 'LOT-1', expiryDate: '2027-01-01', quantity: 1.25 }],
  });

  assert.match(event.eventId, /^[0-9a-f-]{36}$/i);
  assert.equal(event.schemaVersion, '1.0');
  assert.equal(event.type, 'inventory.movement.confirmed');
  assert.deepEqual(event.data, {
    movementId: '9', productId: '4', type: 'scarico', quantity: '1.25',
    fromLocationId: '2', toLocationId: null, jobId: null,
    batchNumber: 'LOT-1', expiryDate: '2027-01-01',
    batchAllocations: [{ batchNumber: 'LOT-1', expiryDate: '2027-01-01', quantity: '1.25' }],
  });
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /INSERT INTO integration_outbox_events/);
  assert.equal(JSON.parse(queries[0].params[4]).eventId, event.eventId);
});

test('attendance events are stored as a versioned canonical envelope', async () => {
  const queries = [];
  const client = { query: async (sql, params) => queries.push({ sql, params }) };

  const event = await enqueueAttendanceEvent(client, {
    companyId: 3,
    event: {
      id: 12,
      user_id: 7,
      detected_action: 'CHECK_OUT',
      occurred_at: '2026-09-05T16:30:00.000Z',
      previous_state: 'IN',
      resulting_state: 'OUT',
      request_id: 'request-12',
      source: 'admin',
      status: 'valid',
      anomaly_type: null,
    },
    type: 'attendance.event.superseded',
    supersededEventId: 11,
    overrideRequestId: 4,
  });

  assert.equal(event.schemaVersion, '1.0');
  assert.equal(event.type, 'attendance.event.superseded');
  assert.equal(event.correlationId, 'request-12');
  assert.deepEqual(event.data, {
    attendanceEventId: '12',
    userId: '7',
    action: 'CHECK_OUT',
    occurredAt: '2026-09-05T16:30:00.000Z',
    previousState: 'IN',
    resultingState: 'OUT',
    requestId: 'request-12',
    source: 'admin',
    status: 'valid',
    anomalyType: null,
    supersededEventId: '11',
    overrideRequestId: '4',
  });
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /INSERT INTO integration_outbox_events/);
  assert.equal(JSON.parse(queries[0].params[4]).type, 'attendance.event.superseded');
});

test('attendance event data normalizes timestamps and identifiers for integrations', () => {
  const data = attendanceEventData({
    id: 12,
    user_id: 7,
    detected_action: 'CHECK_IN',
    occurred_at: '2026-09-05T18:30:00+02:00',
    previous_state: 'OUT',
    resulting_state: 'IN',
    request_id: 'request-12',
    source: 'mobile',
    status: 'valid',
    anomaly_type: null,
  }, {
    supersededEventId: 11,
    overrideRequestId: 4,
  });

  assert.equal(data.occurredAt, '2026-09-05T16:30:00.000Z');
  assert.equal(new Date(data.occurredAt).toISOString(), data.occurredAt);
  assert.equal(data.attendanceEventId, '12');
  assert.equal(data.userId, '7');
  assert.equal(data.supersededEventId, '11');
  assert.equal(data.overrideRequestId, '4');
});

test('attendance outbox supports the created, superseded and invalidated event types', async () => {
  const cases = [
    { type: undefined, expectedType: 'attendance.event.created' },
    { type: 'attendance.event.superseded', expectedType: 'attendance.event.superseded' },
    { type: 'attendance.event.invalidated', expectedType: 'attendance.event.invalidated' },
  ];

  for (const { type, expectedType } of cases) {
    const queries = [];
    const client = { query: async (sql, params) => queries.push({ sql, params }) };
    const options = {
      companyId: 3,
      event: {
        id: 12,
        user_id: 7,
        detected_action: 'CHECK_IN',
        occurred_at: '2026-09-05T18:30:00+02:00',
        previous_state: 'OUT',
        resulting_state: 'IN',
        request_id: 'request-12',
        source: 'mobile',
        status: 'valid',
        anomaly_type: null,
      },
    };
    if (type) options.type = type;

    const event = await enqueueAttendanceEvent(client, options);

    assert.equal(event.schemaVersion, '1.0');
    assert.equal(event.type, expectedType);
    assert.equal(event.occurredAt, '2026-09-05T16:30:00.000Z');
    assert.equal(new Date(event.occurredAt).toISOString(), event.occurredAt);
    assert.equal(event.data.attendanceEventId, '12');
    assert.equal(event.data.userId, '7');
    assert.equal(queries.length, 1);
    assert.equal(queries[0].params[2], expectedType);
    assert.equal(queries[0].params[3], '1.0');
    assert.equal(queries[0].params[5], event.occurredAt);
    assert.deepEqual(JSON.parse(queries[0].params[4]), event);
  }
});
