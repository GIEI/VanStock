const db = require('../db');

const SEAT_CONSUMING_STATUSES = ['ACTIVE', 'INVITED'];

/**
 * Checks whether a new seat can be consumed for a company.
 *
 * MUST be called inside an open transaction on `client`. The subscription row
 * is locked with FOR UPDATE so concurrent requests serialize and the seat
 * count cannot be exceeded by races.
 *
 * Returns: { ok: boolean, reason?: string, code?: string, used?: number, max?: number }
 */
async function checkSeatAvailability(client, companyId) {
  const sub = await client.query(
    `SELECT plan_type, max_seats, expires_at, status
     FROM subscriptions
     WHERE company_id = $1
     FOR UPDATE`,
    [companyId]
  );

  if (!sub.rows.length) {
    return { ok: false, code: 'NO_SUBSCRIPTION', reason: 'Nessuna licenza associata alla company.' };
  }
  const s = sub.rows[0];

  if (s.status !== 'ACTIVE') {
    return { ok: false, code: 'SUBSCRIPTION_INACTIVE', reason: `Abbonamento ${s.status}.` };
  }
  if (s.expires_at && new Date(s.expires_at) < new Date()) {
    return { ok: false, code: 'SUBSCRIPTION_EXPIRED', reason: 'Abbonamento scaduto.' };
  }

  const used = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM users
     WHERE company_id = $1 AND status = ANY($2::text[])`,
    [companyId, SEAT_CONSUMING_STATUSES]
  );
  const usedCount = used.rows[0].n;

  if (usedCount >= s.max_seats) {
    return {
      ok: false,
      code: 'LICENSE_LIMIT_EXCEEDED',
      reason: `Limite di licenze raggiunto (${usedCount}/${s.max_seats}).`,
      used: usedCount,
      max: s.max_seats,
    };
  }

  return { ok: true, used: usedCount, max: s.max_seats };
}

/**
 * Read-only seat usage summary for UI consumption. No locks, no transaction.
 */
async function getSeatUsage(companyId) {
  const sub = await db.query(
    `SELECT plan_type, max_seats, expires_at, status
     FROM subscriptions
     WHERE company_id = $1`,
    [companyId]
  );
  if (!sub.rows.length) return null;

  const used = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM users
     WHERE company_id = $1 AND status = ANY($2::text[])`,
    [companyId, SEAT_CONSUMING_STATUSES]
  );

  return {
    plan_type:  sub.rows[0].plan_type,
    max_seats:  sub.rows[0].max_seats,
    expires_at: sub.rows[0].expires_at,
    status:     sub.rows[0].status,
    used_seats: used.rows[0].n,
  };
}

module.exports = {
  checkSeatAvailability,
  getSeatUsage,
  SEAT_CONSUMING_STATUSES,
};
