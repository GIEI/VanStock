const router     = require('express').Router();
const db         = require('../db');
const { getVapidKeys } = require('../notification-helper');
const requireAuth = require('../middleware/auth');

// Ensure device_tokens table exists
db.query(`
  CREATE TABLE IF NOT EXISTS device_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INT  NOT NULL,
    token      TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
  )
`).catch(() => {});

// All push routes require auth
router.use(requireAuth);

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', async (req, res, next) => {
  try {
    const keys = await getVapidKeys();
    res.json({ publicKey: keys.publicKey });
  } catch (err) { next(err); }
});

// POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'endpoint, p256dh e auth sono obbligatori' });
    }
    // Remove this endpoint from any other user (shared device / browser re-login)
    await db.query(
      'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id != $2',
      [endpoint, req.user.id]
    );
    await db.query(
      `INSERT INTO push_subscriptions (user_id, company_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [req.user.id, req.user.company_id, endpoint, p256dh, auth]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/push/fcm-token  — register Android FCM token
router.post('/fcm-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token obbligatorio' });
    // Remove this token from any other user (shared device / re-login scenario)
    await db.query(
      'DELETE FROM device_tokens WHERE token = $1 AND user_id != $2',
      [token, req.user.id]
    );
    await db.query(
      `INSERT INTO device_tokens (user_id, company_id, token)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, token) DO NOTHING`,
      [req.user.id, req.user.company_id, token]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/push/fcm-token  — unregister Android FCM token on logout
router.delete('/fcm-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token obbligatorio' });
    await db.query(
      'DELETE FROM device_tokens WHERE token = $1 AND user_id = $2',
      [token, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint obbligatorio' });
    await db.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, endpoint]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
