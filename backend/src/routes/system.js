const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();

// Helper: convert 'HH:MM:SS' or 'HH:MM' to decimal hours
function toDecimal(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

// ── GET /api/system/work-shifts ───────────────────────────────────────────────
// Returns the company's configured work shifts, or defaults if not yet set.
router.get('/work-shifts', requireAuth, requireResource('API_ABSENCES'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM company_work_shifts WHERE company_id = $1',
      [req.user.company_id]
    );

    if (rows.length > 0) {
      const s = rows[0];
      return res.json({
        morning_start:             s.morning_start.slice(0, 5),
        morning_end:               s.morning_end.slice(0, 5),
        afternoon_start:           s.afternoon_start.slice(0, 5),
        afternoon_end:             s.afternoon_end.slice(0, 5),
        morning_late_threshold:    (s.morning_late_threshold   || '09:10:00').slice(0, 5),
        afternoon_late_threshold:  (s.afternoon_late_threshold || '14:10:00').slice(0, 5),
      });
    }

    // Return defaults
    res.json({
      morning_start:             '08:00',
      morning_end:               '13:30',
      afternoon_start:           '13:31',
      afternoon_end:             '20:00',
      morning_late_threshold:    '09:10',
      afternoon_late_threshold:  '14:10',
    });
  } catch (err) { next(err); }
});

// ── PUT /api/system/work-shifts ───────────────────────────────────────────────
// Upserts the company's work shift configuration. Admin only.
router.put('/work-shifts', requireAuth, requireResource('API_ABSENCES'), async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const {
      morning_start, morning_end, afternoon_start, afternoon_end,
      morning_late_threshold, afternoon_late_threshold,
    } = req.body;

    if (!morning_start || !morning_end || !afternoon_start || !afternoon_end ||
        !morning_late_threshold || !afternoon_late_threshold) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Validate ordering: morning_start < morning_end <= afternoon_start < afternoon_end
    const ms = toDecimal(morning_start);
    const me = toDecimal(morning_end);
    const as = toDecimal(afternoon_start);
    const ae = toDecimal(afternoon_end);
    const mlt = toDecimal(morning_late_threshold);
    const alt = toDecimal(afternoon_late_threshold);

    if (ms >= me) return res.status(400).json({ error: 'Inizio mattina deve essere prima della fine mattina' });
    if (me > as)  return res.status(400).json({ error: 'Fine mattina non può essere dopo l\'inizio pomeriggio' });
    if (as >= ae) return res.status(400).json({ error: 'Inizio pomeriggio deve essere prima della fine pomeriggio' });
    if (mlt < ms || mlt > me) return res.status(400).json({ error: 'Soglia ritardo mattina deve essere all\'interno del turno mattina' });
    if (alt < as || alt > ae) return res.status(400).json({ error: 'Soglia ritardo pomeriggio deve essere all\'interno del turno pomeriggio' });

    const { rows } = await db.query(
      `INSERT INTO company_work_shifts (company_id, morning_start, morning_end, afternoon_start, afternoon_end, morning_late_threshold, afternoon_late_threshold, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (company_id) DO UPDATE SET
         morning_start            = EXCLUDED.morning_start,
         morning_end              = EXCLUDED.morning_end,
         afternoon_start          = EXCLUDED.afternoon_start,
         afternoon_end            = EXCLUDED.afternoon_end,
         morning_late_threshold   = EXCLUDED.morning_late_threshold,
         afternoon_late_threshold = EXCLUDED.afternoon_late_threshold,
         updated_at               = NOW()
       RETURNING *`,
      [req.user.company_id, morning_start, morning_end, afternoon_start, afternoon_end, morning_late_threshold, afternoon_late_threshold]
    );

    const s = rows[0];
    res.json({
      morning_start:             s.morning_start.slice(0, 5),
      morning_end:               s.morning_end.slice(0, 5),
      afternoon_start:           s.afternoon_start.slice(0, 5),
      afternoon_end:             s.afternoon_end.slice(0, 5),
      morning_late_threshold:    s.morning_late_threshold.slice(0, 5),
      afternoon_late_threshold:  s.afternoon_late_threshold.slice(0, 5),
    });
  } catch (err) { next(err); }
});

module.exports = router;
