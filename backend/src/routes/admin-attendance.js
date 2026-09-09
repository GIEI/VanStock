// Admin Attendance — manage events, anomalies, override requests, audit log.
const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');
const sm = require('../utils/attendance-state-machine');
const { enqueueAttendanceEvent } = require('../services/integration-outbox-service');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_ADMIN_ATTENDANCE'));
router.use(requireAuth.requireRole('admin', 'superadmin'));

// Helper: write an audit log entry within a transaction.
async function writeAuditLog(client, { eventId, adminId, action, oldValue, newValue, reason }) {
  await client.query(
    `INSERT INTO attendance_audit_log
     (attendance_event_id, admin_id, action, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [eventId, adminId, action, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, reason]
  );
}

// ── GET /api/admin/attendance/events ─────────────────────────────────────────
// Query: user_id?, date_from?, date_to?, status?, anomaly_only?
router.get('/events', async (req, res, next) => {
  try {
    const { user_id, date_from, date_to, status, anomaly_only } = req.query;
    const params = [req.user.company_id];
    let query = `
      SELECT ae.*, u.name AS user_name, u.email AS user_email,
             cb.name AS created_by_name,
             EXISTS (
               SELECT 1 FROM attendance_audit_log al
               WHERE al.attendance_event_id = ae.id AND al.action = 'DISMISS_ANOMALY'
             ) AS anomaly_dismissed
      FROM attendance_events ae
      JOIN users u ON ae.user_id = u.id
      LEFT JOIN users cb ON ae.created_by = cb.id
      WHERE ae.company_id = $1
    `;
    if (user_id) {
      params.push(user_id);
      query += ` AND ae.user_id = $${params.length}`;
    }
    if (date_from) {
      params.push(date_from);
      query += ` AND ae.occurred_at >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to);
      query += ` AND ae.occurred_at <= $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND ae.status = $${params.length}`;
    }
    if (anomaly_only === 'true') {
      query += ` AND (ae.anomaly_type IS NOT NULL OR ae.resulting_state = 'PENDING_REVIEW')`;
    }
    query += ' ORDER BY ae.occurred_at DESC LIMIT 500';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/attendance/events ────────────────────────────────────────
