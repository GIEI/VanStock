const express = require('express');
const db      = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_ATTENDANCE_LEGACY'));

// Middleware to ensure admin/superadmin
const isAdmin = (req, res, next) => {
  if (['admin', 'superadmin'].includes(req.user.role)) return next();
  res.status(403).json({ error: 'Accesso negato' });
};

// ── GET /api/timesheet ───────────────────────────────────────────────────────
// List all attendance records for the company. Admin only.
router.get('/', isAdmin, async (req, res, next) => {
  try {
    const { user_id, date_from, date_to } = req.query;
    const params = [req.user.company_id];
    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.company_id = $1
    `;
    let i = 2;

    if (user_id)   { query += ` AND a.user_id = $${i++}`; params.push(user_id); }
    if (date_from) { query += ` AND a.date >= $${i++}`;   params.push(date_from); }
    if (date_to)   { query += ` AND a.date <= $${i++}`;   params.push(date_to); }

    query += ` ORDER BY a.date DESC, u.name ASC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── PATCH /api/timesheet/:id ─────────────────────────────────────────────────
// Manually update an attendance record. Admin only.
router.patch('/:id', isAdmin, async (req, res, next) => {
  try {
    const { morning_in, morning_out, afternoon_in, afternoon_out, status } = req.body;
    
    // Check if record exists and belongs to company
    const { rows: check } = await db.query(
      'SELECT id FROM attendance WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!check.length) return res.status(404).json({ error: 'Record non trovato' });

    const { rows } = await db.query(
      `UPDATE attendance
       SET morning_in = $1, morning_out = $2, afternoon_in = $3, afternoon_out = $4, status = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [morning_in || null, morning_out || null, afternoon_in || null, afternoon_out || null, status || 'active', req.params.id]
    );

    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── GET /api/timesheet/requests ──────────────────────────────────────────────
// List pending override requests.
router.get('/requests', isAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ar.*, u.name as user_name
       FROM attendance_requests ar
       JOIN users u ON ar.user_id = u.id
       WHERE ar.company_id = $1
       ORDER BY ar.created_at DESC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── PATCH /api/timesheet/requests/:id ────────────────────────────────────────
// Approve or Reject a request.
router.patch('/requests/:id', isAdmin, async (req, res, next) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status non valido' });
    }

    const { rows: reqData } = await db.query(
      'SELECT * FROM attendance_requests WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!reqData.length) return res.status(404).json({ error: 'Richiesta non trovata' });

    const request = reqData[0];

    if (status === 'approved') {
      const today = new Date(request.requested_at).toISOString().split('T')[0];
      
      // Upsert into attendance
      const { rows: existing } = await db.query(
        'SELECT id FROM attendance WHERE user_id = $1 AND date = $2 AND company_id = $3',
        [request.user_id, today, req.user.company_id]
      );

      if (existing.length) {
        await db.query(
          `UPDATE attendance SET ${request.type} = $1, updated_at = NOW() WHERE id = $2`,
          [request.requested_at, existing[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO attendance (company_id, user_id, date, ${request.type})
           VALUES ($1, $2, $3, $4)`,
          [req.user.company_id, request.user_id, today, request.requested_at]
        );
      }
    }

    const { rows } = await db.query(
      `UPDATE attendance_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, req.user.id, req.params.id]
    );

    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
