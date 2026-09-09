const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── helpers ──────────────────────────────────────────────────────────────────

// Check if two time ranges overlap
// Returns true if [start1, end1) overlaps with [start2, end2)
function hasOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// ── GET /api/vehicle-bookings ─────────────────────────────────────────────────
// Query params: date_from, date_to, location_id
router.get('/', async (req, res, next) => {
  try {
    const { date_from, date_to, location_id } = req.query;

    let conditions = ['vb.company_id = $1'];
    let params     = [req.user.company_id];

    if (date_from)   { params.push(date_from);            conditions.push(`vb.date >= $${params.length}`); }
    if (date_to)     { params.push(date_to);              conditions.push(`vb.date <= $${params.length}`); }
    if (location_id) { params.push(parseInt(location_id)); conditions.push(`vb.location_id = $${params.length}`); }

    const result = await db.query(
      `SELECT vb.*,
              l.name       AS van_name,
              l.plate      AS van_plate,
              j.title      AS job_title,
              j.address    AS job_address,
              u.name       AS booked_by_name,
              TO_CHAR(vb.date, 'YYYY-MM-DD') AS date_str
       FROM vehicle_bookings vb
       JOIN locations l ON l.id = vb.location_id
       LEFT JOIN jobs    j ON j.id = vb.job_id
       LEFT JOIN users   u ON u.id = vb.booked_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY vb.date ASC, vb.location_id, vb.start_time`,
      params
    );

    // Ensure date is returned as string in YYYY-MM-DD format
    const rows = result.rows.map(row => ({
      ...row,
      date: typeof row.date === 'string' ? row.date : (row.date_str || row.date?.toISOString?.().split('T')[0])
    }));

    res.json(rows);
  } catch (err) { next(err); }
});

// ── GET /api/vehicle-bookings/available ──────────────────────────────────────
// Query params: date (required), start_time (required: HH:MM), end_time (required: HH:MM)
// Returns vans available for that date+time range
router.get('/available', async (req, res, next) => {
  try {
    const { date, start_time, end_time, job_id } = req.query;
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Parametri date, start_time e end_time obbligatori' });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({ error: 'Formato orario non valido (usa HH:MM)' });
    }

    let requiredMaterials = [];
    if (job_id) {
      const job = await db.query('SELECT id FROM jobs WHERE id = $1 AND company_id = $2', [job_id, req.user.company_id]);
      if (!job.rows.length) return res.status(404).json({ error: 'Lavoro non trovato' });
      const materials = await db.query(
        `SELECT jrm.product_id, jrm.quantity_required, p.name AS product_name, p.sku, p.unit
           FROM job_required_materials jrm JOIN products p ON p.id = jrm.product_id
          WHERE jrm.job_id = $1`,
        [job_id]
      );
      requiredMaterials = materials.rows;
    }

    // Get all vans for this company
    const allVans = await db.query(
      `SELECT l.* FROM locations l
       WHERE l.company_id = $1 AND l.type = 'van'
       ORDER BY l.name`,
      [req.user.company_id]
    );
    const stockRows = requiredMaterials.length
      ? await db.query('SELECT product_id, location_id, quantity FROM product_stocks WHERE location_id = ANY($1) AND product_id = ANY($2)', [allVans.rows.map(van => van.id), requiredMaterials.map(item => item.product_id)])
      : { rows: [] };

    // Get all bookings for this date (to check overlaps)
    const bookings = await db.query(
      `SELECT vb.* FROM vehicle_bookings vb
       WHERE vb.company_id = $1 AND vb.date::date = $2::date`,
      [req.user.company_id, date]
    );

    // Get user's existing bookings for this date
    const userBookings = bookings.rows.filter(b => b.booked_by === req.user.id);

    // Check if the requesting user already has a booking for this date with overlap
    const existingBooking = userBookings.find(b => hasOverlap(start_time, end_time, b.start_time, b.end_time));

    // Enrich existing booking with van/job info
    let enrichedExisting = null;
    if (existingBooking) {
      const enriched = await db.query(
        `SELECT vb.*, l.name AS van_name, l.plate AS van_plate, j.title AS job_title
         FROM vehicle_bookings vb
         JOIN locations l ON l.id = vb.location_id
         LEFT JOIN jobs j ON j.id = vb.job_id
         WHERE vb.id = $1`,
        [existingBooking.id]
      );
      enrichedExisting = enriched.rows[0] || null;
    }

    // Filter available vans: exclude those with overlapping bookings from OTHER users
    // Include vans that user already booked (owned vans)
    const available = allVans.rows.map(van => {
      const vanBookings = bookings.rows.filter(b => b.location_id === van.id);
      const otherUserBookings = vanBookings.filter(b => b.booked_by !== req.user.id);
      const userVanBooking = vanBookings.find(b => b.booked_by === req.user.id && hasOverlap(start_time, end_time, b.start_time, b.end_time));

      const hasConflictWithOthers = otherUserBookings.some(b => hasOverlap(start_time, end_time, b.start_time, b.end_time));

      const missingMaterials = requiredMaterials.flatMap(material => {
        const stock = stockRows.rows.find(item => item.location_id === van.id && item.product_id === material.product_id);
        const quantityAvailable = Number(stock?.quantity || 0);
        const quantityRequired = Number(material.quantity_required);
        if (quantityAvailable >= quantityRequired) return [];
        return [{
          ...material,
          quantity_available: quantityAvailable,
          quantity_missing: quantityRequired - quantityAvailable,
        }];
      });
      return {
        ...van,
        owned: !!userVanBooking,  // True if user already has a booking for this van/time
        owned_booking_id: userVanBooking?.id || null,
        hasConflictWithOthers,  // Internal flag for filtering
        is_stock_sufficient: requiredMaterials.length ? missingMaterials.length === 0 : null,
        missing_materials: requiredMaterials.length ? missingMaterials : [],
      };
    }).filter(van => !van.hasConflictWithOthers || van.owned);  // Show vans with conflicts only if owned

    // If user has an existing booking, show ONLY that van; otherwise show all available
    let filteredAvailable = available;
    if (existingBooking) {
      filteredAvailable = available.filter(v => v.owned && v.owned_booking_id === existingBooking.id);
    }

    // Remove internal flag before sending response
    const cleanAvailable = filteredAvailable.map(({ hasConflictWithOthers, ...van }) => van);

    res.json({
      available:        cleanAvailable,
      existing_booking: enrichedExisting,
      must_use_van_id:  existingBooking ? existingBooking.location_id : null,  // If user has overlap, they MUST use this van
    });
  } catch (err) { next(err); }
});