// Admin manually creates an event (e.g., approving an override request manually).
// Body: { user_id, occurred_at, detected_action, reason, notes? }
router.post('/events', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { user_id, occurred_at, detected_action, reason, notes } = req.body;
    if (!user_id || !occurred_at || !detected_action || !reason) {
      return res.status(400).json({ error: 'user_id, occurred_at, detected_action e reason sono obbligatori' });
    }
    if (!Object.values(sm.ACTIONS).includes(detected_action)) {
      return res.status(400).json({ error: 'detected_action non valida' });
    }
    if (reason.trim().length < 10) {
      return res.status(400).json({ error: 'La motivazione deve avere almeno 10 caratteri' });
    }

    // Verify target user belongs to admin's company
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [user_id, req.user.company_id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    await client.query('BEGIN');

    // Determine the state at the requested time by looking at the latest event before occurred_at.
    const { rows: prevRows } = await client.query(
      `SELECT resulting_state FROM attendance_events
       WHERE user_id = $1 AND status = 'valid' AND occurred_at < $2
       ORDER BY occurred_at DESC, id DESC LIMIT 1`,
      [user_id, occurred_at]
    );
    const previousState = prevRows[0]?.resulting_state || sm.STATES.OUT;
    const newState = sm.applyTransition(previousState, detected_action) || sm.STATES.PENDING_REVIEW;

    // Generate a unique request_id for this admin-created event
    const requestId = `admin-${req.user.id}-${Date.now()}`;

    const { rows: insertRows } = await client.query(
      `INSERT INTO attendance_events
       (company_id, user_id, occurred_at, detected_action, resulting_state, previous_state,
        request_id, source, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, $9)
       RETURNING *`,
      [req.user.company_id, user_id, occurred_at, detected_action, newState, previousState, requestId, notes || null, req.user.id]
    );
    const event = insertRows[0];

    await writeAuditLog(client, {
      eventId: event.id,
      adminId: req.user.id,
      action: 'CREATE',
      oldValue: null,
      newValue: event,
      reason,
    });

    await enqueueAttendanceEvent(client, {
      companyId: req.user.company_id,
      event,
    });

    await client.query('COMMIT');
    res.status(201).json(event);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── PATCH /api/admin/attendance/events/:id ───────────────────────────────────
// Modify an event by superseding it: mark old as 'superseded', insert a corrected event
// whose resulting_state is recomputed by the state machine (never trusted from the client).
// Body: { occurred_at?, detected_action?, notes?, reason }
router.patch('/events/:id', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const eventId = parseInt(req.params.id);
    const { occurred_at, detected_action, notes, reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'La motivazione (reason) è obbligatoria (min 10 caratteri)' });
    }

    await client.query('BEGIN');

    const { rows: eventRows } = await client.query(
      'SELECT * FROM attendance_events WHERE id = $1 AND company_id = $2',
      [eventId, req.user.company_id]
    );
    if (eventRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    const oldEvent = eventRows[0];

    const newAction = detected_action || oldEvent.detected_action;
    const newState = sm.applyTransition(oldEvent.previous_state, newAction);
    if (!newState) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: sm.buildInvalidTransitionError(oldEvent.previous_state, newAction) });
    }

    // Mark old as superseded
    await client.query(
      `UPDATE attendance_events SET status = 'superseded' WHERE id = $1`,
      [eventId]
    );

    // Insert corrected event. anomaly_type is left NULL: this is an admin-supplied
    // correction with real data, not a detected anomaly.
    const newOccurredAt = occurred_at || oldEvent.occurred_at;
    const newNotes = notes !== undefined ? notes : oldEvent.notes;
    const requestId = `admin-edit-${req.user.id}-${Date.now()}`;

    const { rows: newRows } = await client.query(
      `INSERT INTO attendance_events
       (company_id, user_id, occurred_at, detected_action, resulting_state, previous_state,
        request_id, source, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, $9)
       RETURNING *`,
      [
        oldEvent.company_id,
        oldEvent.user_id,
        newOccurredAt,
        newAction,
        newState,
        oldEvent.previous_state,
        requestId,
        newNotes,
        req.user.id,
      ]
    );
    const newEvent = newRows[0];

    await writeAuditLog(client, {
      eventId: newEvent.id,
      adminId: req.user.id,
      action: 'SUPERSEDE',
      oldValue: oldEvent,
      newValue: newEvent,
      reason,
    });

    await enqueueAttendanceEvent(client, {
      companyId: oldEvent.company_id,
      event: newEvent,
      type: 'attendance.event.superseded',
      supersededEventId: oldEvent.id,
    });

    await client.query('COMMIT');
    res.json(newEvent);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── DELETE /api/admin/attendance/events/:id ──────────────────────────────────
