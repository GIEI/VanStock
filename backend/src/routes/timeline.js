const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();
router.use(requireAuth);
router.use(requireResource('API_TIMELINE'));
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

/**
 * GET /api/timeline
 *
 * Query params:
 *   date     YYYY-MM-DD  (default: today)
 *   week     1           (return 7 days starting from `date`)
 *   user_id  number      (filter to a single technician)
 *
 * Returns:
 *   { date_from, date_to, is_week, technicians, jobs }
 */
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const companyId = req.user.company_id;

    // ── Date range ─────────────────────────────────────────────────────────────
    const baseDate = req.query.date ? new Date(req.query.date) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    const isWeek  = req.query.week === '1';
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + (isWeek ? 7 : 1));

    const dateFrom = baseDate.toISOString().slice(0, 10);
    const dateTo   = endDate.toISOString().slice(0, 10);

    // ── Optional technician filter ─────────────────────────────────────────────
    const userId = req.query.user_id ? Number(req.query.user_id) : null;

    // ── Technicians list ───────────────────────────────────────────────────────
    const techRows = await db.query(
      `SELECT id, name, role FROM users
       WHERE company_id = $1 AND is_active = true AND role = 'user'
       ORDER BY name`,
      [companyId]
    );

    // ── Jobs query ─────────────────────────────────────────────────────────────
    const params = [companyId, dateFrom, dateTo];
    let userFilter = '';
    if (userId) {
      params.push(userId);
      userFilter = `AND j.assigned_to = $${params.length}`;
    }

    const jobsResult = await db.query(
      `SELECT
         j.id,
         j.title,
         j.description,
         j.address,
         j.status,
         j.priority,
         j.assigned_to,
         u.name          AS assigned_to_name,
         j.scheduled_date,
         j.scheduled_time,
         j.scheduled_time_custom,
         j.started_at,
         j.completed_at,
         j.client_id,
         c.name          AS client_name,
         c.address       AS client_address,
         c.phone         AS client_phone,
         vb.start_time   AS booking_start_time,
         vb.end_time     AS booking_end_time,
         (SELECT p.url FROM job_photos p
          WHERE p.job_id = j.id AND p.type = 'problem'
          ORDER BY p.created_at ASC LIMIT 1)  AS photo_problem,
         (SELECT p.url FROM job_photos p
          WHERE p.job_id = j.id AND p.type = 'repair'
          ORDER BY p.created_at ASC LIMIT 1)  AS photo_repair,
         (SELECT COUNT(*) FROM movements m
          WHERE m.job_id = j.id AND m.type = 'scarico')::int AS material_count
       FROM jobs j
       LEFT JOIN users            u  ON u.id = j.assigned_to
       LEFT JOIN clients          c  ON c.id = j.client_id
       LEFT JOIN vehicle_bookings vb ON vb.job_id = j.id
       WHERE j.company_id = $1
         AND j.status NOT IN ('annullato')
         AND (
               (j.scheduled_date >= $2 AND j.scheduled_date < $3)
            OR (j.started_at IS NOT NULL
                AND j.started_at::date >= $2
                AND j.started_at::date < $3)
            OR (j.status = 'in_corso'
                AND (j.scheduled_date IS NULL OR j.scheduled_date < $3))
         )
         ${userFilter}
       ORDER BY COALESCE(j.started_at, (j.scheduled_date::text || 'T00:00:00')::timestamp) ASC NULLS LAST`,
      params
    );

    res.json({
      date_from:   dateFrom,
      date_to:     dateTo,
      is_week:     isWeek,
      technicians: techRows.rows,
      jobs:        jobsResult.rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
