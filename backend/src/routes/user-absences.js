const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_ABSENCES'));

// GET /api/user-absences/company/all?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD (admin only - returns all users' absences)
router.get('/company/all', async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT ua.id, ua.user_id, ua.absence_date, ua.reason, ua.notes, ua.created_at,
             u.name AS user_name
      FROM user_absences ua
      LEFT JOIN users u ON u.id = ua.user_id
      WHERE ua.company_id = $1
    `;
    const params = [req.user.company_id];

    if (date_from) {
      query += ` AND ua.absence_date >= $${params.length + 1}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND ua.absence_date <= $${params.length + 1}`;
      params.push(date_to);
    }

    query += ` ORDER BY ua.absence_date DESC, u.name ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/user-absences/:userId?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const { date_from, date_to } = req.query;

    // Check if user can view this data (self or admin)
    const currentUser = await db.query('SELECT role, company_id FROM users WHERE id = $1', [req.user.id]);
    const targetUser = await db.query('SELECT company_id FROM users WHERE id = $1', [userId]);

    if (!targetUser.rows[0] || targetUser.rows[0].company_id !== currentUser.rows[0].company_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const isAdmin = ['admin', 'superadmin'].includes(currentUser.rows[0].role);
    if (!isAdmin && userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT ua.id, ua.user_id, ua.absence_date, ua.reason, ua.notes, ua.created_at,
             u.name AS user_name
      FROM user_absences ua
      LEFT JOIN users u ON u.id = ua.user_id
      WHERE ua.user_id = $1
    `;
    const params = [userId];

    if (date_from) {
      query += ` AND ua.absence_date >= $${params.length + 1}`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND ua.absence_date <= $${params.length + 1}`;
      params.push(date_to);
    }

    query += ` ORDER BY ua.absence_date DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/user-absences/:userId
router.post('/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const { absence_date, reason, notes } = req.body;

    if (!absence_date) {
      return res.status(400).json({ error: 'absence_date is required' });
    }

    // Check authorization
    const currentUser = await db.query('SELECT role, company_id FROM users WHERE id = $1', [req.user.id]);
    const targetUser = await db.query('SELECT company_id FROM users WHERE id = $1', [userId]);

    if (!targetUser.rows[0] || targetUser.rows[0].company_id !== currentUser.rows[0].company_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const isAdmin = ['admin', 'superadmin'].includes(currentUser.rows[0].role);
    if (!isAdmin && userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await db.query(
      `INSERT INTO user_absences (user_id, company_id, absence_date, reason, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, currentUser.rows[0].company_id, absence_date, reason, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ error: 'Absence already exists for this date' });
    }
    next(error);
  }
});

// DELETE /api/user-absences/:userId/:absenceId
router.delete('/:userId/:absenceId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const absenceId = parseInt(req.params.absenceId);

    // Check authorization
    const currentUser = await db.query('SELECT role, company_id FROM users WHERE id = $1', [req.user.id]);
    const targetUser = await db.query('SELECT company_id FROM users WHERE id = $1', [userId]);

    if (!targetUser.rows[0] || targetUser.rows[0].company_id !== currentUser.rows[0].company_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const isAdmin = ['admin', 'superadmin'].includes(currentUser.rows[0].role);
    if (!isAdmin && userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await db.query(
      'DELETE FROM user_absences WHERE id = $1 AND user_id = $2 RETURNING id',
      [absenceId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
