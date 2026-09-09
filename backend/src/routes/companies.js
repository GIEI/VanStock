const express     = require('express');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const { v4: uuidv4 } = require('uuid');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { getCompanyFeatures } = require('../services/features');

const router = express.Router();

// All company routes require superadmin
router.use(requireAuth, requireAuth.requireRole('superadmin'));

const uploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Multer config for logo uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Multer config for Word template uploads
const templateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir()),
  filename: (_req, _file, cb) => cb(null, `template_${uuidv4()}.docx`),
});
const uploadTemplate = multer({
  storage: templateStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.docx') cb(null, true);
    else cb(new Error('Only .docx files are allowed'));
  },
});

// GET /api/companies
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*, COUNT(u.id)::int AS user_count
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/companies
router.post('/', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, plan_type, max_seats, expires_at } = req.body;
    if (!name) return res.status(400).json({ error: 'name è obbligatorio' });

    const VALID_PLANS = ['BASIC', 'PRO', 'ENTERPRISE'];
    const plan = VALID_PLANS.includes(plan_type) ? plan_type : 'BASIC';
    const seats = (Number.isInteger(max_seats) && max_seats >= 0) ? max_seats : 5;

    await client.query('BEGIN');
    const company = await client.query(
      'INSERT INTO companies (name) VALUES ($1) RETURNING *',
      [name]
    );
    const sub = await client.query(
      `INSERT INTO subscriptions (company_id, plan_type, max_seats, expires_at, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING plan_type, max_seats, expires_at, status`,
      [company.rows[0].id, plan, seats, expires_at ?? null]
    );
    await client.query('COMMIT');

    res.status(201).json({ ...company.rows[0], subscription: sub.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/companies/:id
router.put('/:id', async (req, res, next) => {
  const ALLOWED_CURRENCIES = ['EUR','USD','GBP','JPY','RUB','CNY'];
  try {
    const { name, currency } = req.body;
    const safeCurrency = ALLOWED_CURRENCIES.includes(currency) ? currency : null;
    const result = await db.query(
      `UPDATE companies
       SET name     = $1,
           currency = COALESCE($2, currency)
       WHERE id = $3
       RETURNING *`,
      [name, safeCurrency, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Company not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/companies/:id/features
router.get('/:id/features', async (req, res, next) => {
  try {
    const companyId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(companyId)) return res.status(400).json({ error: 'Company non valida' });
    const company = await db.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (!company.rows.length) return res.status(404).json({ error: 'Company non trovata' });
    res.json(await getCompanyFeatures(companyId));
  } catch (err) { next(err); }
});

// PUT /api/companies/:id/features/:featureKey
router.put('/:id/features/:featureKey', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const companyId = Number.parseInt(req.params.id, 10);
    const { enabled, reason } = req.body;
    if (!Number.isInteger(companyId)) return res.status(400).json({ error: 'Company non valida' });
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled deve essere booleano' });
    if (reason !== undefined && (typeof reason !== 'string' || reason.length > 1000)) {
      return res.status(400).json({ error: 'reason non valida' });
    }

    await client.query('BEGIN');
    const feature = await client.query('SELECT feature_key FROM features WHERE feature_key = $1', [req.params.featureKey]);
    if (!feature.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Feature non trovata' });
    }
    const company = await client.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (!company.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company non trovata' });
    }
    const result = await client.query(
      `INSERT INTO company_features (company_id, feature_key, enabled, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, feature_key) DO UPDATE
         SET enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING *`,
      [companyId, req.params.featureKey, enabled, req.user.id]
    );
    await client.query(
      `INSERT INTO company_feature_audit_log (company_id, feature_key, enabled, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, req.params.featureKey, enabled, req.user.id, reason?.trim() || null]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/companies/:id/logo
router.post('/:id/logo', upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const logoUrl = `/uploads/${req.file.filename}`;
    const result  = await db.query(
      'UPDATE companies SET logo_url = $1 WHERE id = $2 RETURNING *',
      [logoUrl, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Company not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/companies/:id/template — upload a Word (.docx) report template
router.post('/:id/template', uploadTemplate.single('template'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete old template file if one exists
    const existing = await db.query('SELECT word_template_url FROM companies WHERE id = $1', [req.params.id]);
    if (existing.rows.length && existing.rows[0].word_template_url) {
      const oldPath = path.join(uploadDir(), path.basename(existing.rows[0].word_template_url));
      try { fs.unlinkSync(oldPath); } catch (_) {}
    }

    const templateUrl = `/uploads/${req.file.filename}`;
    const result = await db.query(
      'UPDATE companies SET word_template_url = $1 WHERE id = $2 RETURNING *',
      [templateUrl, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Company not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/companies/:id/template — remove the Word template
router.delete('/:id/template', async (req, res, next) => {
  try {
    const existing = await db.query('SELECT word_template_url FROM companies WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Company not found' });

    if (existing.rows[0].word_template_url) {
      const filePath = path.join(uploadDir(), path.basename(existing.rows[0].word_template_url));
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    await db.query('UPDATE companies SET word_template_url = NULL WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM companies WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Company not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
