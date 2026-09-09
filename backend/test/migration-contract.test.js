const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '../..');
const migrationPath = path.join(root, 'db/migrate_v39_movement_batch_allocations.sql');

test('v39 persists immutable lot allocations for each movement', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS movement_batch_allocations/);
  assert.match(migration, /movement_id\s+INTEGER NOT NULL REFERENCES movements\(id\) ON DELETE CASCADE/);
  assert.match(migration, /product_batch_id\s+INTEGER NOT NULL REFERENCES product_batches\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /quantity\s+NUMERIC\(10,2\) NOT NULL CHECK \(quantity > 0\)/);
  assert.match(migration, /UNIQUE \(movement_id, product_batch_id\)/);
});

test('v39 is included in both server and local migration paths', () => {
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(serverBootstrap, /migrate_v39_movement_batch_allocations\.sql/);
  assert.match(localRunner, /run db\/migrate_v39_movement_batch_allocations\.sql/);
});

test('v40 persists durable integration events in the transaction outbox', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v40_integration_outbox.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS integration_outbox_events/);
  assert.match(migration, /event_id\s+UUID PRIMARY KEY/);
  assert.match(migration, /payload\s+JSONB NOT NULL/);
  assert.match(migration, /WHERE published_at IS NULL/);
  assert.match(serverBootstrap, /migrate_v40_integration_outbox\.sql/);
  assert.match(localRunner, /run db\/migrate_v40_integration_outbox\.sql/);
});

test('v41 stores only hashed, tenant-scoped integration keys', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v41_integration_api_keys.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS integration_api_keys/);
  assert.match(migration, /secret_hash TEXT NOT NULL UNIQUE/);
  assert.match(migration, /scopes\s+TEXT\[\] NOT NULL/);
  assert.match(migration, /revoked_at/);
  assert.match(serverBootstrap, /migrate_v41_integration_api_keys\.sql/);
  assert.match(localRunner, /run db\/migrate_v41_integration_api_keys\.sql/);
});

test('v42 persists idempotent inbound integration commands', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v42_integration_inbox.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS integration_inbox_commands/);
  assert.match(migration, /CONSTRAINT uq_integration_inbox_idempotency UNIQUE \(company_id, idempotency_key\)/);
  assert.match(migration, /status IN \('pending', 'processing', 'completed', 'failed', 'dead_letter', 'needs_mapping'\)/);
  assert.match(serverBootstrap, /migrate_v42_integration_inbox\.sql/);
  assert.match(localRunner, /run db\/migrate_v42_integration_inbox\.sql/);
});

test('v43 adds a recoverable lease for inbox processing', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v43_integration_inbox_worker.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /processing_started_at/);
  assert.match(migration, /attempt_count INTEGER NOT NULL DEFAULT 0/);
  assert.match(serverBootstrap, /migrate_v43_integration_inbox_worker\.sql/);
  assert.match(localRunner, /run db\/migrate_v43_integration_inbox_worker\.sql/);
});

test('v44 stores webhook subscriptions and retryable deliveries separately', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v44_integration_webhooks.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS integration_webhook_subscriptions/);
  assert.match(migration, /secret_ciphertext TEXT NOT NULL/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS integration_webhook_deliveries/);
  assert.match(migration, /UNIQUE \(event_id, subscription_id\)/);
  assert.match(serverBootstrap, /migrate_v44_integration_webhooks\.sql/);
  assert.match(localRunner, /run db\/migrate_v44_integration_webhooks\.sql/);
});

test('v45 persists explicit external-to-internal entity mappings', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v45_integration_entity_mappings.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS integration_entity_mappings/);
  assert.match(migration, /entity_type IN \('product', 'location'\)/);
  assert.match(migration, /integration_key_id UUID NOT NULL REFERENCES integration_api_keys/);
  assert.match(migration, /UNIQUE \(integration_key_id, entity_type, external_id\)/);
  assert.match(serverBootstrap, /migrate_v45_integration_entity_mappings\.sql/);
  assert.match(localRunner, /run db\/migrate_v45_integration_entity_mappings\.sql/);
});

test('v46 links every legacy free-text category without overwriting existing links', () => {
  const migration = fs.readFileSync(path.join(root, 'db/migrate_v46_product_category_references.sql'), 'utf8');
  const serverBootstrap = fs.readFileSync(path.join(root, 'backend/src/index.js'), 'utf8');
  const localRunner = fs.readFileSync(path.join(root, 'db/migrate_local.sh'), 'utf8');

  assert.match(migration, /INSERT INTO product_categories/);
  assert.match(migration, /TRIM\(category\)/);
  assert.match(migration, /product\.category_id IS NULL/);
  assert.match(serverBootstrap, /migrate_v46_product_category_references\.sql/);
  assert.match(localRunner, /run db\/migrate_v46_product_category_references\.sql/);
});
