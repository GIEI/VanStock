const express     = require('express');
const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const { v4: uuidv4 } = require('uuid');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { checkSeatAvailability, getSeatUsage } = require('../services/entitlements');
const { sendCompanyEmail } = require('../services/mailer');

const router = express.Router();
router.use(requireAuth);

const uploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${uuidv4()}${ext}`);
  },
});
const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/users/available?date=YYYY-MM-DD&start_time=HH:MM&end_time=HH:MM
// Restituisce utenti 'user' liberi (senza vehicle_booking sovrapposto e senza assenze)
router.get('/available', async (req, res, next) => {
  try {
    const { date, start_time, end_time } = req.query;
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Parametri date, start_time e end_time obbligatori' });
    }

    const result = await db.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       WHERE u.company_id = $1
         AND u.role = 'user'
         AND u.is_active = true
         AND u.id NOT IN (
           SELECT vb.booked_by
           FROM vehicle_bookings vb
           WHERE vb.company_id = $1
             AND vb.date = $2
             AND vb.start_time < $3
             AND vb.end_time   > $4
         )
         AND u.id NOT IN (
           SELECT ua.user_id
           FROM user_absences ua
           WHERE ua.company_id = $1
             AND ua.absence_date = $2
         )
       ORDER BY u.name`,
      [req.user.company_id, date, end_time, start_time]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/users/colleagues — utenti attivi della propria società (accessibile a tutti)
