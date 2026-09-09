const assert = require('node:assert/strict');
const test = require('node:test');
const {
  decryptSecret,
  encryptSecret,
  signWebhookPayload,
  validateEndpointUrl,
} = require('../src/services/integration-webhook-service');
const { sendWebhook } = require('../src/services/integration-webhook-worker');

process.env.INTEGRATION_WEBHOOK_SECRET_KEY ??= 'test-webhook-secret-key';

test('webhook secrets are encrypted at rest and payloads are signed', () => {
  const ciphertext = encryptSecret('shared-secret');
  assert.notEqual(ciphertext, 'shared-secret');
  assert.equal(decryptSecret(ciphertext), 'shared-secret');
  assert.equal(signWebhookPayload('{"eventId":"1"}', 'shared-secret'), 'sha256=a8604131251d6106a82d93cca7236b452c3b9a51388bf6cc86afbd743182cfe3');
});

test('webhook URLs reject local and insecure destinations', () => {
  assert.equal(validateEndpointUrl('https://erp.example.com/events'), 'https://erp.example.com/events');
  assert.throws(() => validateEndpointUrl('http://erp.example.com/events'), /HTTPS/);
  assert.throws(() => validateEndpointUrl('https://127.0.0.1/events'), /private/);
});

test('webhook delivery posts the canonical event with its HMAC signature', async () => {
  const secretCiphertext = encryptSecret('shared-secret');
  let request;
  await sendWebhook({
    endpoint_url: 'https://erp.example.com/events', secret_ciphertext: secretCiphertext,
    payload: { eventId: 'event-1', type: 'inventory.movement.confirmed' },
  }, async (url, options) => {
    request = { url, options };
    return { ok: true };
  });
  assert.equal(request.url, 'https://erp.example.com/events');
  assert.equal(request.options.headers['x-vanstock-event-id'], 'event-1');
  assert.equal(request.options.headers['x-vanstock-signature'], signWebhookPayload(request.options.body, 'shared-secret'));
});
