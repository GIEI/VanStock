const express     = require('express');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const { v4: uuidv4 } = require('uuid');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { notifyUsers, notifyRoles } = require('../notification-helper');
const { checkMediaQuota } = require('../services/media-limits');
const { confirmPendingJobConsumption } = require('../services/inventory-service');

// Multer for job photos and short videos (es. 5s da app Android)
const photoStorage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `job_${uuidv4()}${ext}`);
  },
});
const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      return cb(null, true);
    }
    // Alcuni device inviano application/octet-stream con estensione .mp4
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (['.mp4', '.webm', '.mov', '.mkv', '.3gp'].includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Sono ammessi solo file immagine o video'));
  },
});

// Multer for audio messages
const audioStorage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio_${uuidv4()}${ext}`);
  },
});
const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();
router.use(requireAuth);
const adminOnly = requireAuth.requireRole('admin', 'superadmin');

async function validateRequiredMaterials(materials, companyId) {
  if (materials === undefined) return [];
  if (!Array.isArray(materials)) throw Object.assign(new Error('required_materials deve essere un array'), { status: 400 });
  const normalized = materials.map(item => ({ product_id: Number(item?.product_id), quantity_required: Number(item?.quantity_required) }));
  if (normalized.some(item => !Number.isInteger(item.product_id) || item.product_id <= 0 || !Number.isFinite(item.quantity_required) || item.quantity_required <= 0)) {
    throw Object.assign(new Error('Materiali richiesti non validi'), { status: 400 });
  }
  if (new Set(normalized.map(item => item.product_id)).size !== normalized.length) {
    throw Object.assign(new Error('Un prodotto può essere richiesto una sola volta'), { status: 400 });
  }
  if (!normalized.length) return normalized;
  const products = await db.query('SELECT id FROM products WHERE company_id = $1 AND id = ANY($2)', [companyId, normalized.map(item => item.product_id)]);
  if (products.rows.length !== normalized.length) throw Object.assign(new Error('Uno o più prodotti non appartengono alla Company'), { status: 400 });
  return normalized;
}

async function replaceRequiredMaterials(client, jobId, materials) {
  await client.query('DELETE FROM job_required_materials WHERE job_id = $1', [jobId]);
  for (const item of materials) {
    await client.query('INSERT INTO job_required_materials (job_id, product_id, quantity_required) VALUES ($1, $2, $3)', [jobId, item.product_id, item.quantity_required]);
  }
}

// GET /api/jobs/my — lavori assegnati all'utente corrente (tutti i ruoli)
router.get('/my', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT j.*,
              c.name  AS client_name,
              c.phone AS client_phone,
              u.name  AS assigned_to_name,
              COUNT(m.id)::int AS movement_count
       FROM jobs j
       LEFT JOIN clients   c ON c.id = j.client_id
       LEFT JOIN users     u ON u.id = j.assigned_to
       LEFT JOIN movements m ON m.job_id = j.id
       WHERE j.company_id = $1 AND j.assigned_to = $2
         AND j.status NOT IN ('completato', 'annullato')
       GROUP BY j.id, c.name, c.phone, u.name
       ORDER BY j.scheduled_date ASC NULLS LAST, j.created_at DESC`,
      [req.user.company_id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// PATCH /api/jobs/:id/start — operaio arriva sul posto, registra timestamp di inizio
router.patch('/:id/start', async (req, res, next) => {
  try {
    const { latitude, longitude, location_address } = req.body;

    const check = await db.query(
      'SELECT id, assigned_to, status FROM jobs WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });

    const job     = check.rows[0];
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && job.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    if (!['in_corso'].includes(job.status)) {
      return res.status(400).json({ error: 'Il lavoro deve essere in stato "in corso" per registrare l\'arrivo' });
    }

    const result = await db.query(
      `UPDATE jobs SET started_at = COALESCE(started_at, NOW()) WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    // Register "arrived" state change with geolocation
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const addr = location_address || null;

    await db.query(
      `INSERT INTO job_state_changes (company_id, job_id, change_type, latitude, longitude, location_address, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.company_id, req.params.id, 'arrived', lat, lng, addr, req.user.id]
    );

    res.json(result.rows[0]);

    if (!isAdmin) {
      notifyRoles(req.user.company_id, ['admin', 'superadmin'], {
        type:  'job_status',
        title: `Lavoro aggiornato: ${result.rows[0].title}`,
        body:  'Il tecnico è arrivato sul posto',
        url:   `/jobs/${result.rows[0].id}`,
        data:  { jobId: result.rows[0].id },
      });
    }
  } catch (err) { next(err); }
});

// PATCH /api/jobs/:id/status — cambia stato (assegnato o admin)
// When accepting (status='in_corso'), body must include vehicle_id, vehicle_start_time, vehicle_end_time
// to atomically create a vehicle booking.
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, vehicle_id, vehicle_start_time, vehicle_end_time, latitude, longitude, location_address, product_missing, product_missing_note } = req.body;
    const validStatuses = ['aperto', 'in_corso', 'completato', 'annullato'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    // Verifica che il job appartenga alla stessa società
    const check = await db.query(
      'SELECT id, assigned_to, scheduled_date FROM jobs WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });

    // Solo l'assegnato o un admin possono cambiare stato
    const job = check.rows[0];
    const isAdmin    = ['admin', 'superadmin'].includes(req.user.role);
    const isAssigned = job.assigned_to === req.user.id;
    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo lavoro' });
    }

    // When accepting: a vehicle must be selected with time range
    if (status === 'in_corso') {
      if (!vehicle_id || !vehicle_start_time || !vehicle_end_time) {
        return res.status(400).json({ error: 'Seleziona un furgone e gli orari di prenotazione per accettare il lavoro' });
      }

      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(vehicle_start_time) || !timeRegex.test(vehicle_end_time)) {
        return res.status(400).json({ error: 'Formato orario non valido (usa HH:MM)' });
      }

      // Verify van belongs to company
      const vanCheck = await db.query(
        `SELECT id FROM locations WHERE id = $1 AND company_id = $2 AND type = 'van'`,
        [vehicle_id, req.user.company_id]
      );
      if (!vanCheck.rows.length) {
        return res.status(404).json({ error: 'Furgone non trovato' });
      }

      // Determine booking date (use job's scheduled_date or today)
      const bookingDate = job.scheduled_date
        ? job.scheduled_date.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      // Check if this user already has a booking for that date+time range (any van)
      const userBooking = await db.query(
        `SELECT vb.id, vb.location_id, l.name AS van_name
         FROM vehicle_bookings vb
         JOIN locations l ON l.id = vb.location_id
         WHERE vb.company_id = $1 AND vb.booked_by = $2 AND vb.date = $3
           AND vb.start_time < $4 AND vb.end_time > $5
         LIMIT 1`,
        [req.user.company_id, req.user.id, bookingDate, vehicle_end_time, vehicle_start_time]
      );

      if (userBooking.rows.length) {
        const ub = userBooking.rows[0];
        if (parseInt(ub.location_id) !== parseInt(vehicle_id)) {
          // User already booked a DIFFERENT van in this time range — block the action
          return res.status(409).json({
            error: `Hai già prenotato "${ub.van_name}" per questo orario`,
          });
        }
      }

      // Check if the selected van is available (no overlapping bookings by other users)
      const vanConflict = await db.query(
        `SELECT id FROM vehicle_bookings
         WHERE location_id = $1 AND date = $2
           AND start_time < $3 AND end_time > $4
           AND (booked_by IS NULL OR booked_by <> $5)`,
        [vehicle_id, bookingDate, vehicle_end_time, vehicle_start_time, req.user.id]
      );
      if (vanConflict.rows.length) {
        return res.status(409).json({
          error: 'Il furgone non è più disponibile per questo orario',
        });
      }

      // Check if user already has a booking for this van (regardless of time overlap)
      const existingVanBooking = await db.query(
        `SELECT id, start_time, end_time FROM vehicle_bookings
         WHERE company_id = $1 AND location_id = $2 AND booked_by = $3 AND date = $4`,
        [req.user.company_id, vehicle_id, req.user.id, bookingDate]
      );

      if (existingVanBooking.rows.length) {
        // Extend existing booking: use min(start_time) and max(end_time)
        const existing = existingVanBooking.rows[0];
        const newStartTime = vehicle_start_time < existing.start_time ? vehicle_start_time : existing.start_time;
        const newEndTime = vehicle_end_time > existing.end_time ? vehicle_end_time : existing.end_time;

        await db.query(
          `UPDATE vehicle_bookings SET start_time = $1, end_time = $2
           WHERE id = $3`,
          [newStartTime, newEndTime, existing.id]
        );

        // Link this job to the booking (add job_id if not already set)
        await db.query(
          `INSERT INTO vehicle_bookings (company_id, location_id, job_id, date, start_time, end_time, booked_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.user.company_id, vehicle_id, req.params.id, bookingDate, vehicle_start_time, vehicle_end_time, req.user.id]
        );
      } else {
        // Create new booking
        await db.query(
          `INSERT INTO vehicle_bookings (company_id, location_id, job_id, date, start_time, end_time, booked_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.user.company_id, vehicle_id, req.params.id, bookingDate, vehicle_start_time, vehicle_end_time, req.user.id]
        );
      }
    }

    // When cancelling a job, delete all associated vehicle bookings
    if (status === 'annullato') {
      await db.query(
        `DELETE FROM vehicle_bookings WHERE job_id = $1`,
        [req.params.id]
      );
    }

    // Reset timestamps when job returns to open/planned status
    let startedAtValue;
    let completedAtValue;

    if (status === 'aperto' || status === 'pianificato') {
      startedAtValue = 'NULL';
      completedAtValue = 'NULL';
    } else if (status === 'completato') {
      startedAtValue = 'started_at';
      completedAtValue = "NOW()";
    } else {
      startedAtValue = 'started_at';
      completedAtValue = 'completed_at';
    }

    const productMissingValue = (status === 'in_corso' && product_missing === true) ? true : false;
    const productMissingNoteValue = productMissingValue ? (product_missing_note || null) : null;
    const result = await db.query(
      `UPDATE jobs SET status = $1, started_at = ${startedAtValue}, completed_at = ${completedAtValue}, product_missing = $3, product_missing_note = $4 WHERE id = $2 RETURNING *`,
      [status, req.params.id, productMissingValue, productMissingNoteValue]
    );

    // Register state change with geolocation
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const addr = location_address || null;

    // Map status to state change type (accept = in_corso, rejected = annullato, completed = completato, arrived = started)
    let changeType = 'completed';
    if (status === 'in_corso' && !result.rows[0].started_at) changeType = 'accept';
    else if (status === 'annullato' && result.rows[0].status !== 'annullato') changeType = 'rejected';
    else if (result.rows[0].started_at && !result.rows[0].created_at) changeType = 'arrived';

    await db.query(
      `INSERT INTO job_state_changes (company_id, job_id, change_type, latitude, longitude, location_address, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.company_id, req.params.id, changeType, lat, lng, addr, req.user.id]
    );

    // Attach vehicle booking info to response
    let booking = await db.query(
      `SELECT vb.*, l.name AS van_name, l.plate AS van_plate
       FROM vehicle_bookings vb
       JOIN locations l ON l.id = vb.location_id
       WHERE vb.job_id = $1
       ORDER BY vb.created_at DESC LIMIT 1`,
      [req.params.id]
    );


    res.json({ ...result.rows[0], vehicle_booking: booking.rows[0] || null });

    // Notify the other party about the status change
    const updatedJob = result.rows[0];
    const statusLabels = { aperto: 'Aperto', in_corso: 'In corso', completato: 'Completato', annullato: 'Annullato' };
    const statusPayload = {
      type:  'job_status',
      title: `Lavoro aggiornato: ${updatedJob.title}`,
      body:  `Nuovo stato: ${statusLabels[status] || status}`,
      url:   `/jobs/${updatedJob.id}`,
      data:  { jobId: updatedJob.id },
    };
    if (isAdmin) {
      if (updatedJob.assigned_to) notifyUsers(req.user.company_id, [updatedJob.assigned_to], statusPayload);
    } else {
      notifyRoles(req.user.company_id, ['admin', 'superadmin'], statusPayload);
    }

    // Notify admins if the technician flagged a missing product
    if (productMissingValue) {
      notifyRoles(req.user.company_id, ['admin', 'superadmin'], {
        type:  'product_missing',
        title: `Prodotto mancante: ${updatedJob.title}`,
        body:  productMissingNoteValue || 'Segnalato prodotto mancante per questo lavoro',
        url:   `/jobs/${updatedJob.id}`,
        data:  { jobId: updatedJob.id },
      });
    }
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Il furgone non è disponibile per il periodo selezionato' });
    }
    next(err);
  }
});

// PATCH /api/jobs/:id/clear-product-missing — admin rimuove il flag prodotto mancante
router.patch('/:id/clear-product-missing', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE jobs SET product_missing = FALSE, product_missing_note = NULL WHERE id = $1 AND company_id = $2 RETURNING *`,
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/jobs
router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, assigned_to, date_from, date_to, product_missing } = req.query;
    let conditions = ['j.company_id = $1'];
    let params     = [req.user.company_id];

    if (status)      { params.push(status);                 conditions.push(`j.status = $${params.length}`); }
    if (client_id)   { params.push(parseInt(client_id));    conditions.push(`j.client_id = $${params.length}`); }

    // Utenti con ruolo 'user' vedono solo i lavori assegnati a loro
    const effectiveAssignedTo = req.user.role === 'user' ? req.user.id : (assigned_to ? parseInt(assigned_to) : null);
    if (effectiveAssignedTo) { params.push(effectiveAssignedTo); conditions.push(`j.assigned_to = $${params.length}`); }
    if (date_from)       { params.push(date_from);              conditions.push(`j.scheduled_date >= $${params.length}`); }
    if (date_to)         { params.push(date_to);                conditions.push(`j.scheduled_date <= $${params.length}`); }
    if (product_missing === 'true') { conditions.push(`j.product_missing = TRUE`); }

    const result = await db.query(
      `SELECT j.*,
              c.name  AS client_name,
              c.phone AS client_phone,
              u.name  AS assigned_to_name,
              COUNT(m.id)::int AS movement_count
       FROM jobs j
       LEFT JOIN clients   c ON c.id = j.client_id
       LEFT JOIN users     u ON u.id = j.assigned_to
       LEFT JOIN movements m ON m.job_id = j.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY j.id, c.name, c.phone, u.name
       ORDER BY j.scheduled_date ASC NULLS LAST, j.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/jobs/:id  (dettaglio con movimenti)
router.get('/:id', async (req, res, next) => {
  try {
    const cid = req.user.company_id;

    const jobResult = await db.query(
      `SELECT j.*,
              c.name  AS client_name,
              c.phone AS client_phone,
              c.email AS client_email,
              c.address AS client_address,
              u.name  AS assigned_to_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN users   u ON u.id = j.assigned_to
       WHERE j.id = $1 AND j.company_id = $2`,
      [req.params.id, cid]
    );
    if (!jobResult.rows.length) return res.status(404).json({ error: 'Job not found' });

    const movResult = await db.query(
      `SELECT m.*,
              p.name AS product_name, p.sku, p.unit,
              fl.name AS from_location_name,
              tl.name AS to_location_name
       FROM movements m
       JOIN products p ON m.product_id = p.id
       LEFT JOIN locations fl ON m.from_location_id = fl.id
       LEFT JOIN locations tl ON m.to_location_id   = tl.id
       WHERE m.job_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.id]
    );

    let bookingResult = await db.query(
      `SELECT vb.*, l.name AS van_name, l.plate AS van_plate, u.name AS booked_by_name
       FROM vehicle_bookings vb
       JOIN locations l ON l.id = vb.location_id
       LEFT JOIN users u ON u.id = vb.booked_by
       WHERE vb.job_id = $1
       ORDER BY vb.created_at DESC LIMIT 1`,
      [req.params.id]
    );

    // Prenotazioni create prima senza job_id (es. conflitto su INSERT DO NOTHING): collega in modo deterministico
    if (!bookingResult.rows.length) {
      const job = jobResult.rows[0];
      const scheduledDate = job.scheduled_date
        ? new Date(job.scheduled_date).toISOString().slice(0, 10)
        : null;
      if (scheduledDate && job.assigned_to) {
        const orphanCount = await db.query(
          `SELECT COUNT(*)::int AS c FROM vehicle_bookings
           WHERE company_id = $1 AND job_id IS NULL AND date = $2::date AND booked_by = $3`,
          [cid, scheduledDate, job.assigned_to]
        );
        if (orphanCount.rows[0].c === 1) {
          const pick = await db.query(
            `SELECT id FROM vehicle_bookings
             WHERE company_id = $1 AND job_id IS NULL AND date = $2::date AND booked_by = $3
             LIMIT 1`,
            [cid, scheduledDate, job.assigned_to]
          );
          if (pick.rows.length) {
            await db.query(
              'UPDATE vehicle_bookings SET job_id = $1 WHERE id = $2',
              [req.params.id, pick.rows[0].id]
            );
            bookingResult = await db.query(
              `SELECT vb.*, l.name AS van_name, l.plate AS van_plate, u.name AS booked_by_name
               FROM vehicle_bookings vb
               JOIN locations l ON l.id = vb.location_id
               LEFT JOIN users u ON u.id = vb.booked_by
               WHERE vb.job_id = $1
               ORDER BY vb.created_at DESC LIMIT 1`,
              [req.params.id]
            );
          }
        }
      }
    }

    // Stesso tecnico riusa un mezzo già prenotato per un altro lavoro (una sola riga booking, job_id ≠ questo job)
    if (!bookingResult.rows.length) {
      const job = jobResult.rows[0];
      if (job.status !== 'aperto') {
        const scheduledDate = job.scheduled_date
          ? new Date(job.scheduled_date).toISOString().slice(0, 10)
          : null;
        if (scheduledDate && job.assigned_to) {
          bookingResult = await db.query(
            `SELECT vb.*, l.name AS van_name, l.plate AS van_plate, u.name AS booked_by_name
             FROM vehicle_bookings vb
             JOIN locations l ON l.id = vb.location_id
             LEFT JOIN users u ON u.id = vb.booked_by
             WHERE vb.company_id = $1
               AND vb.booked_by = $2
               AND vb.date = $3::date
             ORDER BY vb.created_at DESC
             LIMIT 1`,
            [cid, job.assigned_to, scheduledDate]
          );
        }
      }
    }

    const photosResult = await db.query(
      `SELECT * FROM job_photos WHERE job_id = $1 ORDER BY type, created_at ASC`,
      [req.params.id]
    );
    const requiredMaterialsResult = await db.query(
      `SELECT jrm.product_id, jrm.quantity_required, p.name AS product_name, p.sku, p.unit
         FROM job_required_materials jrm
         JOIN products p ON p.id = jrm.product_id
        WHERE jrm.job_id = $1
        ORDER BY p.name`,
      [req.params.id]
    );

    res.json({
      ...jobResult.rows[0],
      movements:       movResult.rows,
      vehicle_booking: bookingResult.rows[0] || null,
      photos:          photosResult.rows,
      required_materials: requiredMaterialsResult.rows,
    });
  } catch (err) { next(err); }
});

