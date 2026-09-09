const router      = require('express').Router();
const db          = require('../db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

// GET /api/notifications — lista notifiche dell'utente (più recenti prima)
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notifica non trovata' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id — elimina una notifica letta
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 AND read_at IS NOT NULL RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notifica non trovata o non letta' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
