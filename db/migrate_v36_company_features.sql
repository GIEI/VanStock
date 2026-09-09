-- Migration v36: generic feature catalogue and company feature configuration.
-- A missing company_features row means the feature is disabled for that company.

CREATE TABLE IF NOT EXISTS features (
  feature_key  TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT features_feature_key_format
    CHECK (feature_key ~ '^[A-Z][A-Z0-9_]{1,62}$')
);

CREATE TABLE IF NOT EXISTS company_features (
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL REFERENCES features(feature_key) ON DELETE CASCADE,
  enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_company_features_company_enabled
  ON company_features(company_id, enabled);

CREATE TABLE IF NOT EXISTS company_feature_audit_log (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL REFERENCES features(feature_key) ON DELETE CASCADE,
  enabled      BOOLEAN NOT NULL,
  changed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_feature_audit_company_created
  ON company_feature_audit_log(company_id, created_at DESC);

-- Only resources registered by the application may be assigned to a Feature.
CREATE TABLE IF NOT EXISTS feature_resources (
  resource_key  TEXT PRIMARY KEY,
  platform      TEXT NOT NULL CHECK (platform IN ('WEB', 'MOBILE', 'BACKEND')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('MENU', 'ROUTE', 'API_GROUP', 'JOB')),
  name          TEXT NOT NULL,
  bundle_key    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE feature_resources ADD COLUMN IF NOT EXISTS bundle_key TEXT;

CREATE TABLE IF NOT EXISTS feature_resource_bindings (
  feature_key  TEXT NOT NULL REFERENCES features(feature_key) ON DELETE CASCADE,
  resource_key TEXT NOT NULL REFERENCES feature_resources(resource_key) ON DELETE CASCADE,
  PRIMARY KEY (feature_key, resource_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_resource_bindings_resource
  ON feature_resource_bindings(resource_key);

-- PRESENZE is the initial feature. Existing companies retain their current access;
-- newly created companies and all subsequently created features remain OFF by default.
INSERT INTO features (feature_key, name, description)
VALUES ('PRESENZE', 'Presenze', 'Timbrature, QR Monitor, assenze e turni aziendali.')
ON CONFLICT (feature_key) DO NOTHING;

INSERT INTO company_features (company_id, feature_key, enabled)
SELECT id, 'PRESENZE', TRUE
FROM companies
ON CONFLICT (company_id, feature_key) DO NOTHING;

INSERT INTO feature_resources (resource_key, platform, resource_type, name) VALUES
  ('WEB_MENU_ATTENDANCE', 'WEB', 'MENU', 'Attendance'),
  ('WEB_MENU_BADGE_CREATOR', 'WEB', 'MENU', 'QR Monitor'),
  ('WEB_MENU_MY_ABSENCES', 'WEB', 'MENU', 'Absence'),
  ('WEB_MENU_SCANNER', 'WEB', 'MENU', 'Scanner'),
  ('WEB_MENU_TIMELINE', 'WEB', 'MENU', 'Timeline Tecnici'),
  ('WEB_MENU_ANALYTICS', 'WEB', 'MENU', 'Statistiche'),
  ('WEB_MENU_MARGINS', 'WEB', 'MENU', 'Margini'),
  ('WEB_ROUTE_ATTENDANCE', 'WEB', 'ROUTE', '/attendance'),
  ('WEB_ROUTE_BADGE_CREATOR', 'WEB', 'ROUTE', '/badge-creator'),
  ('WEB_ROUTE_MY_ABSENCES', 'WEB', 'ROUTE', '/my-absences'),
  ('WEB_ROUTE_SCANNER', 'WEB', 'ROUTE', '/scanner'),
  ('WEB_ROUTE_TIMELINE', 'WEB', 'ROUTE', '/timeline'),
  ('WEB_ROUTE_ANALYTICS', 'WEB', 'ROUTE', '/analytics'),
  ('WEB_ROUTE_MARGINS', 'WEB', 'ROUTE', '/margins'),
  ('API_ANALYTICS', 'BACKEND', 'API_GROUP', '/api/analytics'),
  ('API_MARGINS', 'BACKEND', 'API_GROUP', '/api/margins'),
  ('API_TIMELINE', 'BACKEND', 'API_GROUP', '/api/timeline'),
  ('MOBILE_MENU_ATTENDANCE', 'MOBILE', 'MENU', 'Attendance app mobile'),
  ('MOBILE_ROUTE_ATTENDANCE', 'MOBILE', 'ROUTE', '/attendance e sottoroute'),
  ('API_ATTENDANCE_V2', 'BACKEND', 'API_GROUP', '/api/attendance-v2'),
  ('API_ADMIN_ATTENDANCE', 'BACKEND', 'API_GROUP', '/api/admin/attendance'),
  ('API_ATTENDANCE_LEGACY', 'BACKEND', 'API_GROUP', '/api/attendance, /api/badge, /api/timesheet'),
  ('API_ABSENCES', 'BACKEND', 'API_GROUP', '/api/user-absences, /api/system/work-shifts'),
  ('JOB_ATTENDANCE_ANOMALIES', 'BACKEND', 'JOB', 'Scanner anomalie Presenze')
ON CONFLICT (resource_key) DO NOTHING;

UPDATE feature_resources
   SET bundle_key = CASE
     WHEN resource_key IN ('WEB_MENU_ANALYTICS', 'WEB_ROUTE_ANALYTICS', 'API_ANALYTICS') THEN 'ANALYTICS'
     WHEN resource_key IN ('WEB_MENU_MARGINS', 'WEB_ROUTE_MARGINS', 'API_MARGINS') THEN 'MARGINS'
     WHEN resource_key IN ('WEB_MENU_SCANNER', 'WEB_ROUTE_SCANNER') THEN 'SCANNER'
     WHEN resource_key IN ('WEB_MENU_TIMELINE', 'WEB_ROUTE_TIMELINE', 'API_TIMELINE') THEN 'TIMELINE_TECNICI'
     WHEN resource_key IN ('WEB_MENU_ATTENDANCE', 'WEB_ROUTE_ATTENDANCE', 'API_ATTENDANCE_V2', 'API_ADMIN_ATTENDANCE', 'JOB_ATTENDANCE_ANOMALIES') THEN 'ATTENDANCE'
     WHEN resource_key IN ('MOBILE_MENU_ATTENDANCE', 'MOBILE_ROUTE_ATTENDANCE') THEN 'MOBILE_ATTENDANCE'
     WHEN resource_key IN ('WEB_MENU_BADGE_CREATOR', 'WEB_ROUTE_BADGE_CREATOR', 'API_ATTENDANCE_LEGACY') THEN 'QR_MONITOR'
     WHEN resource_key IN ('WEB_MENU_MY_ABSENCES', 'WEB_ROUTE_MY_ABSENCES', 'API_ABSENCES') THEN 'ABSENCES'
   END
 WHERE resource_key IN ('WEB_MENU_ANALYTICS', 'WEB_MENU_MARGINS', 'WEB_ROUTE_ANALYTICS', 'WEB_ROUTE_MARGINS', 'API_ANALYTICS', 'API_MARGINS', 'WEB_MENU_SCANNER', 'WEB_ROUTE_SCANNER', 'WEB_MENU_TIMELINE', 'WEB_ROUTE_TIMELINE', 'API_TIMELINE', 'WEB_MENU_ATTENDANCE', 'WEB_MENU_BADGE_CREATOR', 'WEB_MENU_MY_ABSENCES', 'WEB_ROUTE_ATTENDANCE', 'WEB_ROUTE_BADGE_CREATOR', 'WEB_ROUTE_MY_ABSENCES', 'MOBILE_MENU_ATTENDANCE', 'MOBILE_ROUTE_ATTENDANCE', 'API_ATTENDANCE_V2', 'API_ADMIN_ATTENDANCE', 'API_ATTENDANCE_LEGACY', 'API_ABSENCES', 'JOB_ATTENDANCE_ANOMALIES');

INSERT INTO feature_resource_bindings (feature_key, resource_key)
SELECT 'PRESENZE', resource_key
  FROM feature_resources r
 WHERE NOT EXISTS (
   SELECT 1 FROM feature_resource_bindings b WHERE b.resource_key = r.resource_key
 )
ON CONFLICT (feature_key, resource_key) DO NOTHING;
