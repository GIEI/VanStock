const db = require('../db');
const { processNextIntegrationCommand } = require('../services/integration-inbox-worker');

async function run() {
  let processed = 0;
  while (await processNextIntegrationCommand(db.pool)) processed += 1;
  console.log(`[integration-inbox] processed ${processed} command(s)`);
}

run().catch(error => {
  console.error('[integration-inbox] failed:', error);
  process.exitCode = 1;
});
