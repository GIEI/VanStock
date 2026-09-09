const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { encrypt } = require('../services/crypto');
const { verifyCompanySmtp } = require('../services/mailer');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// Auth helper: superadmin OR admin of the same company
function canManageSmtp(req, companyId) {
  if (req.user.role === 'superadmin') return true;
  if (req.user.role === 'admin' && req.user.company_id === companyId) return true;
  return false;
}

// GET /api/companies/:companyId/smtp — never returns password
router.get('/', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.companyId);
    if (!canManageSmtp(req, cid)) return res.status(403).json({ error: 'Accesso negato' });

    const r = await db.query(
      `SELECT id, company_id, host, port, secure, username, from_email, from_name, created_at, updated_at,
              (password_enc IS NOT NULL) AS has_password
       FROM company_smtp_settings WHERE company_id = $1`,
      [cid]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'SMTP non configurato' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/companies/:companyId/smtp — upsert. Password optional on update.
router.put('/', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.companyId);
    if (!canManageSmtp(req, cid)) return res.status(403).json({ error: 'Accesso negato' });

    const { host, port, secure, username, password, from_email, from_name } = req.body;
    if (!host || !username || !from_email) {
      return res.status(400).json({ error: 'host, username e from_email sono obbligatori' });
    }

    const existing = await db.query('SELECT id, password_enc FROM company_smtp_settings WHERE company_id = $1', [cid]);

    if (!existing.rows.length) {
      if (!password) return res.status(400).json({ error: 'password obbligatoria alla prima configurazione' });
      const encPw = encrypt(password);
      const r = await db.query(
        `INSERT INTO company_smtp_settings (company_id, host, port, secure, username, password_enc, from_email, from_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, company_id, host, port, secure, username, from_email, from_name, created_at, updated_at`,
        [cid, host, port ?? 587, secure ?? false, username, encPw, from_email, from_name ?? null]
      );
      return res.status(201).json(r.rows[0]);
    }

    // Update — keep existing password if not provided
    const newPwEnc = password ? encrypt(password) : existing.rows[0].password_enc;
    const r = await db.query(
      `UPDATE company_smtp_settings
       SET host = $1, port = $2, secure = $3, username = $4, password_enc = $5,
           from_email = $6, from_name = $7, updated_at = NOW()
       WHERE company_id = $8
       RETURNING id, company_id, host, port, secure, username, from_email, from_name, created_at, updated_at`,
      [host, port ?? 587, secure ?? false, username, newPwEnc, from_email, from_name ?? null, cid]
    );
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/companies/:companyId/smtp
router.delete('/', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.companyId);
    if (!canManageSmtp(req, cid)) return res.status(403).json({ error: 'Accesso negato' });
    await db.query('DELETE FROM company_smtp_settings WHERE company_id = $1', [cid]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/companies/:companyId/smtp/test — verifies the connection
router.post('/test', async (req, res, next) => {
  try {
    const cid = parseInt(req.params.companyId);
    if (!canManageSmtp(req, cid)) return res.status(403).json({ error: 'Accesso negato' });
    await verifyCompanySmtp(cid);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message, code: err.code });
  }
});

module.exports = router;