// ── POST /api/vehicle-bookings ────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { location_id, date, start_time, end_time, job_id, notes } = req.body;
    if (!location_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'location_id, date, start_time e end_time sono obbligatori' });
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({ error: 'Formato orario non valido (usa HH:MM)' });
    }

    // Verify the location is a van belonging to this company
    const locCheck = await db.query(
      `SELECT id FROM locations WHERE id = $1 AND company_id = $2 AND type = 'van'`,
      [location_id, req.user.company_id]
    );
    if (!locCheck.rows.length) {
      return res.status(404).json({ error: 'Furgone non trovato' });
    }

    // Check availability (no overlapping bookings)
    const conflict = await db.query(
      `SELECT id FROM vehicle_bookings
       WHERE location_id = $1 AND date::date = $2::date
         AND start_time < $3 AND end_time > $4`,
      [location_id, date, end_time, start_time]
    );
    if (conflict.rows.length) {
      return res.status(409).json({ error: 'Il furgone non è disponibile per l\'orario selezionato' });
    }

    const result = await db.query(
      `INSERT INTO vehicle_bookings (company_id, location_id, job_id, date, start_time, end_time, booked_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [req.user.company_id, location_id, job_id || null, date, start_time, end_time, req.user.id, notes || null]
    );

    // Return with enriched data
    const enriched = await db.query(
      `SELECT vb.*, l.name AS van_name, l.plate AS van_plate,
              j.title AS job_title, u.name AS booked_by_name
       FROM vehicle_bookings vb
       JOIN locations l ON l.id = vb.location_id
       LEFT JOIN jobs  j ON j.id = vb.job_id
       LEFT JOIN users u ON u.id = vb.booked_by
       WHERE vb.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/vehicle-bookings/:id ─────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    // Only the booker or admin can delete
    const check = await db.query(
      'SELECT id, booked_by FROM vehicle_bookings WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Prenotazione non trovata' });
    if (!isAdmin && check.rows[0].booked_by !== req.user.id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    await db.query('DELETE FROM vehicle_bookings WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