// POST /api/jobs
router.post('/', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { title, description, address, client_id, assigned_to, scheduled_date, scheduled_time, scheduled_time_custom, status, priority } = req.body;
    const requiredMaterials = await validateRequiredMaterials(req.body.required_materials, req.user.company_id);
    if (!title) return res.status(400).json({ error: 'title è obbligatorio' });

    const validPriorities = ['bassa', 'normale', 'alta', 'urgente'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priorità non valida' });
    }

    const validTimes = ['morning', 'afternoon', 'all_day', 'custom'];
    if (scheduled_time && !validTimes.includes(scheduled_time)) {
      return res.status(400).json({ error: 'Orario non valido' });
    }

    // Validate custom time if scheduled_time is 'custom'
    if (scheduled_time === 'custom' && !scheduled_time_custom) {
      return res.status(400).json({ error: 'Orario personalizzato obbligatorio' });
    }

    // Check for user absence if both assigned_to and scheduled_date are provided
    if (assigned_to && scheduled_date) {
      const absenceCheck = await db.query(
        `SELECT id FROM user_absences
         WHERE user_id = $1 AND absence_date = $2 AND company_id = $3`,
        [parseInt(assigned_to), scheduled_date, req.user.company_id]
      );
      if (absenceCheck.rows.length > 0) {
        return res.status(409).json({ error: 'User has a registered absence on this date' });
      }
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO jobs (company_id, title, description, address, client_id, assigned_to, scheduled_date, scheduled_time, scheduled_time_custom, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        req.user.company_id,
        title,
        description    || null,
        address        || null,
        client_id      ? parseInt(client_id)   : null,
        assigned_to    ? parseInt(assigned_to) : null,
        scheduled_date || null,
        scheduled_time || 'all_day',
        (scheduled_time === 'custom' ? scheduled_time_custom : null) || null,
        status         || 'aperto',
        priority       || 'normale',
      ]
    );
    const job = result.rows[0];
    await replaceRequiredMaterials(client, job.id, requiredMaterials);
    await client.query('COMMIT');
    res.status(201).json(job);

    // Fire-and-forget push notifications to the assigned user
    if (job.assigned_to) {
      notifyUsers(req.user.company_id, [job.assigned_to], {
        type:  'job_assigned',
        title: 'Nuovo lavoro assegnato',
        body:  job.title,
        url:   `/jobs/${job.id}`,
        data:  { jobId: job.id },
      });
    }
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});

