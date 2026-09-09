-- Migration v22: Attendance v2 — Event Sourcing + State Machine
-- Replaces the rigid morning/afternoon slot model with an immutable event log.
-- Old tables (attendance, attendance_requests) are NOT modified; they remain read-only for historical reference.

-- ── attendance_events ────────────────────────────────────────────────────────
-- Immutable event log: each clock-in/out/break action is a new row.
-- The user's current state is derived from the latest event (resulting_state).
CREATE TABLE IF NOT EXISTS attendance_events (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_at     TIMESTAMPTZ NOT NULL,
  detected_action TEXT NOT NULL CHECK (detected_action IN ('CHECK_IN','CHECK_OUT','BREAK_START','BREAK_END')),
  resulting_state TEXT NOT NULL CHECK (resulting_state IN ('OUT','IN','BREAK','PENDING_REVIEW','LOCKED')),
  previous_state  TEXT NOT NULL CHECK (previous_state IN ('OUT','IN','BREAK','PENDING_REVIEW','LOCKED')),
  request_id      TEXT NOT NULL,
  qr_token_id     TEXT,
  device_id       TEXT,
  gps_lat         NUMERIC(10,7),
  gps_lng         NUMERIC(10,7),
  source          TEXT NOT NULL CHECK (source IN ('mobile','web','admin')),
  status          TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','invalid','reviewed','superseded')),
  anomaly_type    TEXT,
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_events_user_time
  ON attendance_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_events_company_time
  ON attendance_events(company_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_events_status
  ON attendance_events(status) WHERE status IN ('invalid','reviewed','superseded');

CREATE INDEX IF NOT EXISTS idx_attendance_events_anomaly
  ON attendance_events(anomaly_type) WHERE anomaly_type IS NOT NULL;


-- ── attendance_override_requests ─────────────────────────────────────────────
-- User requests to add a missing event (e.g., "I forgot to scan when leaving at 17:30").
-- Admin approves → an attendance_event is created and linked via resulting_event_id.
CREATE TABLE IF NOT EXISTS attendance_override_requests (
  id                   SERIAL PRIMARY KEY,
  company_id           INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_action     TEXT NOT NULL CHECK (requested_action IN ('CHECK_IN','CHECK_OUT','BREAK_START','BREAK_END')),
  requested_at         TIMESTAMPTZ NOT NULL,
  reason               TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  review_notes         TEXT,
  resulting_event_id   INTEGER REFERENCES attendance_events(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_override_req_company_status
  ON attendance_override_requests(company_id, status);

CREATE INDEX IF NOT EXISTS idx_override_req_user
  ON attendance_override_requests(user_id, created_at DESC);


-- ── attendance_audit_log ─────────────────────────────────────────────────────
-- Immutable log of every admin modification. reason is mandatory.
CREATE TABLE IF NOT EXISTS attendance_audit_log (
  id                  SERIAL PRIMARY KEY,
  attendance_event_id INTEGER REFERENCES attendance_events(id) ON DELETE CASCADE,
  admin_id            INTEGER NOT NULL REFERENCES users(id),
  action              TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','SUPERSEDE','RESOLVE_ANOMALY','APPROVE_REQUEST','REJECT_REQUEST','INVALIDATE')),
  old_value           JSONB,
  new_value           JSONB,
  reason              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_event
  ON attendance_audit_log(attendance_event_id);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_admin
  ON attendance_audit_log(admin_id, created_at DESC);


-- ── attendance_days_view ─────────────────────────────────────────────────────
-- On-demand aggregate per (user_id, date). Uses only valid events.
-- worked_minutes = sum of intervals between CHECK_IN→CHECK_OUT (excluding BREAK time)
-- break_minutes  = sum of intervals between BREAK_START→BREAK_END
CREATE OR REPLACE VIEW attendance_days_view AS
WITH valid_events AS (
  SELECT
    ae.id,
    ae.company_id,
    ae.user_id,
    ae.occurred_at,
    (ae.occurred_at AT TIME ZONE 'Europe/Rome')::date AS day,
    ae.detected_action,
    ae.resulting_state,
    ae.anomaly_type,
    LEAD(ae.occurred_at) OVER (PARTITION BY ae.user_id ORDER BY ae.occurred_at) AS next_occurred_at,
    LEAD(ae.detected_action) OVER (PARTITION BY ae.user_id ORDER BY ae.occurred_at) AS next_action
  FROM attendance_events ae
  WHERE ae.status = 'valid'
),
day_intervals AS (
  SELECT
    user_id,
    company_id,
    day,
    -- worked minutes: interval where state was IN (between CHECK_IN/BREAK_END and next CHECK_OUT/BREAK_START)
    SUM(
      CASE
        WHEN detected_action IN ('CHECK_IN','BREAK_END')
         AND next_action IN ('CHECK_OUT','BREAK_START')
         AND next_occurred_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (next_occurred_at - occurred_at)) / 60.0
        ELSE 0
      END
    )::INTEGER AS worked_minutes,
    -- break minutes
    SUM(
      CASE
        WHEN detected_action = 'BREAK_START'
         AND next_action = 'BREAK_END'
         AND next_occurred_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (next_occurred_at - occurred_at)) / 60.0
        ELSE 0
      END
    )::INTEGER AS break_minutes
  FROM valid_events
  GROUP BY user_id, company_id, day
),
last_state_per_day AS (
  SELECT DISTINCT ON (user_id, (occurred_at AT TIME ZONE 'Europe/Rome')::date)
    user_id,
    (occurred_at AT TIME ZONE 'Europe/Rome')::date AS day,
    resulting_state AS last_state
  FROM attendance_events
  WHERE status = 'valid'
  ORDER BY user_id, (occurred_at AT TIME ZONE 'Europe/Rome')::date, occurred_at DESC
),
day_summary AS (
  SELECT
    ae.user_id,
    ae.company_id,
    (ae.occurred_at AT TIME ZONE 'Europe/Rome')::date AS day,
    MIN(ae.occurred_at) FILTER (WHERE ae.detected_action = 'CHECK_IN') AS first_entry,
    MAX(ae.occurred_at) FILTER (WHERE ae.detected_action = 'CHECK_OUT') AS last_exit,
    COUNT(*) FILTER (WHERE ae.anomaly_type IS NOT NULL OR ae.resulting_state = 'PENDING_REVIEW')::INTEGER AS anomalies_count,
    BOOL_OR(ae.resulting_state = 'PENDING_REVIEW') AS has_pending_review
  FROM attendance_events ae
  WHERE ae.status = 'valid'
  GROUP BY ae.user_id, ae.company_id, (ae.occurred_at AT TIME ZONE 'Europe/Rome')::date
)
SELECT
  ds.user_id,
  ds.company_id,
  ds.day AS date,
  ds.first_entry,
  ds.last_exit,
  COALESCE(di.worked_minutes, 0) AS worked_minutes,
  COALESCE(di.break_minutes, 0) AS break_minutes,
  ds.anomalies_count,
  ds.has_pending_review,
  CASE
    WHEN ls.last_state = 'OUT' THEN 'closed'
    WHEN ds.has_pending_review THEN 'anomalous'
    ELSE 'open'
  END AS status
FROM day_summary ds
LEFT JOIN day_intervals di ON di.user_id = ds.user_id AND di.day = ds.day
LEFT JOIN last_state_per_day ls ON ls.user_id = ds.user_id AND ls.day = ds.day;
