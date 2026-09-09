// Attendance v2 — User-facing routes (event sourcing + state machine)
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');
const sm = require('../utils/attendance-state-machine');
const { notifyRoles } = require('../notification-helper');
const { enqueueAttendanceEvent } = require('../services/integration-outbox-service');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_ATTENDANCE_V2'));

const JWT_SECRET = process.env.JWT_SECRET;
const DEBOUNCE_SECONDS = 10;

// Get the user's current state by looking at the latest valid event.
// An open shift (IN/BREAK) left over from a previous day resets to OUT at
// midnight (Europe/Rome) so the user can check in again; the missed checkout
// is fixed later via an override request, not by blocking the new day.
async function getCurrentState(userId) {
  const { rows } = await db.query(
    `SELECT *,
       (occurred_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date AS is_today
     FROM attendance_events
     WHERE user_id = $1 AND status = 'valid'
     ORDER BY occurred_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );
  const lastEvent = rows[0] || null;
  let state = lastEvent?.resulting_state || sm.STATES.OUT;
  if (lastEvent && !lastEvent.is_today && [sm.STATES.IN, sm.STATES.BREAK].includes(state)) {
    state = sm.STATES.OUT;
  }
  return { state, lastEvent };
}

// Get company work shifts (or null if not configured).
async function getCompanyWorkShifts(companyId) {
  const { rows } = await db.query(
    'SELECT morning_start, morning_end, afternoon_start, afternoon_end FROM company_work_shifts WHERE company_id = $1',
    [companyId]
  );
  return rows[0] || null;
}

// ── GET /api/attendance-v2/state ─────────────────────────────────────────────
// Returns current user state + worked/break minutes today + open anomalies count.
router.get('/state', async (req, res, next) => {
  try {
    const { state, lastEvent } = await getCurrentState(req.user.id);

    // Worked/break minutes today from the view
    const { rows: dayRows } = await db.query(
      `SELECT worked_minutes, break_minutes, anomalies_count, has_pending_review
       FROM attendance_days_view
       WHERE user_id = $1
         AND date = (NOW() AT TIME ZONE 'Europe/Rome')::date`,
      [req.user.id]
    );
    const today = dayRows[0] || {
      worked_minutes: 0,
      break_minutes: 0,
      anomalies_count: 0,
      has_pending_review: false,
    };

    // Total open anomalies (all dates) for banner
    const { rows: anomalyRows } = await db.query(
      `SELECT COUNT(*)::int AS count FROM attendance_events
       WHERE user_id = $1 AND status = 'valid'
         AND (anomaly_type IS NOT NULL OR resulting_state = 'PENDING_REVIEW')
         AND id NOT IN (
           SELECT attendance_event_id FROM attendance_audit_log
           WHERE action = 'RESOLVE_ANOMALY' AND attendance_event_id IS NOT NULL
         )`,
      [req.user.id]
    );

    res.json({
      current_state: state,
      last_event: lastEvent,
      worked_minutes_today: parseInt(today.worked_minutes, 10) || 0,
      break_minutes_today: parseInt(today.break_minutes, 10) || 0,
      anomalies_today: parseInt(today.anomalies_count, 10) || 0,
      has_open_anomalies: anomalyRows[0].count > 0,
      valid_intents: sm.validIntentsFor(state),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/attendance-v2/scan ─────────────────────────────────────────────
// Body: { token, intent, request_id, device_id?, gps_lat?, gps_lng? }
router.post('/scan', async (req, res, next) => {
  let client;
  try {
    const { token, intent, request_id, device_id, gps_lat, gps_lng } = req.body;

    if (!token) return res.status(400).json({ error: 'Token QR mancante' });
    if (!intent) return res.status(400).json({ error: 'Intent mancante' });
    if (!request_id) return res.status(400).json({ error: 'request_id mancante' });
    if (!Object.values(sm.ACTIONS).includes(intent)) {
      return res.status(400).json({ error: 'Intent non valido' });
    }

    // 1. Validate JWT QR token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'QR Code scaduto o non valido. Riprova con quello aggiornato.' });
    }
    if (decoded.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'QR Code non valido per la tua azienda' });
    }

    // 2. Idempotency check: same (user_id, request_id) → return existing event
    const { rows: existingRows } = await db.query(
      'SELECT * FROM attendance_events WHERE user_id = $1 AND request_id = $2',
      [req.user.id, request_id]
    );
    if (existingRows.length > 0) {
      const existing = existingRows[0];
      return res.json({
        event: existing,
        new_state: existing.resulting_state,
        message: sm.buildTransitionMessage(existing.detected_action, new Date(existing.occurred_at)),
        idempotent: true,
      });
    }

    // 3. Debounce: if last event for user < 10s ago with same intent → reject
    const { rows: recentRows } = await db.query(
      `SELECT * FROM attendance_events
       WHERE user_id = $1 AND status = 'valid'
         AND occurred_at > NOW() - INTERVAL '${DEBOUNCE_SECONDS} seconds'
       ORDER BY occurred_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (recentRows.length > 0 && recentRows[0].detected_action === intent) {
      return res.status(429).json({
        error: `Timbratura troppo ravvicinata. Attendi qualche secondo e riprova.`,
      });
    }

    // 4. Read current state from latest event
    const { state: currentState } = await getCurrentState(req.user.id);

    // 5. Validate transition
    const newState = sm.applyTransition(currentState, intent);
    if (!newState) {
      return res.status(400).json({
        error: sm.buildInvalidTransitionError(currentState, intent),
        current_state: currentState,
        valid_intents: sm.validIntentsFor(currentState),
      });
    }

    // 6. Anomaly detection (out-of-shift only at this point; double-transition is prevented by state machine)
    const workShifts = await getCompanyWorkShifts(req.user.company_id);
    const occurredAt = new Date();
    let anomalyType = null;
    if (workShifts && !sm.isWithinWorkShift(occurredAt, workShifts)) {
      anomalyType = sm.ANOMALY_TYPES.OUT_OF_SHIFT;
    }

    // 7. Insert event (immutable). qr_token_id = jti if present, else iat as fallback.
    const qrTokenId = decoded.jti || (decoded.iat ? String(decoded.iat) : null);
    client = await db.pool.connect();
    await client.query('BEGIN');
    const { rows: insertRows } = await client.query(
      `INSERT INTO attendance_events
       (company_id, user_id, occurred_at, detected_action, resulting_state, previous_state,
        request_id, qr_token_id, device_id, gps_lat, gps_lng, source, anomaly_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'mobile', $12)
       RETURNING *`,
      [
        req.user.company_id,
        req.user.id,
        occurredAt.toISOString(),
        intent,
        newState,
        currentState,
        request_id,
        qrTokenId,
        device_id || null,
        gps_lat || null,
        gps_lng || null,
        anomalyType,
      ]
    );

    const event = insertRows[0];
    await enqueueAttendanceEvent(client, {
      companyId: req.user.company_id,
      event,
    });
    await client.query('COMMIT');
    res.status(201).json({
      event,
      new_state: newState,
      message: sm.buildTransitionMessage(intent, occurredAt),
      anomaly_type: anomalyType,
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    // Unique violation on (user_id, request_id) — race condition with another request
    if (err.code === '23505') {
      const { rows } = await db.query(
        'SELECT * FROM attendance_events WHERE user_id = $1 AND request_id = $2',
        [req.user.id, req.body.request_id]
      );
      if (rows.length > 0) {
        return res.json({
          event: rows[0],
          new_state: rows[0].resulting_state,
          message: sm.buildTransitionMessage(rows[0].detected_action, new Date(rows[0].occurred_at)),
          idempotent: true,
        });
      }
    }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── GET /api/attendance-v2/events ────────────────────────────────────────────
// Query: date_from, date_to (ISO date strings)
router.get('/events', async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const params = [req.user.id];
    let query = `
      SELECT * FROM attendance_events
      WHERE user_id = $1
    `;
    if (date_from) {
      params.push(date_from);
      query += ` AND occurred_at >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to);
      query += ` AND occurred_at <= $${params.length}`;
    }
    query += ' ORDER BY occurred_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/attendance-v2/days ──────────────────────────────────────────────
// Query: month (1-12), year (YYYY)
router.get('/days', async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const { rows } = await db.query(
      `SELECT * FROM attendance_days_view
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date DESC`,
      [req.user.id, month, year]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/attendance-v2/override-requests ────────────────────────────────
// Body: { requested_action, requested_at (ISO), reason }
router.post('/override-requests', async (req, res, next) => {
  try {
    const { requested_action, requested_at, reason } = req.body;
    if (!requested_action || !requested_at || !reason) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }
    if (!Object.values(sm.ACTIONS).includes(requested_action)) {
      return res.status(400).json({ error: 'requested_action non valida' });
    }
    if (reason.trim().length < 10) {
      return res.status(400).json({ error: 'La motivazione deve avere almeno 10 caratteri' });
    }

    const { rows } = await db.query(
      `INSERT INTO attendance_override_requests
       (company_id, user_id, requested_action, requested_at, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.company_id, req.user.id, requested_action, requested_at, reason]
    );
    res.status(201).json(rows[0]);

    notifyRoles(req.user.company_id, ['admin', 'superadmin'], {
      type:  'attendance_request',
      title: 'Richiesta di rettifica presenze',
      body:  `${req.user.name || req.user.email}: ${requested_action}`,
      url:   '/attendance',
      data:  { requestId: rows[0].id },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/attendance-v2/override-requests ─────────────────────────────────
router.get('/override-requests', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM attendance_override_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
