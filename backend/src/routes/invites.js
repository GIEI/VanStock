const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');

// Public router — the token IS the credential. No requireAuth here.
const router = express.Router();

// GET /api/invites/:token — returns invite details to render the accept page.
// Does not reveal whether the token is missing vs. expired beyond a 404 to
// avoid enumeration of email addresses.
router.get('/:token', async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT u.email, u.name, c.name AS company_name, i.expires_at, i.accepted_at
       FROM user_invites i
       JOIN users u     ON u.id = i.user_id
       JOIN companies c ON c.id = u.company_id
       WHERE i.token = $1`,
      [req.params.token]
    );
    if (!r.rows.length)                  return res.status(404).json({ error: 'INVITE_NOT_FOUND' });
    if (r.rows[0].accepted_at)           return res.status(410).json({ error: 'INVITE_ALREADY_USED' });
    if (new Date(r.rows[0].expires_at) < new Date()) return res.status(410).json({ error: 'INVITE_EXPIRED' });

    res.json({
      email:        r.rows[0].email,
      name:         r.rows[0].name,
      company_name: r.rows[0].company_name,
      expires_at:   r.rows[0].expires_at,
    });
  } catch (err) { next(err); }
});

// POST /api/invites/:token/accept — sets the password and activates the user
router.post('/:token/accept', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
    }

    await client.query('BEGIN');

    const lockedInvite = await client.query(
      `SELECT i.id, i.user_id, i.expires_at, i.accepted_at
       FROM user_invites i
       WHERE i.token = $1
       FOR UPDATE`,
      [req.params.token]
    );
    if (!lockedInvite.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'INVITE_NOT_FOUND' });
    }
    const inv = lockedInvite.rows[0];
    if (inv.accepted_at) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'INVITE_ALREADY_USED' });
    }
    if (new Date(inv.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'INVITE_EXPIRED' });
    }

    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `UPDATE users
       SET password_hash = $1, is_active = TRUE, status = 'ACTIVE'
       WHERE id = $2`,
      [hash, inv.user_id]
    );
    await client.query('UPDATE user_invites SET accepted_at = NOW() WHERE id = $1', [inv.id]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
