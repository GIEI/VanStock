const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sourceRoot = path.join(__dirname, '../src');

test('attendance scan persists the event and outbox entry in one transaction', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'routes/attendance-v2.js'), 'utf8');

  assert.match(source, /client = await db\.pool\.connect\(\)/);
  assert.match(source, /await client\.query\('BEGIN'\)/);
  assert.match(source, /await enqueueAttendanceEvent\(client/);
  assert.match(source, /await client\.query\('COMMIT'\)/);
  assert.match(source, /await client\.query\('ROLLBACK'\)/);
});

test('admin attendance mutations publish canonical lifecycle events', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'routes/admin-attendance.js'), 'utf8');

  assert.equal((source.match(/await enqueueAttendanceEvent\(client/g) || []).length, 4);
  assert.match(source, /type: 'attendance\.event\.superseded'/);
  assert.match(source, /supersededEventId: oldEvent\.id/);
  assert.match(source, /type: 'attendance\.event\.invalidated'/);
  assert.match(source, /overrideRequestId: request\.id/);
});
