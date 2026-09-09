const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { getSeatUsage, SEAT_CONSUMING_STATUSES } = require('../services/entitlements');

const router = express.Router();
router.use(requireAuth);

const VALID_PLANS    = ['BASIC', 'PRO', 'ENTERPRISE'];
const VALID_STATUSES = ['ACTIVE', 'SUSPENDED', 'TRIAL', 'PAST_DUE'];

// GET /api/subscriptions/me — admin/superadmin sees their own company's seat usage
router.get('/me', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const usage = await getSeatUsage(req.user.company_id);
    if (!usage) return res.status(404).json({ error: 'Nessuna licenza per questa company' });
    res.json(usage);
  } catch (err) { next(err); }
});

// GET /api/subscriptions — superadmin lists all subscriptions with usage
router.get('/', requireAuth.requireRole('superadmin'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.company_id, c.name AS company_name,
              s.plan_type, s.max_seats, s.expires_at, s.status,
              s.created_at, s.updated_at,
              COALESCE(u.used_seats, 0)::int AS used_seats
       FROM subscriptions s
       JOIN companies c ON c.id = s.company_id
       LEFT JOIN (
         SELECT company_id, COUNT(*) AS used_seats
         FROM users
         WHERE status = ANY($1::text[])
         GROUP BY company_id
       ) u ON u.company_id = s.company_id
       ORDER BY c.name`,
      [SEAT_CONSUMING_STATUSES]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/subscriptions/:companyId — superadmin detail for a single company
router.get('/:companyId', requireAuth.requireRole('superadmin'), async (req, res, next) => {
  try {
    const usage = await getSeatUsage(parseInt(req.params.companyId));
    if (!usage) return res.status(404).json({ error: 'Nessuna licenza per questa company' });
    res.json(usage);
  } catch (err) { next(err); }
});

// PUT /api/subscriptions/:companyId — superadmin updates plan/seats/expiry/status
router.put('/:companyId', requireAuth.requireRole('superadmin'), async (req, res, next) => {
  try {
    const cid = parseInt(req.params.companyId);
    const { plan_type, max_seats, expires_at, status } = req.body;

    if (plan_type !== undefined && !VALID_PLANS.includes(plan_type)) {
      return res.status(400).json({ error: `plan_type deve essere uno di ${VALID_PLANS.join(', ')}` });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status deve essere uno di ${VALID_STATUSES.join(', ')}` });
    }
    if (max_seats !== undefined && (!Number.isInteger(max_seats) || max_seats < 0)) {
      return res.status(400).json({ error: 'max_seats deve essere un intero >= 0' });
    }

    // Build dynamic SET so absent fields stay untouched; expires_at can be
    // explicitly cleared by passing null in the body.
    const sets = [];
    const params = [];
    const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };

    if (plan_type !== undefined) add('plan_type', plan_type);
    if (max_seats !== undefined) add('max_seats', max_seats);
    if (Object.prototype.hasOwnProperty.call(req.body, 'expires_at')) add('expires_at', expires_at);
    if (status    !== undefined) add('status',    status);

    if (!sets.length) return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    sets.push('updated_at = NOW()');
    params.push(cid);

    const result = await db.query(
      `UPDATE subscriptions SET ${sets.join(', ')} WHERE company_id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Subscription non trovata' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