// PUT /api/jobs/:id
router.put('/:id', adminOnly, async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { title, description, address, client_id, assigned_to, scheduled_date, scheduled_time, scheduled_time_custom, status, priority } = req.body;
    const hasRequiredMaterials = req.body.required_materials !== undefined;
    const requiredMaterials = await validateRequiredMaterials(req.body.required_materials, req.user.company_id);
    if (!title) return res.status(400).json({ error: 'title è obbligatorio' });

    const validPriorities = ['bassa', 'normale', 'alta', 'urgente'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priorità non valida' });
    }

    const validTimes = ['morning', 'afternoon', 'all_day', 'custom'];
    if (scheduled_time && !validTimes.includes(scheduled_time)) {
      return res.status(400).json({ error: 'Orario non valido' });
    }

    // Validate custom time if scheduled_time is 'custom'
    if (scheduled_time === 'custom' && !scheduled_time_custom) {
      return res.status(400).json({ error: 'Orario personalizzato obbligatorio' });
    }

    // Check for user absence if both assigned_to and scheduled_date are provided
    if (assigned_to && scheduled_date) {
      const absenceCheck = await db.query(
        `SELECT id FROM user_absences
         WHERE user_id = $1 AND absence_date = $2 AND company_id = $3`,
        [parseInt(assigned_to), scheduled_date, req.user.company_id]
      );
      if (absenceCheck.rows.length > 0) {
        return res.status(409).json({ error: 'User has a registered absence on this date' });
      }
    }

    // Read the previous assigned_to and status to detect reassignment and status changes
    await client.query('BEGIN');
    const prev = await client.query(
      'SELECT assigned_to, status FROM jobs WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!prev.rows.length) return res.status(404).json({ error: 'Job not found' });
    const prevAssignedTo = prev.rows[0].assigned_to;
    const prevStatus = prev.rows[0].status;
    if (hasRequiredMaterials && prevStatus !== 'aperto') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'I materiali richiesti non sono più modificabili dopo l’accettazione del lavoro' });
    }
    const newStatus = status || 'aperto';

    // Clear timestamps when status changes to/from completion states
    let startedAtValue = 'started_at';
    let completedAtValue = 'completed_at';

    if (newStatus === 'aperto' || newStatus === 'pianificato') {
      startedAtValue = 'NULL';
      completedAtValue = 'NULL';
    } else if (newStatus === 'completato' && prevStatus !== 'completato') {
      completedAtValue = "NOW()";
    }

    const result = await client.query(
      `UPDATE jobs
       SET title=$1, description=$2, address=$3, client_id=$4, assigned_to=$5,
           scheduled_date=$6, scheduled_time=$7, scheduled_time_custom=$8, status=$9, priority=$10,
           started_at=${startedAtValue}, completed_at=${completedAtValue}
       WHERE id=$11 AND company_id=$12
       RETURNING *`,
      [
        title,
        description    || null,
        address        || null,
        client_id      ? parseInt(client_id)   : null,
        assigned_to    ? parseInt(assigned_to) : null,
        scheduled_date || null,
        scheduled_time || 'all_day',
        (scheduled_time === 'custom' ? scheduled_time_custom : null) || null,
        newStatus,
        priority       || 'normale',
        req.params.id,
        req.user.company_id,
      ]
    );
    if (hasRequiredMaterials) await replaceRequiredMaterials(client, req.params.id, requiredMaterials);
    await client.query('COMMIT');
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    const job = result.rows[0];
    res.json(job);

    // Notify if a new user was assigned (or assignment changed)
    const newAssignedTo = assigned_to ? parseInt(assigned_to) : null;
    if (newAssignedTo && newAssignedTo !== prevAssignedTo) {
      notifyUsers(req.user.company_id, [newAssignedTo], {
        type:  'job_assigned',
        title: 'Nuovo lavoro assegnato',
        body:  job.title,
        url:   `/jobs/${job.id}`,
        data:  { jobId: job.id },
      });
    }

    // Notify the assigned user if the status changed
    if (newStatus !== prevStatus) {
      const statusLabels = { aperto: 'Aperto', pianificato: 'Pianificato', in_corso: 'In corso', completato: 'Completato', annullato: 'Annullato' };
      const assignedFor = newAssignedTo || prevAssignedTo;
      if (assignedFor) {
        notifyUsers(req.user.company_id, [assignedFor], {
          type:  'job_status',
          title: `Lavoro aggiornato: ${job.title}`,
          body:  `Nuovo stato: ${statusLabels[newStatus] || newStatus}`,
          url:   `/jobs/${job.id}`,
          data:  { jobId: job.id },
        });
      }
    }
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});

