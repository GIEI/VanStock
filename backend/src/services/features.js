const db = require('../db');

async function getCompanyFeatures(companyId) {
  const { rows } = await db.query(
    `SELECT f.feature_key, f.name, f.description, f.is_active,
            COALESCE(cf.enabled, FALSE) AS enabled,
            cf.updated_at
       FROM features f
       LEFT JOIN company_features cf
         ON cf.feature_key = f.feature_key AND cf.company_id = $1
      ORDER BY f.name`,
    [companyId]
  );
  return rows;
}

async function getEnabledFeatureKeys(companyId) {
  const features = await getCompanyFeatures(companyId);
  return features.filter(feature => feature.is_active && feature.enabled)
    .map(feature => feature.feature_key);
}

async function getEnabledResourceKeys(companyId) {
  const { rows } = await db.query(
    `SELECT b.resource_key
       FROM feature_resource_bindings b
       JOIN features f ON f.feature_key = b.feature_key AND f.is_active = TRUE
       JOIN company_features cf ON cf.feature_key = b.feature_key AND cf.company_id = $1 AND cf.enabled = TRUE`,
    [companyId]
  );
  return rows.map(row => row.resource_key);
}

async function isFeatureEnabled(companyId, featureKey) {
  const { rows } = await db.query(
    `SELECT 1
       FROM features f
       JOIN company_features cf
         ON cf.feature_key = f.feature_key
      WHERE f.feature_key = $1
        AND f.is_active = TRUE
        AND cf.company_id = $2
        AND cf.enabled = TRUE`,
    [featureKey, companyId]
  );
  return rows.length > 0;
}

function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'superadmin') return next();
      if (!req.user?.company_id || !await isFeatureEnabled(req.user.company_id, featureKey)) {
        return res.status(403).json({
          error: 'Funzionalità non abilitata per questa azienda',
          code: 'FEATURE_NOT_ENABLED',
          feature: featureKey,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireResource(resourceKey) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'superadmin') return next();
      const { rows } = await db.query(
        `SELECT b.feature_key
           FROM feature_resource_bindings b
           JOIN features f ON f.feature_key = b.feature_key AND f.is_active = TRUE
           JOIN company_features cf
             ON cf.feature_key = b.feature_key AND cf.company_id = $1 AND cf.enabled = TRUE
          WHERE b.resource_key = $2`,
        [req.user?.company_id, resourceKey]
      );
      if (!rows.length) {
        return res.status(403).json({
          error: 'Funzionalità non abilitata per questa azienda',
          code: 'FEATURE_NOT_ENABLED',
          resource: resourceKey,
        });
      }
      req.feature = rows[0].feature_key;
      next();
    } catch (err) { next(err); }
  };
}

module.exports = { getCompanyFeatures, getEnabledFeatureKeys, getEnabledResourceKeys, isFeatureEnabled, requireFeature, requireResource };
