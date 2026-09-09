const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const db      = require('../db');
const requireAuth = require('../middleware/auth');
const mailer      = require('../utils/mailer');
const { getEnabledFeatureKeys, getEnabledResourceKeys } = require('../services/features');

const router      = express.Router();
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email e password sono obbligatori' });
    }

    const { rows } = await db.query(
      `SELECT u.*, c.name AS company_name, c.logo_url AS company_logo_url,
              COALESCE(c.currency, 'EUR') AS company_currency,
              COALESCE(s.plan_type, 'BASIC') AS plan_type
       FROM users u
       LEFT JOIN companies c     ON u.company_id = c.id
       LEFT JOIN subscriptions s ON s.company_id = u.company_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const payload = {
      id:                user.id,
      company_id:        user.company_id,
      company_name:      user.company_name,
      company_logo_url:  user.company_logo_url || null,
      company_currency:  user.company_currency || 'EUR',
      email:             user.email,
      name:              user.name,
      role:              user.role,
      photo_url:         user.photo_url || null,
      plan_type:         user.plan_type || 'BASIC',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({ token, user: { ...payload, features: await getEnabledFeatureKeys(user.company_id), resources: await getEnabledResourceKeys(user.company_id) } });
  } catch (err) { next(err); }
});

// GET /api/auth/me — returns fresh user+company data from DB
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.company_id, u.email, u.name, u.role, u.photo_url,
              c.name AS company_name, c.logo_url AS company_logo_url,
              COALESCE(c.currency, 'EUR') AS company_currency,
              COALESCE(s.plan_type, 'BASIC') AS plan_type
       FROM users u
       LEFT JOIN companies c     ON u.company_id = c.id
       LEFT JOIN subscriptions s ON s.company_id = u.company_id
       WHERE u.id = $1 AND u.is_active = true`,
      [req.user.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Utente non trovato' });
    const u = rows[0];
    res.json({
      id:               u.id,
      company_id:       u.company_id,
      company_name:     u.company_name,
      company_logo_url: u.company_logo_url || null,
      company_currency: u.company_currency,
      email:            u.email,
      name:             u.name,
      role:             u.role,
      photo_url:        u.photo_url || null,
      plan_type:        u.plan_type || 'BASIC',
      features:         await getEnabledFeatureKeys(u.company_id),
      resources:        await getEnabledResourceKeys(u.company_id),
    });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email obbligatoria' });

    const { rows } = await db.query(
      'SELECT id FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    // Always return success to prevent user enumeration
    if (!rows.length) {
      return res.json({ message: 'Se l\'email è registrata riceverai le istruzioni per il reset.' });
    }

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, rows[0].id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    const resetUrl    = `${frontendUrl}/reset-password?token=${token}`;

    // Send email via SMTP (or log to console if not configured)
    await mailer.sendEmail({
      to: email.toLowerCase().trim(),
      subject: '[StockSimple] Reset Password',
      text: `Hai richiesto il reset della password. Clicca sul link seguente per procedere:\n\n${resetUrl}\n\nIl link scadrà tra un'ora.`,
      html: `<p>Hai richiesto il reset della password.</p><p>Clicca sul link seguente per procedere:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Il link scadrà tra un'ora.</p>`
    });

    res.json({
      message: 'Se l\'email è registrata riceverai le istruzioni per il reset.',
    });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'token e password sono obbligatori' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
    }

    const { rows } = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW() AND is_active = true',
      [token]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );

    res.json({ message: 'Password aggiornata con successo' });
  } catch (err) { next(err); }
});

// POST /api/auth/change-password — authenticated user changes own password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password e new_password sono obbligatori' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
    }

    const { rows } = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Password attuale non corretta' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Password aggiornata' });
  } catch (err) { next(err); }
});

module.exports = router;
