const path     = require('path');
const fs       = require('fs');

// Dotenv configuration: look in current dir, then in project root
const localEnv = path.join(process.cwd(), '.env');
const rootEnv  = path.join(process.cwd(), '..', '.env');

if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
  console.log('[env] Loading configuration from project root .env');
} else {
  require('dotenv').config(); // default fallback
}
const express  = require('express');
const cors     = require('cors');

const productsRouter   = require('./routes/products');
const movementsRouter  = require('./routes/movements');
const locationsRouter  = require('./routes/locations');
const dashboardRouter  = require('./routes/dashboard');
const authRouter       = require('./routes/auth');
const companiesRouter  = require('./routes/companies');
const featuresRouter   = require('./routes/features');
const usersRouter      = require('./routes/users');
const subscriptionsRouter = require('./routes/subscriptions');
const smtpSettingsRouter  = require('./routes/smtp-settings');
const invitesRouter       = require('./routes/invites');
const clientsRouter    = require('./routes/clients');
const jobsRouter       = require('./routes/jobs');
const pushRouter       = require('./routes/push');
const notificationsRouter = require('./routes/notifications');
const reportsRouter    = require('./routes/reports');
const analyticsRouter  = require('./routes/analytics');
const suppliersRouter       = require('./routes/suppliers');
const marginsRouter         = require('./routes/margins');
const purchaseOrdersRouter   = require('./routes/purchase-orders');
const vehicleBookingsRouter  = require('./routes/vehicle-bookings');
const dataTransferRouter     = require('./routes/data-transfer');
const backupsRouter          = require('./routes/backups');
const timelineRouter         = require('./routes/timeline');
const badgeRouter            = require('./routes/badge');
const timesheetRouter       = require('./routes/timesheet');
const inventoryRouter       = require('./routes/inventory');
const auditRouter            = require('./routes/audit');
const adminRouter            = require('./routes/admin');
const systemRouter           = require('./routes/system');
const userAbsencesRouter     = require('./routes/user-absences');
const attendanceRouter       = require('./routes/attendance');
const attendanceV2Router     = require('./routes/attendance-v2');
const adminAttendanceRouter  = require('./routes/admin-attendance');
const attendanceAnomaliesScheduler = require('./utils/attendance-anomalies');
const integrationsRouter           = require('./routes/integrations');
const integrationsV1Router         = require('./routes/integrations-v1');
const autoBackupScheduler          = require('./utils/auto-backup');
const pushHelper       = require('./notification-helper');
const { logError }     = require('./utils/logger');
const seedAdmin        = require('./scripts/seed-admin');

// Ensure mandatory environment variables are present
const MANDATORY_VARS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = MANDATORY_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('[FATAL] Missing mandatory environment variables:', missing.join(', '));
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : null;
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (!allowedOrigins || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos with security headers
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const thumbDir  = path.join(uploadDir, 'thumbs');
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

// Lazy thumbnail generation. /uploads/thumb/<filename> returns a 300x300 webp
// generated on first request and cached on disk. Falls back to the original
// file if sharp/conversion fails so the UI never breaks.
app.get('/uploads/thumb/:filename', async (req, res, next) => {
  try {
    const safe = path.basename(req.params.filename);
    const original = path.join(uploadDir, safe);
    if (!fs.existsSync(original)) return res.status(404).end();

    const thumbName = safe.replace(/\.[^.]+$/, '') + '.webp';
    const thumbPath = path.join(thumbDir, thumbName);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (!fs.existsSync(thumbPath)) {
      let sharp;
      try { sharp = require('sharp'); }
      catch { return res.sendFile(original); }
      await sharp(original).resize(300, 300, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toFile(thumbPath);
    }
    return res.sendFile(thumbPath);
  } catch (err) { next(err); }
});

app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(uploadDir, {
  index: false,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow images to be loaded by the frontend
  }
}));

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/invites', invitesRouter);