// DELETE /api/jobs/:id
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM jobs WHERE id=$1 AND company_id=$2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Job Messages (Chat) ────────────────────────────────────────────────────────

// GET /api/jobs/:id/messages
router.get('/:id/messages', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.*, u.name AS sender_name
       FROM job_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.job_id = $1 AND m.company_id = $2
       ORDER BY m.created_at ASC`,
      [req.params.id, req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/jobs/:id/messages
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenuto mancante' });

    // Verify job belongs to company
    const check = await db.query(
      'SELECT id, title, assigned_to FROM jobs WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });
    const job = check.rows[0];

    const result = await db.query(
      `INSERT INTO job_messages (company_id, job_id, sender_id, content, type)
       VALUES ($1, $2, $3, $4, 'text') RETURNING *`,
      [req.user.company_id, req.params.id, req.user.id, content]
    );
    const message = result.rows[0];
    res.status(201).json({ ...message, sender_name: req.user.name || req.user.email });

    // Notify counterpart
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const senderName = req.user.name || 'Ufficio';
    const notifPayload = {
      type:  'job_message',
      title: `Messaggio: ${job.title}`,
      body:  `${senderName}: ${content}`,
      url:   `/jobs/${job.id}?tab=chat`,
      data:  { jobId: job.id, tab: 'chat' },
    };
    if (isAdmin) {
      if (job.assigned_to) notifyUsers(req.user.company_id, [job.assigned_to], notifPayload);
    } else {
      notifyRoles(req.user.company_id, ['admin', 'superadmin'], notifPayload);
    }
  } catch (err) { next(err); }
});

// POST /api/jobs/:id/messages/audio
router.post('/:id/messages/audio', uploadAudio.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file audio ricevuto' });

    const { duration } = req.body;

    // Verify job belongs to company
    const check = await db.query(
      'SELECT id, title, assigned_to FROM jobs WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });
    const job = check.rows[0];

    const audioUrl = `/uploads/${req.file.filename}`;
    const result = await db.query(
      `INSERT INTO job_messages (company_id, job_id, sender_id, type, audio_url, audio_duration)
       VALUES ($1, $2, $3, 'audio', $4, $5) RETURNING *`,
      [req.user.company_id, req.params.id, req.user.id, audioUrl, duration ? parseFloat(duration) : null]
    );
    const message = result.rows[0];
    res.status(201).json({ ...message, sender_name: req.user.name || req.user.email });

    // Notify counterpart
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const senderName = req.user.name || 'Ufficio';
    const notifPayload = {
      type:  'job_message',
      title: `Messaggio: ${job.title}`,
      body:  `${senderName}: 🎤 Messaggio vocale`,
      url:   `/jobs/${job.id}?tab=chat`,
      data:  { jobId: job.id, tab: 'chat' },
    };
    if (isAdmin) {
      if (job.assigned_to) notifyUsers(req.user.company_id, [job.assigned_to], notifPayload);
    } else {
      notifyRoles(req.user.company_id, ['admin', 'superadmin'], notifPayload);
    }
  } catch (err) { next(err); }
});

// ── Job Photos ────────────────────────────────────────────────────────────────

// GET /api/jobs/:id/photos
router.get('/:id/photos', async (req, res, next) => {
  try {
    const check = await db.query(
      'SELECT id FROM jobs WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });

    const result = await db.query(
      'SELECT * FROM job_photos WHERE job_id=$1 ORDER BY type, created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/jobs/:id/photos?type=problem|repair
router.post('/:id/photos', uploadPhoto.single('photo'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato' });

    const { type, latitude, longitude, location_address } = req.query;
    if (!['problem', 'repair'].includes(type)) {
      return res.status(400).json({ error: 'Tipo foto non valido (problem|repair)' });
    }

    // Determine media type from mimetype, with extension fallback (mirrors multer filter)
    const mime = (req.file.mimetype || '').toLowerCase();
    const ext  = (req.file.originalname.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
    const isVideo = mime.startsWith('video/') || ['mp4','webm','mov','mkv','3gp'].includes(ext);
    const mediaType = isVideo ? 'video' : 'image';

    // Verify job belongs to company and user is assigned/admin
    const check = await client.query(
      'SELECT id, assigned_to, started_at, signed_at FROM jobs WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && check.rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (!check.rows[0].started_at || check.rows[0].signed_at) {
      return res.status(400).json({ error: 'Foto consentite solo a lavoro arrivato e non firmato' });
    }

    await client.query('BEGIN');

    const quota = await checkMediaQuota(client, {
      jobId:     req.params.id,
      companyId: req.user.company_id,
      kind:      type,
      mediaType,
    });
    if (!quota.ok) {
      await client.query('ROLLBACK');
      // Remove the already-uploaded file from disk to avoid orphans
      fs.unlink(path.join(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'), req.file.filename), () => {});
      return res.status(403).json({ error: quota.code, reason: quota.reason, used: quota.used, max: quota.max, plan: quota.planType });
    }

    const lat  = latitude  ? parseFloat(latitude)  : null;
    const lng  = longitude ? parseFloat(longitude) : null;
    const addr = location_address || null;

    const url = `/uploads/${req.file.filename}`;
    const result = await client.query(
      `INSERT INTO job_photos (company_id, job_id, type, url, filename, created_by, latitude, longitude, location_address, media_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.company_id, req.params.id, type, url, req.file.originalname, req.user.name || req.user.email, lat, lng, addr, mediaType]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/jobs/:id/photos/:photoId
router.delete('/:id/photos/:photoId', async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const check = await db.query(
      `SELECT jp.id, j.assigned_to FROM job_photos jp
       JOIN jobs j ON j.id = jp.job_id
       WHERE jp.id=$1 AND jp.job_id=$2 AND j.company_id=$3`,
      [req.params.photoId, req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Foto non trovata' });
    if (!isAdmin && check.rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    await db.query('DELETE FROM job_photos WHERE id=$1', [req.params.photoId]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/jobs/:id/geolocation — tutti i dati geolocalizzati (foto + state changes)
router.get('/:id/geolocation', async (req, res, next) => {
  try {
    // Verify job belongs to company and user is admin or assigned to job
    const check = await db.query(
      'SELECT id, assigned_to FROM jobs WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });

    const job = check.rows[0];
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && job.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    // Get all geolocalized photos
    const photos = await db.query(
      `SELECT id, job_id, type, url, filename, latitude, longitude, location_address, created_by, created_at
       FROM job_photos
       WHERE job_id = $1 AND (latitude IS NOT NULL OR longitude IS NOT NULL)
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    // Get all state changes with geolocation
    const stateChanges = await db.query(
      `SELECT jsc.id, jsc.change_type, jsc.latitude, jsc.longitude, jsc.location_address, u.name AS changed_by_name, jsc.created_at
       FROM job_state_changes jsc
       LEFT JOIN users u ON u.id = jsc.changed_by
       WHERE jsc.job_id = $1 AND (jsc.latitude IS NOT NULL OR jsc.longitude IS NOT NULL)
       ORDER BY jsc.created_at ASC`,
      [req.params.id]
    );

    res.json({
      job_id: parseInt(req.params.id),
      photos: photos.rows,
      stateChanges: stateChanges.rows,
      total_markers: photos.rows.length + stateChanges.rows.length
    });
  } catch (err) { next(err); }
});

// ── Job Signature & Reports ──────────────────────────────────────────────────

// POST /api/jobs/:id/sign — firma del cliente e chiusura lavoro
router.post('/:id/sign', async (req, res, next) => {
  try {
    const { signature } = req.body; // base64 string
    if (!signature) return res.status(400).json({ error: 'Firma mancante' });

    // Verify job belongs to company and user is assigned/admin
    const check = await db.query(
      'SELECT id, assigned_to, status FROM jobs WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Job not found' });
    
    const job = check.rows[0];
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && job.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    if (job.status === 'annullato') {
      return res.status(400).json({ error: 'Non puoi firmare un lavoro annullato' });
    }

    // Convert base64 to image and save
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
    const filename = `sig_${req.params.id}_${Date.now()}.png`;
    const filePath = path.join(uploadDir, filename);
    
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const signatureUrl = `/uploads/${filename}`;

    // Confirm all pending material movements for this job, then mark job signed,
    // all inside a single transaction so an insufficient-stock failure rolls back signature.
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const pending = await client.query(
        `SELECT m.*, p.tracks_batches FROM movements m
         JOIN products p ON p.id = m.product_id
         WHERE m.job_id = $1 AND m.status = 'pending'
         ORDER BY m.created_at ASC
         FOR UPDATE`,
        [req.params.id]
      );

      for (const m of pending.rows) {
        await confirmPendingJobConsumption(client, {
          companyId: req.user.company_id,
          movementId: m.id,
        });
      }

      const result = await client.query(
        `UPDATE jobs
         SET customer_signature_url = $1,
             signed_at = NOW(),
             status = 'completato',
             completed_at = COALESCE(completed_at, NOW())
         WHERE id = $2
         RETURNING *`,
        [signatureUrl, req.params.id]
      );

      const { latitude, longitude, location_address } = req.body;
      const lat  = latitude  ? parseFloat(latitude)  : null;
      const lng  = longitude ? parseFloat(longitude) : null;
      const addr = location_address || null;
      await client.query(
        `INSERT INTO job_state_changes (company_id, job_id, change_type, latitude, longitude, location_address, changed_by)
         VALUES ($1, $2, 'signed', $3, $4, $5, $6)`,
        [req.user.company_id, req.params.id, lat, lng, addr, req.user.id]
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);

      const signedJob = result.rows[0];
      const signPayload = {
        type:  'job_status',
        title: `Lavoro aggiornato: ${signedJob.title}`,
        body:  'Nuovo stato: Completato',
        url:   `/jobs/${signedJob.id}`,
        data:  { jobId: signedJob.id },
      };
      if (isAdmin) {
        if (signedJob.assigned_to) notifyUsers(req.user.company_id, [signedJob.assigned_to], signPayload);
      } else {
        notifyRoles(req.user.company_id, ['admin', 'superadmin'], signPayload);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// GET /api/jobs/:id/report — genera rapportino PDF
const { generateInterventionReport }      = require('../utils/pdf-generator');
const { renderDocxToPdf, buildTemplateData } = require('../utils/docx-template');
router.get('/:id/report', async (req, res, next) => {
  try {
    const cid = req.user.company_id;

    // 1. Fetch Job + Client
    const jobRes = await db.query(
      `SELECT j.*,
              c.name AS client_name, c.address AS client_address, c.phone AS client_phone, c.email AS client_email,
              u.name AS assigned_to_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN users u ON u.id = j.assigned_to
       WHERE j.id = $1 AND j.company_id = $2`,
      [req.params.id, cid]
    );
    if (!jobRes.rows.length) return res.status(404).json({ error: 'Job not found' });
    const job = jobRes.rows[0];

    // 2. Fetch Company (for logo/currency/template)
    const compRes = await db.query('SELECT * FROM companies WHERE id = $1', [cid]);
    const company = compRes.rows[0];

    // 3. Fetch Movements (materials)
    const movRes = await db.query(
      `SELECT m.*, p.name AS product_name, p.sku, p.unit
       FROM movements m
       JOIN products p ON m.product_id = p.id
       WHERE m.job_id = $1 AND m.type <> 'trasferimento'
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );

    // 4. Fetch Photos + Signature (needed by both template and pdfkit paths)
    const photoRes = await db.query(
      'SELECT * FROM job_photos WHERE job_id = $1 ORDER BY type, created_at ASC',
      [req.params.id]
    );

    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
    let signaturePath = null;
    if (job.customer_signature_url) {
      signaturePath = path.join(uploadDir, path.basename(job.customer_signature_url));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Rapporto_${req.params.id}.pdf`);

    // 5a. If the company has a Word template — use docxtemplater + LibreOffice
    console.log(`[report] job=${req.params.id} company=${cid} word_template_url=${company.word_template_url || '(none)'}`);

    if (company.word_template_url) {
      const templatePath = path.join(uploadDir, path.basename(company.word_template_url));
      const templateExists = fs.existsSync(templatePath);
      console.log(`[report] templatePath=${templatePath} exists=${templateExists}`);

      if (templateExists) {
        try {
          const data      = buildTemplateData(job, company, movRes.rows, photoRes.rows, signaturePath);
          const pdfBuffer = await renderDocxToPdf(templatePath, data);
          res.setHeader('X-PDF-Source', 'template');
          return res.end(pdfBuffer);
        } catch (templateErr) {
          console.error('[report] Word template render FAILED:', templateErr);
          // fall through to pdfkit below
        }
      }
    }

    // 5b. Fallback: pdfkit report (also used when no template is set)
    res.setHeader('X-PDF-Source', 'pdfkit');
    generateInterventionReport({
      job,
      company,
      movements: movRes.rows,
      photos: photoRes.rows,
      signaturePath
    }, res);

  } catch (err) { next(err); }
});

module.exports = router;
