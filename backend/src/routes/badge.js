const express = require('express');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const requireAuth = require('../middleware/auth');
const { requireResource } = require('../services/features');

const router = express.Router();
router.use(requireAuth, requireResource('API_ATTENDANCE_LEGACY'));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change-in-production';

// Helper: convert 'HH:MM:SS' or 'HH:MM' to decimal hours
function toDecimal(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

// ── GET /api/badge/generate ──────────────────────────────────────────────────
// Used by the monitor to show a rotating QR code. Admin only.
router.get('/generate', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const payload = {
      type:       'badge-v1',
      company_id: req.user.company_id,
      timestamp:  Date.now()
    };

    // Token expires in 65 seconds (to allow small clock drifts)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '65s' });
    res.json({ token });
  } catch (err) { next(err); }
});

// ── POST /api/badge/scan ──────────────────────────────────────────────────────
// Used by the mobile app to scan the QR code and record attendance.
router.post('/scan', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token mancante' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'QR Code scaduto o non valido. Riprova con quello aggiornato.' });
    }

    if (decoded.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'QR Code non valido per la tua azienda' });
    }

    // Load company work shifts (or use defaults)
    const { rows: shiftRows } = await db.query(
      'SELECT * FROM company_work_shifts WHERE company_id = $1',
      [req.user.company_id]
    );

    let morningStart, morningEnd, afternoonStart, afternoonEnd;
    if (shiftRows.length > 0) {
      morningStart   = toDecimal(shiftRows[0].morning_start);
      morningEnd     = toDecimal(shiftRows[0].morning_end);
      afternoonStart = toDecimal(shiftRows[0].afternoon_start);
      afternoonEnd   = toDecimal(shiftRows[0].afternoon_end);
    } else {
      morningStart   = toDecimal('08:00');
      morningEnd     = toDecimal('13:30');
      afternoonStart = toDecimal('13:31');
      afternoonEnd   = toDecimal('20:00');
    }

    const now   = new Date();
    const today = now.toISOString().split('T')[0];
    const time  = now.getHours() + now.getMinutes() / 60;

    const inMorning   = time >= morningStart   && time <= morningEnd;
    const inAfternoon = time >= afternoonStart && time <= afternoonEnd;

    if (!inMorning && !inAfternoon) {
      return res.status(400).json({ error: 'Timbratura non consentita fuori dagli orari lavorativi configurati' });
    }

    // Load or create today's record
    const { rows: records } = await db.query(
      'SELECT * FROM attendance WHERE company_id = $1 AND user_id = $2 AND date = $3',
      [req.user.company_id, req.user.id, today]
    );
    const att = records[0] || null;

    // ── Morning slot ─────────────────────────────────────────────────────────
    if (inMorning) {
      if (!att || !att.morning_in) {
        // First scan in morning → Ingresso mattinata
        if (!att) {
          const { rows } = await db.query(
            `INSERT INTO attendance (company_id, user_id, date, morning_in)
             VALUES ($1, $2, $3, NOW()) RETURNING *`,
            [req.user.company_id, req.user.id, today]
          );
          return res.json({ message: 'Ingresso mattinata registrato', attendance: rows[0] });
        } else {
          const { rows } = await db.query(
            `UPDATE attendance SET morning_in = NOW(), updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [att.id]
          );
          return res.json({ message: 'Ingresso mattinata registrato', attendance: rows[0] });
        }
      }

      if (!att.morning_out) {
        // Second scan in morning → Uscita mattinata
        const { rows } = await db.query(
          `UPDATE attendance SET morning_out = NOW(), updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [att.id]
        );
        return res.json({ message: 'Uscita mattinata registrata', attendance: rows[0] });
      }

      return res.status(400).json({ error: 'Hai già completato le timbrature della mattinata' });
    }

    // ── Afternoon slot ───────────────────────────────────────────────────────
    if (inAfternoon) {
      if (!att) {
        // First scan of the day in afternoon → Ingresso pomeriggio
        const { rows } = await db.query(
          `INSERT INTO attendance (company_id, user_id, date, afternoon_in)
           VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [req.user.company_id, req.user.id, today]
        );
        return res.json({ message: 'Ingresso pomeriggio registrato', attendance: rows[0] });
      }

      if (!att.afternoon_in) {
        // First scan in afternoon slot → Ingresso pomeriggio
        const { rows } = await db.query(
          `UPDATE attendance SET afternoon_in = NOW(), updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [att.id]
        );
        return res.json({ message: 'Ingresso pomeriggio registrato', attendance: rows[0] });
      }

      if (!att.afternoon_out) {
        // Second scan in afternoon → Uscita pomeriggio / Fine giornata
        const { rows } = await db.query(
          `UPDATE attendance SET afternoon_out = NOW(), status = 'closed', updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [att.id]
        );
        return res.json({ message: 'Fine giornata registrata', attendance: rows[0] });
      }

      return res.status(400).json({ error: 'Tutte le timbrature per oggi sono già state completate.' });
    }
  } catch (err) { next(err); }
});

// ── POST /api/badge/request-override ─────────────────────────────────────────
// User requests a manual clock-in/out entry.
router.post('/request-override', requireAuth, async (req, res, next) => {
  try {
    const { type, requested_at, reason } = req.body;
    if (!type || !requested_at || !reason) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const { rows } = await db.query(
      `INSERT INTO attendance_requests (company_id, user_id, type, requested_at, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.company_id, req.user.id, type, requested_at, reason]
    );

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
