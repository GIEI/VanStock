const { v4: uuidv4 } = require('uuid');

function asString(value) {
  return value == null ? null : String(value);
}

function movementData(movement, allocations = []) {
  return {
    movementId: asString(movement.id),
    productId: asString(movement.product_id),
    type: movement.type,
    quantity: String(movement.quantity),
    fromLocationId: asString(movement.from_location_id),
    toLocationId: asString(movement.to_location_id),
    jobId: asString(movement.job_id),
    batchNumber: movement.batch_number || null,
    expiryDate: movement.expiry_date || null,
    batchAllocations: allocations.map(allocation => ({
      batchNumber: allocation.batchNumber,
      expiryDate: allocation.expiryDate || null,
      quantity: String(allocation.quantity),
    })),
  };
}

function attendanceEventData(event, { supersededEventId = null, overrideRequestId = null } = {}) {
  return {
    attendanceEventId: asString(event.id),
    userId: asString(event.user_id),
    action: event.detected_action,
    occurredAt: new Date(event.occurred_at).toISOString(),
    previousState: event.previous_state,
    resultingState: event.resulting_state,
    requestId: event.request_id,
    source: event.source,
    status: event.status,
    anomalyType: event.anomaly_type || null,
    supersededEventId: asString(supersededEventId),
    overrideRequestId: asString(overrideRequestId),
  };
}

async function enqueueIntegrationEvent(client, { companyId, type, occurredAt, data, correlationId = null }) {
  const occurredOn = occurredAt ? new Date(occurredAt) : new Date();
  if (Number.isNaN(occurredOn.getTime())) throw new Error('Integration event has an invalid occurredAt value');
  const event = {
    eventId: uuidv4(),
    schemaVersion: '1.0',
    type,
    occurredAt: occurredOn.toISOString(),
    origin: 'vanstock',
    correlationId,
    data,
  };

  await client.query(
    `INSERT INTO integration_outbox_events
       (event_id, company_id, event_type, schema_version, payload, occurred_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [event.eventId, companyId, event.type, event.schemaVersion, JSON.stringify(event), event.occurredAt]
  );
  return event;
}

function enqueueInventoryMovementEvent(client, { companyId, movement, allocations, type = 'inventory.movement.confirmed', correlationId = null }) {
  return enqueueIntegrationEvent(client, {
    companyId,
    type,
    occurredAt: movement.created_at,
    data: movementData(movement, allocations),
    correlationId,
  });
}

function enqueueAttendanceEvent(client, {
  companyId,
  event,
  type = 'attendance.event.created',
  correlationId = null,
  supersededEventId = null,
  overrideRequestId = null,
}) {
  return enqueueIntegrationEvent(client, {
    companyId,
    type,
    occurredAt: event.occurred_at,
    data: attendanceEventData(event, { supersededEventId, overrideRequestId }),
    correlationId: correlationId || event.request_id || null,
  });
}

module.exports = {
  attendanceEventData,
  enqueueAttendanceEvent,
  enqueueIntegrationEvent,
  enqueueInventoryMovementEvent,
};
