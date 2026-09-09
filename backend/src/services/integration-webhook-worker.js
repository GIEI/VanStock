const { decryptSecret, signWebhookPayload } = require('./integration-webhook-service');

async function claimNextWebhookDelivery(client) {
  await client.query(
    `INSERT INTO integration_webhook_deliveries (event_id, subscription_id)
     SELECT event.event_id, subscription.id
     FROM integration_outbox_events event
     JOIN integration_webhook_subscriptions subscription
       ON subscription.company_id = event.company_id
      AND subscription.active = TRUE
      AND event.created_at >= subscription.created_at
      AND (cardinality(subscription.event_types) = 0 OR event.event_type = ANY(subscription.event_types))
     ON CONFLICT (event_id, subscription_id) DO NOTHING`
  );
  const result = await client.query(
    `WITH candidate AS (
       SELECT delivery.id
       FROM integration_webhook_deliveries delivery
       WHERE delivery.status = 'pending' AND delivery.next_attempt_at <= NOW()
       ORDER BY delivery.next_attempt_at ASC, delivery.id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE integration_webhook_deliveries delivery
     SET status = 'processing', attempt_count = attempt_count + 1, updated_at = NOW()
     FROM candidate
     WHERE delivery.id = candidate.id
     RETURNING delivery.id, delivery.attempt_count,
       (SELECT payload FROM integration_outbox_events WHERE event_id = delivery.event_id) AS payload,
       (SELECT endpoint_url FROM integration_webhook_subscriptions WHERE id = delivery.subscription_id) AS endpoint_url,
       (SELECT secret_ciphertext FROM integration_webhook_subscriptions WHERE id = delivery.subscription_id) AS secret_ciphertext`
  );
  return result.rows[0] || null;
}

async function sendWebhook(delivery, fetchImpl = fetch) {
  const payload = JSON.stringify(delivery.payload);
  const response = await fetchImpl(delivery.endpoint_url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vanstock-signature': signWebhookPayload(payload, decryptSecret(delivery.secret_ciphertext)),
      'x-vanstock-event-id': delivery.payload.eventId,
    },
    body: payload,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
}

async function finishWebhookDelivery(client, delivery, error = null) {
  if (!error) {
    await client.query(
      `UPDATE integration_webhook_deliveries
       SET status = 'delivered', delivered_at = NOW(), last_error = NULL, updated_at = NOW()
       WHERE id = $1`,
      [delivery.id]
    );
    return { status: 'delivered', deliveryId: delivery.id };
  }
  await client.query(
    `UPDATE integration_webhook_deliveries
     SET status = CASE WHEN attempt_count >= 10 THEN 'dead_letter' ELSE 'pending' END,
         next_attempt_at = NOW() + make_interval(secs => LEAST(3600, (2 ^ LEAST(attempt_count, 11))::int)),
         last_error = $2, updated_at = NOW()
     WHERE id = $1`,
    [delivery.id, error.message.slice(0, 1000)]
  );
  return { status: delivery.attempt_count >= 10 ? 'dead_letter' : 'pending', deliveryId: delivery.id };
}

async function dispatchNextWebhook(pool, fetchImpl = fetch) {
  const claimClient = await pool.connect();
  let delivery;
  try {
    await claimClient.query('BEGIN');
    delivery = await claimNextWebhookDelivery(claimClient);
    await claimClient.query('COMMIT');
  } catch (error) {
    await claimClient.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { claimClient.release(); }
  if (!delivery) return null;

  let error = null;
  try { await sendWebhook(delivery, fetchImpl); } catch (caught) { error = caught; }

  const finishClient = await pool.connect();
  try {
    await finishClient.query('BEGIN');
    const result = await finishWebhookDelivery(finishClient, delivery, error);
    await finishClient.query('COMMIT');
    return result;
  } catch (caught) {
    await finishClient.query('ROLLBACK').catch(() => {});
    throw caught;
  } finally { finishClient.release(); }
}

module.exports = { claimNextWebhookDelivery, dispatchNextWebhook, finishWebhookDelivery, sendWebhook };
