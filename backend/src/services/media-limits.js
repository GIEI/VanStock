/**
 * Per-plan upload quotas for job photos and videos.
 *
 * Limits apply independently to each (kind, media_type) bucket where:
 *   - kind        = 'problem' (pre-intervention) or 'repair' (post-intervention)
 *   - media_type  = 'image' or 'video'
 *
 * Use Infinity to mean "no cap".
 */
const PLAN_MEDIA_LIMITS = {
  BASIC:      { image: 1, video: 0 },
  PRO:        { image: 3, video: 1 },
  ENTERPRISE: { image: Infinity, video: Infinity },
};

function getLimitsFor(planType) {
  return PLAN_MEDIA_LIMITS[planType] || PLAN_MEDIA_LIMITS.BASIC;
}

/**
 * Verifies whether one more upload of the given media type would fit within
 * the company's plan for the specified job phase.
 *
 * MUST be called inside an open transaction on `client`. The company's
 * subscription row is locked FOR UPDATE so concurrent uploads serialize.
 *
 * Returns { ok, code?, reason?, used, max, planType }.
 */
async function checkMediaQuota(client, { jobId, companyId, kind, mediaType }) {
  const sub = await client.query(
    `SELECT plan_type FROM subscriptions WHERE company_id = $1 FOR UPDATE`,
    [companyId]
  );
  const planType = sub.rows[0]?.plan_type || 'BASIC';
  const limits = getLimitsFor(planType);
  const max = limits[mediaType] ?? 0;

  if (max === Infinity) {
    return { ok: true, used: 0, max: Infinity, planType };
  }

  const count = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM job_photos
     WHERE job_id = $1 AND type = $2 AND media_type = $3`,
    [jobId, kind, mediaType]
  );
  const used = count.rows[0].n;

  if (used >= max) {
    return {
      ok: false,
      code: 'MEDIA_LIMIT_EXCEEDED',
      reason: `Limite raggiunto per il piano ${planType} (${used}/${max} ${mediaType}).`,
      used, max, planType,
    };
  }
  return { ok: true, used, max, planType };
}

module.exports = { PLAN_MEDIA_LIMITS, getLimitsFor, checkMediaQuota };
