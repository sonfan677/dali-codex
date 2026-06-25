const {
  DEFAULT_CITY_CONFIG,
  CATEGORY_MAP,
  LEGACY_CATEGORY_ID_MAP,
  SCENE_LABEL_MAP,
  TYPE_OPTIONS_BY_SCENE,
  CATEGORY_TO_SCENE_TYPE,
  THEME_ID_SET,
  USER_VISIBLE_TAG_ALLOW_SET,
  SOCIAL_ENERGY_BY_SCENE,
  SOCIAL_ENERGY_BY_TYPE,
  USER_MAX_THEME_COUNT,
  OFFICIAL_MAX_THEME_COUNT,
  DEFAULT_USER_MAX_PARTICIPANTS_LIMIT,
  PUBLISH_REVIEW_PENDING_STATUS,
  CUSTOM_SCENE_ID,
  CUSTOM_SCENE_TYPE_STATS_COLLECTION,
  CUSTOM_TYPE_ID_PREFIX,
  FESTIVAL_THEME_COLLECTION_CANDIDATES,
  MAX_FESTIVAL_THEME_TAGS,
  HIGH_RISK_TYPE_SET,
  HIGH_RISK_KEYWORDS,
  DALI_PREFECTURE_BOUNDS,
  VERIFY_AUTO_APPROVE_DEFAULT_MINUTES,
} = require('../constants/activity_constants')

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    isAdmin: adminOpenids.includes(openid),
  }
}

function resolveUserMaxParticipantsLimit() {
  const raw = Number(process.env.USER_PUBLISH_MAX_PARTICIPANTS || DEFAULT_USER_MAX_PARTICIPANTS_LIMIT)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_USER_MAX_PARTICIPANTS_LIMIT
  return Math.max(1, Math.min(300, Math.round(raw)))
}

function resolvePublishRiskGate({
  typeId = '',
  title = '',
  description = '',
  opsTagProfile = null,
} = {}) {
  const reasonCodes = []
  const safeTypeId = String(typeId || '').trim()
  if (safeTypeId && HIGH_RISK_TYPE_SET.has(safeTypeId)) {
    reasonCodes.push(`TYPE_${safeTypeId.toUpperCase()}`)
  }

  const text = `${String(title || '')} ${String(description || '')}`.toLowerCase()
  if (HIGH_RISK_KEYWORDS.some((kw) => text.includes(String(kw).toLowerCase()))) {
    reasonCodes.push('KEYWORD_HIGH_RISK')
  }

  const riskBaseTags = Array.isArray(opsTagProfile?.dimensions?.risk?.base)
    ? opsTagProfile.dimensions.risk.base
    : []
  const hasRiskBaseHit = riskBaseTags.some((tag) => {
    const t = String(tag || '').trim()
    return ['中风险', '高风险', '需人工审核', '需二次确认', '需线下核验'].includes(t)
  })
  if (hasRiskBaseHit) {
    reasonCodes.push('OPS_RISK_BASE')
  }

  const isHighRisk = reasonCodes.length > 0
  return {
    level: isHighRisk ? 'high' : 'normal',
    forceManualReview: isHighRisk,
    reasonCodes: [...new Set(reasonCodes)].slice(0, 8),
  }
}

module.exports = {
  parseAdminMeta,
  resolveUserMaxParticipantsLimit,
  resolvePublishRiskGate,
}
