const db = require('../db');
const { dispatchNextWebhook } = require('../services/integration-webhook-worker');

async function run() {
  let dispatched = 0;
  while (await dispatchNextWebhook(db.pool)) dispatched += 1;
  console.log(`[integration-webhooks] dispatched ${dispatched} delivery attempt(s)`);
}

run().catch(error => {
  console.error('[integration-webhooks] failed:', error);
  process.exitCode = 1;
});