// Response monitoring middleware for error logging
app.use((req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function(body) {
    // 401/403 are expected for unauthenticated/unauthorized requests — not application errors
    // 409 is a business logic validation (e.g., user absence) — not an error
    if (res.statusCode >= 400 && res.statusCode !== 401 && res.statusCode !== 403 && res.statusCode !== 409) {
      logError(body, req, res.statusCode);
    }
    return originalJson.call(this, body);
  };

  res.send = function(body) {
    if (res.statusCode >= 400 && res.statusCode !== 401 && res.statusCode !== 403 && res.statusCode !== 409) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        logError(body.toString(), req, res.statusCode);
      }
    }
    return originalSend.call(this, body);
  };

  next();
});

// Protected routes
app.use('/api/integrations/v1', integrationsV1Router);
app.use('/api/products',  productsRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/features',  featuresRouter);
app.use('/api/users',     usersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/companies/:companyId/smtp', smtpSettingsRouter);
app.use('/api/clients',   clientsRouter);
app.use('/api/jobs',      jobsRouter);
app.use('/api/push',      pushRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports',   reportsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/margins',         marginsRouter);
app.use('/api/purchase-orders',   purchaseOrdersRouter);
app.use('/api/vehicle-bookings',  vehicleBookingsRouter);
app.use('/api/data-transfer',     dataTransferRouter);
app.use('/api/backups',           backupsRouter);
app.use('/api/timeline',          timelineRouter);
app.use('/api/badge',             badgeRouter);
app.use('/api/timesheet',         timesheetRouter);
app.use('/api/inventory',         inventoryRouter);
app.use('/api/audit',             auditRouter);
app.use('/api/admin',             adminRouter);
app.use('/api/system',            systemRouter);
app.use('/api/user-absences',     userAbsencesRouter);
app.use('/api/attendance',        attendanceRouter);
app.use('/api/attendance-v2',     attendanceV2Router);
app.use('/api/admin/attendance',  adminAttendanceRouter);
app.use('/api/integrations',      integrationsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;

  // Log the real error (with stack trace if >= 500) to our log file
  logError(err, req, status);

  // Determine what to show to the client
  let message = err.message || 'Internal server error';
  if (process.env.NODE_ENV === 'production' && status >= 500) {
    message = 'Si è verificato un errore interno al server.';
  }

  res.status(status).json({ error: message });
});

async function ensureCompanyFeaturesMigration() {
  const database = require('./db');
  for (const migration of [
    'migrate_v36_company_features.sql',
    'migrate_v37_user_absences.sql',
    'migrate_v38_job_required_materials.sql',
    'migrate_v39_movement_batch_allocations.sql',
    'migrate_v40_integration_outbox.sql',
    'migrate_v41_integration_api_keys.sql',
    'migrate_v42_integration_inbox.sql',
    'migrate_v43_integration_inbox_worker.sql',
    'migrate_v44_integration_webhooks.sql',
    'migrate_v45_integration_entity_mappings.sql',
    'migrate_v46_product_category_references.sql',
  ]) {
    const migrationPath = path.join(__dirname, '../../db', migration);
    if (fs.existsSync(migrationPath)) await database.query(fs.readFileSync(migrationPath, 'utf8'));
  }
}

async function startServer() {
  await ensureCompanyFeaturesMigration();
  return app.listen(PORT, '0.0.0.0', async () => {
  console.log(`StockSimple backend listening on port ${PORT}`);
  await seedAdmin();
  // Ensure push tables exist and VAPID keys are ready
  const db = require('./db');
  const fs = require('fs');
  const migPath = require('path').join(__dirname, '../../db/migrate_v6_push.sql');
  if (fs.existsSync(migPath)) {
    await db.query(fs.readFileSync(migPath, 'utf8')).catch(() => {});
  }
  await pushHelper.getVapidKeys().catch(() => {});
  // Ensure daily_reports table exists
  const migV7Path = require('path').join(__dirname, '../../db/migrate_v7_daily_reports.sql');
  if (fs.existsSync(migV7Path)) {
    await db.query(fs.readFileSync(migV7Path, 'utf8')).catch(() => {});
  }
  // Ensure suppliers tables exist
  const migV8Path = require('path').join(__dirname, '../../db/migrate_v8_suppliers.sql');
  if (fs.existsSync(migV8Path)) {
    await db.query(fs.readFileSync(migV8Path, 'utf8')).catch(() => {});
  }
  // Ensure purchase_price column exists on movements
  const migV9Path = require('path').join(__dirname, '../../db/migrate_v9_purchase_price.sql');
  if (fs.existsSync(migV9Path)) {
    await db.query(fs.readFileSync(migV9Path, 'utf8')).catch(() => {});
  }
  // Ensure purchase_orders tables exist
  const migV10Path = require('path').join(__dirname, '../../db/migrate_v10_purchase_orders.sql');
  if (fs.existsSync(migV10Path)) {
    await db.query(fs.readFileSync(migV10Path, 'utf8')).catch(() => {});
  }
  // Ensure location status column exists
  const migV11Path = require('path').join(__dirname, '../../db/migrate_v11_location_status.sql');
  if (fs.existsSync(migV11Path)) {
    await db.query(fs.readFileSync(migV11Path, 'utf8')).catch(() => {});
  }
  // Ensure vehicle_bookings table exists
  const migV12Path = require('path').join(__dirname, '../../db/migrate_v12_vehicle_bookings.sql');
  if (fs.existsSync(migV12Path)) {
    await db.query(fs.readFileSync(migV12Path, 'utf8')).catch(() => {});
  }
  // Ensure job workflow columns and photos table exist
  const migV13Path = require('path').join(__dirname, '../../db/migrate_v13_job_workflow.sql');
  if (fs.existsSync(migV13Path)) {
    await db.query(fs.readFileSync(migV13Path, 'utf8')).catch(() => {});
  }
  // Ensure work shifts table exists
  const migV18Path = require('path').join(__dirname, '../../db/migrate_v18_work_shifts.sql');
  if (fs.existsSync(migV18Path)) {
    await db.query(fs.readFileSync(migV18Path, 'utf8')).catch(() => {});
  }
  // Ensure word_template table exists
  const migV19Path = require('path').join(__dirname, '../../db/migrate_v19_word_template.sql');
  if (fs.existsSync(migV19Path)) {
    await db.query(fs.readFileSync(migV19Path, 'utf8')).catch(() => {});
  }
  // Ensure geolocation columns exist on jobs table
  const migV20Path = require('path').join(__dirname, '../../db/migrate_v20_geolocation.sql');
  if (fs.existsSync(migV20Path)) {
    await db.query(fs.readFileSync(migV20Path, 'utf8')).catch(() => {});
  }
  // Ensure geolocation columns exist on job_photos table
  const migV21Path = require('path').join(__dirname, '../../db/migrate_v21_job_photos_geolocation.sql');
  if (fs.existsSync(migV21Path)) {
    await db.query(fs.readFileSync(migV21Path, 'utf8')).catch(() => {});
  }
  // Ensure attendance_v2 tables and view exist
  const migV22Path = require('path').join(__dirname, '../../db/migrate_v22_attendance_v2.sql');
  if (fs.existsSync(migV22Path)) {
    await db.query(fs.readFileSync(migV22Path, 'utf8')).catch((err) => {
      console.error('[migrate v22] error:', err.message);
    });
  }
  // Ensure status column exists on movements (pending/confirmed)
  const migV24Path = require('path').join(__dirname, '../../db/migrate_v24_movement_status.sql');
  if (fs.existsSync(migV24Path)) {
    await db.query(fs.readFileSync(migV24Path, 'utf8')).catch((err) => {
      console.error('[migrate v24] error:', err.message);
    });
  }
  // Ensure subscriptions table exists (seat-based licensing)
  const migV25Path = require('path').join(__dirname, '../../db/migrate_v25_subscriptions.sql');
  if (fs.existsSync(migV25Path)) {
    await db.query(fs.readFileSync(migV25Path, 'utf8')).catch((err) => {
      console.error('[migrate v25] error:', err.message);
    });
  }
  // Ensure status column exists on users (ACTIVE/INACTIVE/INVITED)
  const migV26Path = require('path').join(__dirname, '../../db/migrate_v26_users_status.sql');
  if (fs.existsSync(migV26Path)) {
    await db.query(fs.readFileSync(migV26Path, 'utf8')).catch((err) => {
      console.error('[migrate v26] error:', err.message);
    });
  }
  // Ensure company_smtp_settings table exists
  const migV27Path = require('path').join(__dirname, '../../db/migrate_v27_company_smtp.sql');
  if (fs.existsSync(migV27Path)) {
    await db.query(fs.readFileSync(migV27Path, 'utf8')).catch((err) => {
      console.error('[migrate v27] error:', err.message);
    });
  }
  // Ensure user_invites table exists
  const migV28Path = require('path').join(__dirname, '../../db/migrate_v28_user_invites.sql');
  if (fs.existsSync(migV28Path)) {
    await db.query(fs.readFileSync(migV28Path, 'utf8')).catch((err) => {
      console.error('[migrate v28] error:', err.message);
    });
  }
  // Ensure media_type column exists on job_photos (image|video)
  const migV29Path = require('path').join(__dirname, '../../db/migrate_v29_job_photos_media_type.sql');
  if (fs.existsSync(migV29Path)) {
    await db.query(fs.readFileSync(migV29Path, 'utf8')).catch((err) => {
      console.error('[migrate v29] error:', err.message);
    });
  }
  const migV30Path = require('path').join(__dirname, '../../db/migrate_v30_job_product_missing.sql');
  if (fs.existsSync(migV30Path)) {
    await db.query(fs.readFileSync(migV30Path, 'utf8')).catch((err) => {
      console.error('[migrate v30] error:', err.message);
    });
  }
  // Add 'signed' to job_state_changes.change_type CHECK constraint
  const migV31Path = require('path').join(__dirname, '../../db/migrate_v31_job_state_changes_signed.sql');
  if (fs.existsSync(migV31Path)) {
    await db.query(fs.readFileSync(migV31Path, 'utf8')).catch((err) => {
      console.error('[migrate v31] error:', err.message);
    });
  }
  // Create notifications table (in-app notification center)
  const migV33Path = require('path').join(__dirname, '../../db/migrate_v33_notifications.sql');
  if (fs.existsSync(migV33Path)) {
    await db.query(fs.readFileSync(migV33Path, 'utf8')).catch((err) => {
      console.error('[migrate v33] error:', err.message);
    });
  }
  // Freeze unit cost/price on movements at transaction time (historical margins)
  const migV34Path = require('path').join(__dirname, '../../db/migrate_v34_movement_cost_snapshot.sql');
  if (fs.existsSync(migV34Path)) {
    await db.query(fs.readFileSync(migV34Path, 'utf8')).catch((err) => {
      console.error('[migrate v34] error:', err.message);
    });
  }
  // Add 'DISMISS_ANOMALY' to attendance_audit_log.action CHECK constraint
  const migV35Path = require('path').join(__dirname, '../../db/migrate_v35_attendance_dismiss_anomaly.sql');
  if (fs.existsSync(migV35Path)) {
    await db.query(fs.readFileSync(migV35Path, 'utf8')).catch((err) => {
      console.error('[migrate v35] error:', err.message);
    });
  }
  // Start the attendance anomalies scheduler (flags days never closed)
  attendanceAnomaliesScheduler.start();
  // Start the auto-backup scheduler (pg_dump + uploads tar every 6h)
  autoBackupScheduler.start();
  // Ensure snapshot column exists on daily_reports
  await db.query(`ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS snapshot JSONB`).catch(console.error);
  // Ensure track_lots column exists on purchase_order_items
  await db.query(`ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS track_lots BOOLEAN NOT NULL DEFAULT FALSE`).catch(console.error);
  });
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('[migration v36] Startup aborted:', err.message);
    process.exit(1);
  });
}

module.exports = { app, startServer, ensureCompanyFeaturesMigration };
