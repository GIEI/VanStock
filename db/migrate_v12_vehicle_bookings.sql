-- Migration v12: Vehicle bookings system
-- A van (location type='van') can be reserved for a specific date and period.
-- period: all_day | morning | afternoon
-- UNIQUE(location_id, date, period) prevents double-booking.

CREATE TABLE IF NOT EXISTS vehicle_bookings (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  job_id      INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  period      VARCHAR(10) NOT NULL DEFAULT 'all_day'
              CHECK (period IN ('all_day', 'morning', 'afternoon')),
  booked_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (location_id, date, period)
);

CREATE INDEX IF NOT EXISTS idx_vbookings_company  ON vehicle_bookings (company_id);
CREATE INDEX IF NOT EXISTS idx_vbookings_location ON vehicle_bookings (location_id);
CREATE INDEX IF NOT EXISTS idx_vbookings_job      ON vehicle_bookings (job_id);
CREATE INDEX IF NOT EXISTS idx_vbookings_date     ON vehicle_bookings (date);