// Soft-delete: set status='invalid'. Body: { reason }
router.delete('/events/:id', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const eventId = parseInt(req.params.id);
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'La motivazione (reason) è obbligatoria (min 10 caratteri)' });
    }

    await client.query('BEGIN');

    const { rows: eventRows } = await client.query(
      'SELECT * FROM attendance_events WHERE id = $1 AND company_id = $2',
      [eventId, req.user.company_id]
    );
    if (eventRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    const oldEvent = eventRows[0];

    await client.query(
      `UPDATE attendance_events SET status = 'invalid' WHERE id = $1`,
      [eventId]
    );

    await writeAuditLog(client, {
      eventId,
      adminId: req.user.id,
      action: 'INVALIDATE',
      oldValue: oldEvent,
      newValue: { ...oldEvent, status: 'invalid' },
      reason,
    });

    await enqueueAttendanceEvent(client, {
      companyId: oldEvent.company_id,
      event: { ...oldEvent, status: 'invalid' },
      type: 'attendance.event.invalidated',
    });

    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/admin/attendance/anomalies ──────────────────────────────────────
// List events with anomaly_type or PENDING_REVIEW state, not yet resolved.
router.get('/anomalies', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ae.*, u.name AS user_name, u.email AS user_email
       FROM attendance_events ae
       JOIN users u ON ae.user_id = u.id
       WHERE ae.company_id = $1
         AND ae.status = 'valid'
         AND (ae.anomaly_type IS NOT NULL OR ae.resulting_state = 'PENDING_REVIEW')
         AND ae.id NOT IN (
           SELECT attendance_event_id FROM attendance_audit_log
           WHERE action IN ('RESOLVE_ANOMALY', 'DISMISS_ANOMALY') AND attendance_event_id IS NOT NULL
         )
       ORDER BY ae.occurred_at DESC LIMIT 200`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/attendance/anomalies/:id/resolve ─────────────────────────
// Body: { reason, new_status? }   (new_status defaults to 'reviewed')
router.post('/anomalies/:id/resolve', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const eventId = parseInt(req.params.id);
    const { reason, new_status } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'La motivazione è obbligatoria (min 10 caratteri)' });
    }
    const targetStatus = new_status || 'reviewed';

    await client.query('BEGIN');
    const { rows: eventRows } = await client.query(
      'SELECT * FROM attendance_events WHERE id = $1 AND company_id = $2',
      [eventId, req.user.company_id]
    );
    if (eventRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    const oldEvent = eventRows[0];

    await client.query(
      `UPDATE attendance_events SET status = $1 WHERE id = $2`,
      [targetStatus, eventId]
    );

    await writeAuditLog(client, {
      eventId,
      adminId: req.user.id,
      action: 'RESOLVE_ANOMALY',
      oldValue: oldEvent,
      newValue: { ...oldEvent, status: targetStatus },
      reason,
    });

    await client.query('COMMIT');
    res.json({ ...oldEvent, status: targetStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/admin/attendance/anomalies/:id/dismiss ──────────────────────────
// Silences the anomaly flag WITHOUT touching the underlying event: the clock-in/out
// stays 'valid' and keeps counting normally, pending a real correction from mobile.
// Body: { reason }
router.post('/anomalies/:id/dismiss', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const eventId = parseInt(req.params.id);
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'La motivazione è obbligatoria (min 10 caratteri)' });
    }

    await client.query('BEGIN');
    const { rows: eventRows } = await client.query(
      'SELECT * FROM attendance_events WHERE id = $1 AND company_id = $2',
      [eventId, req.user.company_id]
    );
    if (eventRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Evento non trovato' });
    }
    const oldEvent = eventRows[0];

    await writeAuditLog(client, {
      eventId,
      adminId: req.user.id,
      action: 'DISMISS_ANOMALY',
      oldValue: oldEvent,
      newValue: oldEvent,
      reason,
    });

    await client.query('COMMIT');
    res.json(oldEvent);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/admin/attendance/override-requests ──────────────────────────────
router.get('/override-requests', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [req.user.company_id];
    let query = `
      SELECT or_.*, u.name AS user_name, rb.name AS reviewed_by_name
      FROM attendance_override_requests or_
      JOIN users u ON or_.user_id = u.id
      LEFT JOIN users rb ON or_.reviewed_by = rb.id
      WHERE or_.company_id = $1
    `;
    if (status) {
      params.push(status);
      query += ` AND or_.status = $${params.length}`;
    }
    query += ' ORDER BY or_.created_at DESC LIMIT 200';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/attendance/override-requests/:id/review ──────────────────
// Body: { decision: 'approve'|'reject', review_notes }
router.post('/override-requests/:id/review', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const requestId = parseInt(req.params.id);
    const { decision, review_notes } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'decision deve essere approve o reject' });
    }
    if (!review_notes || review_notes.trim().length < 10) {
      return res.status(400).json({ error: 'review_notes è obbligatorio (min 10 caratteri)' });
    }

    await client.query('BEGIN');
    const { rows: reqRows } = await client.query(
      `SELECT * FROM attendance_override_requests
       WHERE id = $1 AND company_id = $2 AND status = 'pending'`,
      [requestId, req.user.company_id]
    );
    if (reqRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Richiesta non trovata o già processata' });
    }
    const request = reqRows[0];

    if (decision === 'reject') {
      await client.query(
        `UPDATE attendance_override_requests
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2
         WHERE id = $3`,
        [req.user.id, review_notes, requestId]
      );
      await writeAuditLog(client, {
        eventId: null,
        adminId: req.user.id,
        action: 'REJECT_REQUEST',
        oldValue: request,
        newValue: { ...request, status: 'rejected' },
        reason: review_notes,
      });
      await client.query('COMMIT');
      return res.json({ ...request, status: 'rejected' });
    }

    // Approve: create attendance_event linked to this request
    const { rows: prevRows } = await client.query(
      `SELECT resulting_state FROM attendance_events
       WHERE user_id = $1 AND status = 'valid' AND occurred_at < $2
       ORDER BY occurred_at DESC, id DESC LIMIT 1`,
      [request.user_id, request.requested_at]
    );
    const previousState = prevRows[0]?.resulting_state || sm.STATES.OUT;
    const newState = sm.applyTransition(previousState, request.requested_action) || sm.STATES.PENDING_REVIEW;
    const eventRequestId = `override-${requestId}-${Date.now()}`;

    const { rows: eventRows } = await client.query(
      `INSERT INTO attendance_events
       (company_id, user_id, occurred_at, detected_action, resulting_state, previous_state,
        request_id, source, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, $9)
       RETURNING *`,
      [
        request.company_id,
        request.user_id,
        request.requested_at,
        request.requested_action,
        newState,
        previousState,
        eventRequestId,
        `Override request #${requestId} approved: ${request.reason}`,
        req.user.id,
      ]
    );
    const newEvent = eventRows[0];

    await client.query(
      `UPDATE attendance_override_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(),
           review_notes = $2, resulting_event_id = $3
       WHERE id = $4`,
      [req.user.id, review_notes, newEvent.id, requestId]
    );

    await writeAuditLog(client, {
      eventId: newEvent.id,
      adminId: req.user.id,
      action: 'APPROVE_REQUEST',
      oldValue: request,
      newValue: newEvent,
      reason: review_notes,
    });

    await enqueueAttendanceEvent(client, {
      companyId: request.company_id,
      event: newEvent,
      overrideRequestId: request.id,
    });

    await client.query('COMMIT');
    res.json({ request: { ...request, status: 'approved' }, event: newEvent });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/admin/attendance/audit-log ──────────────────────────────────────
