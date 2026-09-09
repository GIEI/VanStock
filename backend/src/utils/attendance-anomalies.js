// Attendance Anomalies — scheduled scanner that flags days that were never closed.
// Runs daily at 00:05 (Europe/Rome) via setInterval (simple in-app scheduler).
const db = require('../db');
const sm = require('./attendance-state-machine');
const { notifyRoles } = require('../notification-helper');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly check
const MAX_OPEN_HOURS = 18; // if user is IN/BREAK for > 18h, flag the day

/**
 * Find users whose latest event is IN or BREAK and occurred more than MAX_OPEN_HOURS ago.
 * For each, insert a synthetic event with resulting_state=PENDING_REVIEW and anomaly_type=DAY_NEVER_CLOSED.
 */
async function flagOpenDays() {
  try {
    const { rows: openUsers } = await db.query(
      `SELECT DISTINCT ON (ae.user_id)
         ae.id, ae.user_id, ae.company_id, ae.occurred_at, ae.resulting_state, u.name AS user_name
       FROM attendance_events ae
       JOIN users u ON u.id = ae.user_id
       JOIN feature_resource_bindings frb
         ON frb.resource_key = 'JOB_ATTENDANCE_ANOMALIES'
       JOIN company_features cf
         ON cf.company_id = ae.company_id
        AND cf.feature_key = frb.feature_key
        AND cf.enabled = TRUE
       JOIN features f
         ON f.feature_key = cf.feature_key
        AND f.is_active = TRUE
       WHERE ae.status = 'valid'
       ORDER BY ae.user_id, ae.occurred_at DESC`
    );

    const cutoff = new Date(Date.now() - MAX_OPEN_HOURS * 60 * 60 * 1000);
    let flagged = 0;

    for (const u of openUsers) {
      if (!['IN', 'BREAK'].includes(u.resulting_state)) continue;
      if (new Date(u.occurred_at) > cutoff) continue;

      // Check if we already flagged this user's open day (avoid spamming)
      const { rows: existingFlag } = await db.query(
        `SELECT id FROM attendance_events
         WHERE user_id = $1 AND anomaly_type = $2
           AND occurred_at > $3`,
        [u.user_id, sm.ANOMALY_TYPES.DAY_NEVER_CLOSED, u.occurred_at]
      );
      if (existingFlag.length > 0) continue;

      const requestId = `anomaly-day-never-closed-${u.user_id}-${Date.now()}`;
      await db.query(
        `INSERT INTO attendance_events
         (company_id, user_id, occurred_at, detected_action, resulting_state, previous_state,
          request_id, source, anomaly_type, notes)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'admin', $7, $8)`,
        [
          u.company_id,
          u.user_id,
          'CHECK_OUT', // synthetic: assume forced exit
          sm.STATES.PENDING_REVIEW,
          u.resulting_state,
          requestId,
          sm.ANOMALY_TYPES.DAY_NEVER_CLOSED,
          'Auto-flagged: giornata non chiusa entro 18h dall\'ultimo evento.',
        ]
      );
      flagged++;

      notifyRoles(u.company_id, ['admin', 'superadmin'], {
        type:  'attendance_anomaly',
        title: 'Anomalia presenze',
        body:  `${u.user_name}: giornata non chiusa`,
        url:   '/attendance',
        data:  { userId: u.user_id },
      });
    }

    if (flagged > 0) {
      console.log(`[attendance-anomalies] Flagged ${flagged} unclosed days as PENDING_REVIEW.`);
    }
  } catch (err) {
    console.error('[attendance-anomalies] Error:', err);
  }
}

let intervalHandle = null;

function start() {
  if (intervalHandle) return;
  // Run once on startup, then every hour
  flagOpenDays();
  intervalHandle = setInterval(flagOpenDays, CHECK_INTERVAL_MS);
  console.log('[attendance-anomalies] Scheduler started (hourly check for unclosed days).');
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { start, stop, flagOpenDays };