router.get('/colleagues', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role FROM users
       WHERE company_id = $1 AND is_active = true AND role = 'user'
       ORDER BY name`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/users
router.get('/', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    let query, params;

    if (req.user.role === 'superadmin') {
      const { company_id } = req.query;
      if (company_id) {
        query  = `SELECT u.id, u.company_id, u.email, u.name, u.role, u.is_active, u.photo_url, u.created_at,
                         c.name AS company_name
                  FROM users u LEFT JOIN companies c ON u.company_id = c.id
                  WHERE u.company_id = $1 ORDER BY u.name`;
        params = [parseInt(company_id)];
      } else {
        query  = `SELECT u.id, u.company_id, u.email, u.name, u.role, u.is_active, u.photo_url, u.created_at,
                         c.name AS company_name
                  FROM users u LEFT JOIN companies c ON u.company_id = c.id
                  ORDER BY c.name, u.name`;
        params = [];
      }
    } else {
      query  = `SELECT u.id, u.company_id, u.email, u.name, u.role, u.is_active, u.photo_url, u.created_at,
                       c.name AS company_name
                FROM users u LEFT JOIN companies c ON u.company_id = c.id
                WHERE u.company_id = $1 AND u.role <> 'superadmin' ORDER BY u.name`;
      params = [req.user.company_id];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/users
router.post('/', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { email, name, role, password, company_id } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name, password sono obbligatori' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
    }

    const cid = req.user.role === 'superadmin' && company_id
      ? parseInt(company_id)
      : req.user.company_id;

    const allowedRoles = req.user.role === 'superadmin'
      ? ['superadmin', 'admin', 'user']
      : ['admin', 'user'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    const hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    // Seat check applies to everyone, including superadmin. To add users
    // beyond max_seats the superadmin must first raise the company's seat limit.
    const check = await checkSeatAvailability(client, cid);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: check.code, reason: check.reason, used: check.used, max: check.max });
    }

    const result = await client.query(
      `INSERT INTO users (company_id, email, password_hash, name, role, is_active, status)
       VALUES ($1, $2, $3, $4, $5, true, 'ACTIVE')
       RETURNING id, company_id, email, name, role, is_active, status, photo_url, created_at`,
      [cid, email.toLowerCase().trim(), hash, name, userRole]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Email già in uso' });
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/users/invite — creates user with status='INVITED' and sends email
router.post('/invite', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { email, name, role, company_id } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email e name obbligatori' });

    const cid = req.user.role === 'superadmin' && company_id
      ? parseInt(company_id)
      : req.user.company_id;

    const allowedRoles = req.user.role === 'superadmin'
      ? ['superadmin', 'admin', 'user']
      : ['admin', 'user'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    await client.query('BEGIN');

    const check = await checkSeatAvailability(client, cid);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: check.code, reason: check.reason, used: check.used, max: check.max });
    }

    // Placeholder password — the user sets a real one when accepting the invite.
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    const userRow = await client.query(
      `INSERT INTO users (company_id, email, password_hash, name, role, is_active, status)
       VALUES ($1, $2, $3, $4, $5, false, 'INVITED')
       RETURNING id, company_id, email, name, role, is_active, status, created_at`,
      [cid, email.toLowerCase().trim(), placeholderHash, name, userRole]
    );

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 86400 * 1000); // 7 days
    await client.query(
      `INSERT INTO user_invites (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userRow.rows[0].id, token, expires]
    );

    // Send the invite email; if SMTP fails, roll back so no orphaned seat is consumed.
    const companyRow = await client.query('SELECT name FROM companies WHERE id = $1', [cid]);
    const companyName = companyRow.rows[0]?.name ?? 'StockSimple';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    const acceptUrl   = `${frontendUrl}/accept-invite?token=${token}`;

    try {
      await sendCompanyEmail(cid, {
        to: email,
        subject: `Invito a ${companyName}`,
        text: `Ciao ${name},\n\nSei stato invitato a ${companyName}. Clicca il link per impostare la tua password e accedere:\n${acceptUrl}\n\nIl link scade tra 7 giorni.`,
        html: `<p>Ciao ${name},</p><p>Sei stato invitato a <strong>${companyName}</strong>. Clicca il link per impostare la tua password e accedere:</p><p><a href="${acceptUrl}">${acceptUrl}</a></p><p>Il link scade tra 7 giorni.</p>`,
      });
    } catch (mailErr) {
      await client.query('ROLLBACK');
      const code = mailErr.code === 'SMTP_NOT_CONFIGURED' ? 'SMTP_NOT_CONFIGURED' : 'SMTP_SEND_FAILED';
      return res.status(400).json({ error: code, reason: mailErr.message });
    }

    await client.query('COMMIT');
    res.status(201).json({ ...userRow.rows[0], invited: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Email già in uso' });
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/users/seat-usage — current company's seat consumption (admin/superadmin)
router.get('/seat-usage', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const cid = req.user.role === 'superadmin' && req.query.company_id
      ? parseInt(req.query.company_id)
      : req.user.company_id;
    const usage = await getSeatUsage(cid);
    if (!usage) return res.status(404).json({ error: 'Nessuna licenza per questa company' });
    res.json(usage);
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put('/:id', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const target = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = target.rows[0];

    if (req.user.role !== 'superadmin' && u.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const { name, email, role, is_active, password } = req.body;
    const allowedRoles = req.user.role === 'superadmin'
      ? ['superadmin', 'admin', 'user']
      : ['admin', 'user'];
    const userRole = allowedRoles.includes(role) ? role : u.role;

    let hash = u.password_hash;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
      }
      hash = await bcrypt.hash(password, 10);
    }

    const newEmail  = email ? email.toLowerCase().trim() : u.email;
    const newActive = is_active ?? u.is_active;
    const newStatus = newActive ? 'ACTIVE' : 'INACTIVE';
    const reactivating = !u.is_active && newActive;

    await client.query('BEGIN');

    // Reactivating a user consumes a seat — must pass the entitlement check.
    if (reactivating) {
      const check = await checkSeatAvailability(client, u.company_id);
      if (!check.ok) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: check.code, reason: check.reason, used: check.used, max: check.max });
      }
    }

    const result = await client.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, is_active = $4, status = $5, password_hash = $6
       WHERE id = $7
       RETURNING id, company_id, email, name, role, is_active, status, photo_url, created_at`,
      [name ?? u.name, newEmail, userRole, newActive, newStatus, hash, req.params.id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Email già in uso' });
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/users/:id/reset-password — admin generates a reset link for a user
router.post('/:id/reset-password', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const target = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });

    if (req.user.role !== 'superadmin' && target.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 86400 * 1000); // 24 hours

    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, req.params.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    const resetUrl    = `${frontendUrl}/reset-password?token=${token}`;

    res.json({ resetUrl, message: 'Link di reset generato (valido 24 ore)' });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Non puoi eliminare il tuo account' });
    }

    const target = await db.query('SELECT company_id FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });

    if (req.user.role !== 'superadmin' && target.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/users/:id/photo — upload profile photo
router.post('/:id/photo', requireAuth.requireRole('admin', 'superadmin'), uploadPhoto.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const target = await db.query('SELECT company_id, photo_url FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows.length) {
      fs.unlink(path.join(uploadDir(), req.file.filename), () => {});
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.user.role !== 'superadmin' && target.rows[0].company_id !== req.user.company_id) {
      fs.unlink(path.join(uploadDir(), req.file.filename), () => {});
      return res.status(403).json({ error: 'Accesso negato' });
    }

    if (target.rows[0].photo_url) {
      const oldPath = path.join(uploadDir(), path.basename(target.rows[0].photo_url));
      fs.unlink(oldPath, () => {});
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    await db.query('UPDATE users SET photo_url = $1 WHERE id = $2', [photoUrl, req.params.id]);
    res.json({ photo_url: photoUrl });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id/photo
router.delete('/:id/photo', requireAuth.requireRole('admin', 'superadmin'), async (req, res, next) => {
  try {
    const target = await db.query('SELECT company_id, photo_url FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });
    if (req.user.role !== 'superadmin' && target.rows[0].company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    if (target.rows[0].photo_url) {
      const oldPath = path.join(uploadDir(), path.basename(target.rows[0].photo_url));
      fs.unlink(oldPath, () => {});
    }
    await db.query('UPDATE users SET photo_url = NULL WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