router.get('/audit-log', async (req, res, next) => {
  try {
    const { admin_id, event_id, date_from, date_to } = req.query;
    const params = [];
    let query = `
      SELECT al.*, u.name AS admin_name
      FROM attendance_audit_log al
      JOIN users u ON al.admin_id = u.id
      WHERE u.company_id = $${params.push(req.user.company_id)}
    `;
    if (admin_id) {
      params.push(admin_id);
      query += ` AND al.admin_id = $${params.length}`;
    }
    if (event_id) {
      params.push(event_id);
      query += ` AND al.attendance_event_id = $${params.length}`;
    }
    if (date_from) {
      params.push(date_from);
      query += ` AND al.created_at >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to);
      query += ` AND al.created_at <= $${params.length}`;
    }
    query += ' ORDER BY al.created_at DESC LIMIT 500';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/attendance/days ───────────────────────────────────────────
router.get('/days', async (req, res, next) => {
  try {
    const { user_id, month, year } = req.query;
    const now = new Date();
    const m = parseInt(month) || (now.getMonth() + 1);
    const y = parseInt(year) || now.getFullYear();
    const params = [req.user.company_id, m, y];
    let query = `
      SELECT adv.*, u.name AS user_name
      FROM attendance_days_view adv
      JOIN users u ON adv.user_id = u.id
      WHERE adv.company_id = $1
        AND EXTRACT(MONTH FROM adv.date) = $2
        AND EXTRACT(YEAR FROM adv.date) = $3
    `;
    if (user_id) {
      params.push(user_id);
      query += ` AND adv.user_id = $${params.length}`;
    }
    query += ' ORDER BY adv.date DESC, u.name ASC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
