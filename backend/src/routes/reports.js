const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { notifyRoles } = require('../notification-helper');

const router = express.Router();
router.use(requireAuth);

// GET /api/reports — list reports
router.get('/', async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    let conditions = ['r.company_id = $1'];
    let params     = [req.user.company_id];

    if (!isAdmin) {
      params.push(req.user.id);
      conditions.push(`r.user_id = $${params.length}`);
    }

    const { date_from, date_to, user_id } = req.query;
    if (date_from) { params.push(date_from); conditions.push(`r.report_date >= $${params.length}`); }
    if (date_to)   { params.push(date_to);   conditions.push(`r.report_date <= $${params.length}`); }
    if (isAdmin && user_id) { params.push(parseInt(user_id)); conditions.push(`r.user_id = $${params.length}`); }

    const result = await db.query(
      `SELECT r.*,
              u.name  AS user_name,
              u.email AS user_email,
              COALESCE(
                jsonb_array_length(r.snapshot->'jobs'),
                0
              )::int AS jobs_count,
              COALESCE(
                (SELECT COUNT(*)::int FROM jsonb_array_elements(r.snapshot->'jobs') j,
                        jsonb_array_elements(j->'movements') m),
                0
              ) + COALESCE(jsonb_array_length(r.snapshot->'movements_other'), 0) AS movements_count
       FROM daily_reports r
       JOIN users u ON u.id = r.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.report_date DESC, r.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/reports/:id — single report, restituisce snapshot congelato
router.get('/:id', async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    const reportResult = await db.query(
      `SELECT r.*, u.name AS user_name, u.email AS user_email
       FROM daily_reports r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 AND r.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!reportResult.rows.length) return res.status(404).json({ error: 'Report not found' });

    const report = reportResult.rows[0];
    if (!isAdmin && report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const snap = report.snapshot || {};
    res.json({
      ...report,
      jobs:             snap.jobs             || [],
      movements_other:  snap.movements_other  || [],
      jobs_count:       (snap.jobs || []).length,
      movements_count:  (snap.movements_other || []).length +
                        (snap.jobs || []).reduce((s, j) => s + (j.movements || []).length, 0),
    });
  } catch (err) { next(err); }
});

// ── Snapshot builder ──────────────────────────────────────────────────────────
async function buildSnapshot(companyId, userId, date) {
  // 1. Lavori completati nella giornata dall'utente
  const jobsRes = await db.query(`
    SELECT j.id, j.title, j.status, j.address, j.completed_at,
           c.name AS client_name
    FROM jobs j
    LEFT JOIN clients c ON c.id = j.client_id
    WHERE j.company_id  = $1
      AND j.assigned_to = $2
      AND j.completed_at::date = $3
    ORDER BY j.completed_at
  `, [companyId, userId, date]);

  // 2. Tutti i movimenti dell'utente nella giornata
  const movRes = await db.query(`
    SELECT m.id, m.type, m.quantity, m.job_id, m.notes,
           p.name AS product_name, p.unit,
           fl.name AS from_location_name,
           tl.name AS to_location_name
    FROM movements m
    JOIN products  p  ON m.product_id       = p.id
    LEFT JOIN locations fl ON m.from_location_id = fl.id
    LEFT JOIN locations tl ON m.to_location_id   = tl.id
    WHERE p.company_id   = $1
      AND m.created_at::date = $2
      AND m.created_by = (SELECT name FROM users WHERE id = $3)
    ORDER BY m.created_at
  `, [companyId, date, userId]);

  // Mappa job_id → job
  const jobMap = {};
  for (const j of jobsRes.rows) {
    jobMap[j.id] = { ...j, movements: [] };
  }

  // Movimenti: se il lavoro è nello snapshot → nel job, altrimenti → movements_other
  const movementsOther = [];
  for (const m of movRes.rows) {
    const { job_id, ...mov } = m;
    if (job_id && jobMap[job_id]) {
      jobMap[job_id].movements.push(mov);
    } else {
      movementsOther.push(mov);
    }
  }

  return {
    jobs:            Object.values(jobMap),
    movements_other: movementsOther,
  };
}

// POST /api/reports — crea/aggiorna rapporto con snapshot congelato
router.post('/', async (req, res, next) => {
  try {
    const { report_date, notes } = req.body;
    const date = report_date || new Date().toISOString().slice(0, 10);

    const snapshot = await buildSnapshot(req.user.company_id, req.user.id, date);

    const result = await db.query(
      `INSERT INTO daily_reports (company_id, user_id, report_date, notes, snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, report_date)
       DO UPDATE SET notes = EXCLUDED.notes, snapshot = EXCLUDED.snapshot
       RETURNING *`,
      [req.user.company_id, req.user.id, date, notes || null, JSON.stringify(snapshot)]
    );
    res.status(201).json(result.rows[0]);

    notifyRoles(req.user.company_id, ['admin', 'superadmin'], {
      type:  'daily_report',
      title: 'Nuovo rapporto giornaliero',
      body:  `${req.user.name || req.user.email} ha inviato il rapporto del ${date}`,
      url:   `/reports/${result.rows[0].id}`,
      data:  { reportId: result.rows[0].id },
    });
  } catch (err) { next(err); }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const check = await db.query(
      'SELECT id, user_id FROM daily_reports WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Report not found' });
    if (!isAdmin && check.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    await db.query('DELETE FROM daily_reports WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
