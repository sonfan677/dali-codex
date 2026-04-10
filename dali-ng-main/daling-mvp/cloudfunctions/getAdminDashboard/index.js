const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const roleMap = (process.env.ADMIN_ROLE_MAP || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})

  const cityScopeMap = (process.env.ADMIN_CITY_SCOPE || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})

  return {
    isAdmin: adminOpenids.includes(openid),
    adminRole: roleMap[openid] || 'superAdmin',
    cityId: cityScopeMap[openid] || 'dali',
  }
}

async function fetchActivitiesByIds(ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (!uniqueIds.length) return []

  const results = []
  const chunkSize = 20
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize)
    const { data } = await db.collection('activities')
      .where({ _id: _.in(chunk) })
      .field({
        _id: true,
        cityId: true,
        sceneId: true,
        sceneName: true,
        typeId: true,
        typeName: true,
        categoryId: true,
        categoryLabel: true,
        title: true,
        publisherId: true,
        publisherNickname: true,
        currentParticipants: true,
        minParticipants: true,
        status: true,
        isGroupFormation: true,
        formationStatus: true,
        isRecommended: true,
        chargeType: true,
        pricing: true,
        riskLevel: true,
        riskScore: true,
        riskReasonCodes: true,
        opsTagProfile: true,
        location: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
      })
      .get()
    results.push(...(data || []))
  }
  return results
}

async function fetchRecentParticipations(maxCount = PARTICIPATION_ANALYSIS_LIMIT) {
  const safeMax = Math.max(100, Math.min(3000, Number(maxCount || PARTICIPATION_ANALYSIS_LIMIT)))
  const pageSize = 100
  const results = []
  let skip = 0
  while (results.length < safeMax) {
    const rest = safeMax - results.length
    const take = Math.min(pageSize, rest)
    const { data } = await db.collection('participations')
      .orderBy('joinedAt', 'desc')
      .skip(skip)
      .limit(take)
      .field({
        _id: true,
        _openid: true,
        cityId: true,
        activityId: true,
        userId: true,
        status: true,
        joinedAt: true,
        appliedAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
      })
      .get()
      .catch(() => ({ data: [] }))
    if (!Array.isArray(data) || data.length === 0) break
    results.push(...data)
    if (data.length < take) break
    skip += data.length
  }
  return results.slice(0, safeMax)
}

function buildReportMetaMap(reportList = []) {
  return reportList.reduce((acc, item) => {
    const activityId = item.targetId
    if (!activityId) return acc

    const current = acc[activityId] || {
      total: 0,
      pending: 0,
      handled: 0,
      ignored: 0,
      latestReason: '',
      latestReportedAt: null,
      latestStatus: 'PENDING',
    }

    current.total += 1
    if (item.reportStatus === 'HANDLED') current.handled += 1
    else if (item.reportStatus === 'IGNORED') current.ignored += 1
    else current.pending += 1

    const reportMs = new Date(item.createdAt).getTime()
    const latestMs = new Date(current.latestReportedAt).getTime()
    if (!current.latestReportedAt || (Number.isFinite(reportMs) && reportMs > latestMs)) {
      current.latestReason = item.reason || ''
      current.latestReportedAt = item.createdAt || null
      current.latestStatus = item.reportStatus || 'PENDING'
    }

    acc[activityId] = current
    return acc
  }, {})
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function addCounter(counter = {}, list = []) {
  safeArray(list).forEach((item) => {
    const tag = String(item || '').trim()
    if (!tag) return
    counter[tag] = Number(counter[tag] || 0) + 1
  })
}

function counterRows(counter = {}, limit = 8) {
  return Object.keys(counter)
    .map((label) => ({ label, count: Number(counter[label] || 0) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.label.localeCompare(b.label, 'zh-Hans-CN')))
    .slice(0, limit)
}

function buildOpsTagOverview(activityList = []) {
  const total = Array.isArray(activityList) ? activityList.length : 0
  if (!total) {
    return {
      total,
      tagged: 0,
      coverageRate: 0,
      topCoreTags: [],
      topActivityGoal: [],
      topChargingMode: [],
      topRiskBase: [],
      topKeywordRules: [],
      topRegionLayer: [],
      topDistribution: [],
      triggerCounts: {
        isOutdoor: 0,
        isAlcohol: 0,
        isChildren: 0,
        isPet: 0,
        isApprovalRequired: 0,
      },
    }
  }

  const coreCounter = {}
  const goalCounter = {}
  const chargeCounter = {}
  const riskCounter = {}
  const keywordCounter = {}
  const regionCounter = {}
  const distributionCounter = {}
  const triggerCounts = {
    isOutdoor: 0,
    isAlcohol: 0,
    isChildren: 0,
    isPet: 0,
    isApprovalRequired: 0,
  }

  let tagged = 0
  activityList.forEach((item) => {
    const profile = item?.opsTagProfile
    if (!profile || typeof profile !== 'object') return
    tagged += 1
    addCounter(coreCounter, profile.coreTags)
    addCounter(goalCounter, profile?.dimensions?.activityGoal)
    addCounter(chargeCounter, profile?.dimensions?.commercial?.chargingMode)
    addCounter(riskCounter, profile?.dimensions?.risk?.base)
    addCounter(keywordCounter, (profile?.keywordEnhancement?.hits || []).map((item) => item?.label || ''))
    addCounter(regionCounter, profile?.dimensions?.region?.cityLayer)
    addCounter(distributionCounter, profile?.dimensions?.operation?.distribution)
    const flags = profile?.riskTriggerFlags || {}
    if (flags.isOutdoor) triggerCounts.isOutdoor += 1
    if (flags.isAlcohol) triggerCounts.isAlcohol += 1
    if (flags.isChildren) triggerCounts.isChildren += 1
    if (flags.isPet) triggerCounts.isPet += 1
    if (flags.isApprovalRequired) triggerCounts.isApprovalRequired += 1
  })

  return {
    total,
    tagged,
    coverageRate: total > 0 ? Number((tagged / total).toFixed(4)) : 0,
    topCoreTags: counterRows(coreCounter, 10),
    topActivityGoal: counterRows(goalCounter, 8),
    topChargingMode: counterRows(chargeCounter, 8),
    topRiskBase: counterRows(riskCounter, 8),
    topKeywordRules: counterRows(keywordCounter, 8),
    topRegionLayer: counterRows(regionCounter, 8),
    topDistribution: counterRows(distributionCounter, 8),
    triggerCounts,
  }
}

function resolveActionLinkedActivityId(item = {}) {
  if (item.targetType === 'activity' && item.targetId) return item.targetId
  if (item.linkedActivityId) return item.linkedActivityId
  if (item.beforeState?.activity?._id) return item.beforeState.activity._id
  if (item.beforeState?.targetId) return item.beforeState.targetId
  if (item.afterState?.activity?._id) return item.afterState.activity._id
  if (item.afterState?.targetId) return item.afterState.targetId
  return ''
}

function maybeDecodeSensitive(raw = '') {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (!/^[A-Za-z0-9+/=]+$/.test(text) || text.length % 4 !== 0) return text
  try {
    const decoded = Buffer.from(text, 'base64').toString('utf8')
    if (!decoded || /[\u0000-\u0008]/.test(decoded)) return ''
    return decoded
  } catch (e) {
    return ''
  }
}

function maskPhone(phone = '') {
  const p = String(phone || '')
  if (p.length < 7) return p ? '***' : ''
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}

function maskName(name = '') {
  const n = String(name || '')
  if (!n) return ''
  if (n.length <= 1) return '*'
  return `${n.slice(0, 1)}${'*'.repeat(Math.max(1, n.length - 1))}`
}

function normalizeIdentityReasons(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 8)
}

function calcUserRiskScore(user = {}) {
  const noShowCount = Number(user.noShowCount || 0)
  const reportAgainstCount = Number(user.reportAgainstCount || 0)
  const recentPublish7dCount = Number(user.recentPublish7dCount || 0)
  const locationAnomalyCount = Number(user.locationAnomalyCount || 0)
  const overloadPublishPenalty = Math.max(0, recentPublish7dCount - 5) * 3
  const score = 100
    - noShowCount * 12
    - reportAgainstCount * 8
    - locationAnomalyCount * 5
    - overloadPublishPenalty
  return Math.max(0, Math.min(100, Math.round(score)))
}

const VERIFY_AUTO_APPROVE_DEFAULT_MINUTES = 10
const ANALYSIS_WINDOW_DAYS = 90
const PARTICIPATION_ANALYSIS_LIMIT = 1200
const AUTO_USER_SEGMENT_SYNC_ENABLED = String(process.env.AUTO_USER_SEGMENT_SYNC || 'on').toLowerCase() !== 'off'
const MAX_SEGMENT_SYNC_PER_LOAD = 80
const DEFAULT_SEGMENT_RULE_CONFIG = {
  visitor: {
    maxSpanDays: 14,
    maxActiveDays30: 7,
    maxPublish90: 1,
    maxJoin90: 5,
  },
  local: {
    minSpanDays: 90,
    minActiveDays60: 20,
    minPublish90: 6,
  },
  confidence: {
    lowActiveDays90Threshold: 2,
  },
}

function toTimestamp(value) {
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

function toDayKey(value) {
  const ts = toTimestamp(value)
  if (!Number.isFinite(ts)) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function hoursOf(value) {
  const ts = toTimestamp(value)
  if (!Number.isFinite(ts)) return NaN
  return new Date(ts).getHours()
}

function isNightStart(value) {
  const hour = hoursOf(value)
  if (!Number.isFinite(hour)) return false
  return hour >= 19 || hour < 2
}

function pctText(num = 0, digits = 1) {
  const n = Number(num || 0)
  if (!Number.isFinite(n)) return '0%'
  return `${(n * 100).toFixed(digits)}%`
}

function pickTopScene(counter = {}, minCount = 1) {
  const rows = Object.keys(counter)
    .map((sceneName) => ({ sceneName, count: Number(counter[sceneName] || 0) }))
    .filter((item) => item.count >= minCount)
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.sceneName.localeCompare(b.sceneName, 'zh-Hans-CN')))
  return rows[0] || null
}

function normalizeSegmentCode(raw = '') {
  const safe = String(raw || '').trim().toLowerCase()
  if (!safe) return 'unknown'
  if (['游客', 'tourist', 'visitor', 'travel'].includes(safe)) return 'visitor'
  if (['旅居', '旅居者', 'nomad', 'stay'].includes(safe)) return 'nomad'
  if (['本地', '本地人', '常住', 'local', 'resident'].includes(safe)) return 'local'
  if (['unknown', 'none', 'skip', '暂不选择', '未选择'].includes(safe)) return 'unknown'
  return 'unknown'
}

function parseIntSafe(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

function sanitizeSegmentRuleConfig(raw = {}) {
  const visitor = raw?.visitor || {}
  const local = raw?.local || {}
  const confidence = raw?.confidence || {}
  return {
    visitor: {
      maxSpanDays: Math.max(1, Math.min(60, parseIntSafe(visitor.maxSpanDays, DEFAULT_SEGMENT_RULE_CONFIG.visitor.maxSpanDays))),
      maxActiveDays30: Math.max(1, Math.min(30, parseIntSafe(visitor.maxActiveDays30, DEFAULT_SEGMENT_RULE_CONFIG.visitor.maxActiveDays30))),
      maxPublish90: Math.max(0, Math.min(20, parseIntSafe(visitor.maxPublish90, DEFAULT_SEGMENT_RULE_CONFIG.visitor.maxPublish90))),
      maxJoin90: Math.max(0, Math.min(40, parseIntSafe(visitor.maxJoin90, DEFAULT_SEGMENT_RULE_CONFIG.visitor.maxJoin90))),
    },
    local: {
      minSpanDays: Math.max(30, Math.min(365, parseIntSafe(local.minSpanDays, DEFAULT_SEGMENT_RULE_CONFIG.local.minSpanDays))),
      minActiveDays60: Math.max(5, Math.min(60, parseIntSafe(local.minActiveDays60, DEFAULT_SEGMENT_RULE_CONFIG.local.minActiveDays60))),
      minPublish90: Math.max(0, Math.min(60, parseIntSafe(local.minPublish90, DEFAULT_SEGMENT_RULE_CONFIG.local.minPublish90))),
    },
    confidence: {
      lowActiveDays90Threshold: Math.max(1, Math.min(20, parseIntSafe(confidence.lowActiveDays90Threshold, DEFAULT_SEGMENT_RULE_CONFIG.confidence.lowActiveDays90Threshold))),
    },
  }
}

async function loadSegmentRuleConfig(cityId = 'dali') {
  let raw = null
  try {
    const byId = await db.collection('opsConfigs').doc('user_segment_rule').get()
    raw = byId?.data || null
  } catch (e) {}
  if (!raw) {
    try {
      const byKey = await db.collection('opsConfigs')
        .where({ key: 'user_segment_rule', cityId })
        .limit(1)
        .get()
      raw = byKey?.data?.[0] || null
    } catch (e) {}
  }
  const cfg = sanitizeSegmentRuleConfig(raw?.segmentRuleConfig || DEFAULT_SEGMENT_RULE_CONFIG)
  return {
    config: cfg,
    version: String(raw?.version || 'segment_rule_default'),
    updatedAt: raw?.updatedAt || null,
  }
}

function segmentLabel(code = 'unknown') {
  const map = {
    visitor: '游客',
    nomad: '旅居者',
    local: '本地常住',
    unknown: '未分群',
  }
  return map[String(code || '').toLowerCase()] || '未分群'
}

function buildUserBehaviorMap(userRows = [], activityRows = [], participationRows = []) {
  const map = new Map()
  const ensure = (openid = '') => {
    const key = String(openid || '').trim()
    if (!key) return null
    if (!map.has(key)) {
      map.set(key, {
        openid: key,
        firstSeenMs: NaN,
        lastSeenMs: NaN,
        activeDaySet30: new Set(),
        activeDaySet60: new Set(),
        activeDaySet90: new Set(),
        recentPublish90: 0,
        recentJoin90: 0,
        nightPublish90: 0,
        nightJoin90: 0,
        joinedSceneCounter: {},
      })
    }
    return map.get(key)
  }
  const nowMs = Date.now()
  const start30 = nowMs - 30 * 24 * 60 * 60 * 1000
  const start60 = nowMs - 60 * 24 * 60 * 60 * 1000
  const start90 = nowMs - ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000

  const markActive = (state, ts) => {
    if (!state || !Number.isFinite(ts)) return
    state.firstSeenMs = Number.isFinite(state.firstSeenMs) ? Math.min(state.firstSeenMs, ts) : ts
    state.lastSeenMs = Number.isFinite(state.lastSeenMs) ? Math.max(state.lastSeenMs, ts) : ts
    const dayKey = toDayKey(ts)
    if (!dayKey) return
    if (ts >= start30) state.activeDaySet30.add(dayKey)
    if (ts >= start60) state.activeDaySet60.add(dayKey)
    if (ts >= start90) state.activeDaySet90.add(dayKey)
  }

  userRows.forEach((item) => {
    const state = ensure(item?._openid)
    if (!state) return
    markActive(state, toTimestamp(item.createdAt))
    markActive(state, toTimestamp(item.updatedAt))
  })

  activityRows.forEach((item) => {
    const state = ensure(item?.publisherId || item?._openid)
    if (!state) return
    const createdTs = toTimestamp(item.createdAt)
    markActive(state, createdTs)
    markActive(state, toTimestamp(item.updatedAt))
    if (Number.isFinite(createdTs) && createdTs >= start90) {
      state.recentPublish90 += 1
      if (isNightStart(item.startTime)) state.nightPublish90 += 1
    }
  })

  participationRows.forEach((item) => {
    const openid = item?.userId || item?._openid
    const state = ensure(openid)
    if (!state) return
    const joinedTs = toTimestamp(item.joinedAt || item.appliedAt || item.createdAt)
    markActive(state, joinedTs)
    markActive(state, toTimestamp(item.updatedAt))
    const status = String(item.status || '')
    if (Number.isFinite(joinedTs) && joinedTs >= start90 && ['joined', 'pending_approval', 'waitlist', 'cancelled'].includes(status)) {
      state.recentJoin90 += 1
      if (isNightStart(item.activityStartTime)) state.nightJoin90 += 1
      const sceneName = String(item.activitySceneName || '').trim()
      if (sceneName) state.joinedSceneCounter[sceneName] = Number(state.joinedSceneCounter[sceneName] || 0) + 1
    }
  })

  return map
}

function inferAutoSegment(behavior = {}, user = {}, ruleConfig = DEFAULT_SEGMENT_RULE_CONFIG) {
  const cfg = sanitizeSegmentRuleConfig(ruleConfig || DEFAULT_SEGMENT_RULE_CONFIG)
  const firstMs = Number(behavior.firstSeenMs)
  const lastMs = Number(behavior.lastSeenMs)
  const spanDays = (Number.isFinite(firstMs) && Number.isFinite(lastMs))
    ? Math.max(0, Math.round((lastMs - firstMs) / (24 * 60 * 60 * 1000)))
    : 0
  const active30 = Number(behavior.activeDaySet30?.size || 0)
  const active60 = Number(behavior.activeDaySet60?.size || 0)
  const active90 = Number(behavior.activeDaySet90?.size || 0)
  const publish90 = Number(behavior.recentPublish90 || 0)
  const join90 = Number(behavior.recentJoin90 || 0)
  const noShowCount = Number(user.noShowCount || 0)
  const reportAgainstCount = Number(user.reportAgainstCount || 0)
  const riskPenalty = noShowCount + reportAgainstCount

  let autoInferred = 'nomad'
  let confidence = 'medium'
  const reasons = []

  if (spanDays >= cfg.local.minSpanDays || active60 >= cfg.local.minActiveDays60 || publish90 >= cfg.local.minPublish90) {
    autoInferred = 'local'
    confidence = spanDays >= 120 || active60 >= 28 ? 'high' : 'medium'
    reasons.push('活跃跨度/活跃天数较高')
  } else if (
    spanDays <= cfg.visitor.maxSpanDays
    && active30 <= cfg.visitor.maxActiveDays30
    && publish90 <= cfg.visitor.maxPublish90
    && join90 <= cfg.visitor.maxJoin90
  ) {
    autoInferred = 'visitor'
    confidence = spanDays <= 10 && active30 <= 5 ? 'high' : 'medium'
    reasons.push('短周期低频活跃特征')
  } else {
    autoInferred = 'nomad'
    confidence = (spanDays >= 45 || active60 >= 10 || publish90 >= 2) ? 'high' : 'medium'
    reasons.push('中周期持续活跃特征')
  }

  if (active90 <= cfg.confidence.lowActiveDays90Threshold) confidence = 'low'
  if (riskPenalty >= 4 && confidence === 'high') confidence = 'medium'

  return {
    autoInferred,
    confidence,
    evidence: {
      spanDays,
      activeDays30: active30,
      activeDays60: active60,
      activeDays90: active90,
      recentPublish90: publish90,
      recentJoin90: join90,
      nightPublish90: Number(behavior.nightPublish90 || 0),
      nightJoin90: Number(behavior.nightJoin90 || 0),
    },
    reasons,
  }
}

function resolveFinalSegment(user = {}, inferred = {}) {
  const userSegment = user?.userSegment || {}
  const selfDeclared = normalizeSegmentCode(userSegment.selfDeclared || user.segmentSelfDeclared || '')
  const manualLock = normalizeSegmentCode(userSegment.manualLock || user.segmentManualLock || '')
  const autoInferred = normalizeSegmentCode(inferred.autoInferred || 'unknown')

  if (manualLock !== 'unknown') {
    return {
      selfDeclared,
      autoInferred,
      finalLabel: manualLock,
      confidence: 'high',
      source: 'manual_lock',
    }
  }
  if (selfDeclared !== 'unknown') {
    return {
      selfDeclared,
      autoInferred,
      finalLabel: selfDeclared,
      confidence: inferred.confidence === 'low' ? 'medium' : inferred.confidence,
      source: 'self_declared',
    }
  }
  return {
    selfDeclared: 'unknown',
    autoInferred,
    finalLabel: autoInferred,
    confidence: inferred.confidence || 'medium',
    source: 'auto_inferred',
  }
}

function buildUserSegmentPack(userRows = [], activityRows = [], participationRows = [], segmentRuleConfig = DEFAULT_SEGMENT_RULE_CONFIG) {
  const behaviorMap = buildUserBehaviorMap(userRows, activityRows, participationRows)
  const segmentList = userRows.map((user) => {
    const behavior = behaviorMap.get(user?._openid) || {}
    const inferred = inferAutoSegment(behavior, user, segmentRuleConfig)
    const finalResult = resolveFinalSegment(user, inferred)
    return {
      openid: user._openid || '',
      nickname: user.nickname || '',
      cityId: user.cityId || 'dali',
      ...finalResult,
      evidence: inferred.evidence,
      reasons: inferred.reasons,
    }
  })

  const overview = {
    total: segmentList.length,
    byFinal: { visitor: 0, nomad: 0, local: 0, unknown: 0 },
    bySource: { manual_lock: 0, self_declared: 0, auto_inferred: 0 },
    byConfidence: { high: 0, medium: 0, low: 0 },
  }
  segmentList.forEach((row) => {
    const key = normalizeSegmentCode(row.finalLabel)
    overview.byFinal[key] = Number(overview.byFinal[key] || 0) + 1
    const source = String(row.source || 'auto_inferred')
    overview.bySource[source] = Number(overview.bySource[source] || 0) + 1
    const confidence = String(row.confidence || 'medium')
    overview.byConfidence[confidence] = Number(overview.byConfidence[confidence] || 0) + 1
  })
  return { segmentList, overview }
}

async function syncUserSegmentsToDb(userRows = [], segmentList = []) {
  if (!AUTO_USER_SEGMENT_SYNC_ENABLED) return { synced: 0, touched: 0, skipped: true }
  const byOpenid = segmentList.reduce((acc, item) => {
    if (item?.openid) acc[item.openid] = item
    return acc
  }, {})
  const targets = (userRows || [])
    .map((user) => {
      const next = byOpenid[user?._openid]
      if (!next || !user?._id || !user?._openid) return null
      const prev = user.userSegment || {}
      const prevFinal = normalizeSegmentCode(prev.finalLabel || '')
      const changed = (
        normalizeSegmentCode(prev.selfDeclared || '') !== normalizeSegmentCode(next.selfDeclared || '')
        || normalizeSegmentCode(prev.autoInferred || '') !== normalizeSegmentCode(next.autoInferred || '')
        || prevFinal !== normalizeSegmentCode(next.finalLabel || '')
        || String(prev.confidence || '') !== String(next.confidence || '')
        || String(prev.source || '') !== String(next.source || '')
      )
      if (!changed) return null
      return {
        docId: user._id,
        openid: user._openid,
        prevFinal,
        nextFinal: normalizeSegmentCode(next.finalLabel || ''),
        patch: {
          selfDeclared: next.selfDeclared,
          autoInferred: next.autoInferred,
          finalLabel: next.finalLabel,
          confidence: next.confidence,
          source: next.source,
          evidence: next.evidence,
          reasons: next.reasons,
          version: 'segment_v1',
          updatedAt: db.serverDate(),
        },
      }
    })
    .filter(Boolean)
    .slice(0, MAX_SEGMENT_SYNC_PER_LOAD)

  let synced = 0
  let switched = 0
  for (const item of targets) {
    try {
      await db.collection('users').doc(item.docId).update({
        data: {
          userSegment: item.patch,
          segmentTagVersion: 'segment_v1',
          segmentUpdatedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      synced += 1
      if (item.prevFinal !== item.nextFinal && item.prevFinal !== 'unknown') {
        switched += 1
        await db.collection('adminActions').add({
          data: {
            actionId: `segment_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            adminId: 'system',
            adminOpenid: 'system',
            adminRole: 'system',
            targetId: item.openid,
            targetType: 'user',
            action: 'segment_auto_switch',
            actionType: 'segment_auto_switch',
            reason: '用户分群自动切换',
            beforeState: { finalLabel: item.prevFinal },
            afterState: { finalLabel: item.nextFinal },
            actionSource: 'system',
            canAutoExecute: true,
            manualOverride: false,
            cityId: 'dali',
            result: `${segmentLabel(item.prevFinal)} -> ${segmentLabel(item.nextFinal)}`,
            createdAt: db.serverDate(),
          },
        }).catch(() => {})
      }
    } catch (e) {
      console.error('同步用户分群失败', item.openid, e)
    }
  }

  return { synced, switched, touched: targets.length, skipped: false }
}

function buildSegmentLabelMap(segmentList = []) {
  return segmentList.reduce((acc, item) => {
    const openid = String(item?.openid || '').trim()
    if (!openid) return acc
    acc[openid] = normalizeSegmentCode(item.finalLabel || 'unknown')
    return acc
  }, {})
}

function buildSceneCounterFromActivities(activityRows = [], filterFn = null) {
  const counter = {}
  ;(activityRows || []).forEach((item) => {
    if (typeof filterFn === 'function' && !filterFn(item)) return
    const sceneName = String(item?.sceneName || '未分类场景').trim() || '未分类场景'
    counter[sceneName] = Number(counter[sceneName] || 0) + 1
  })
  return counter
}

function buildSceneCounterFromParticipations(participationRows = [], segmentMap = {}, segmentCode = 'unknown') {
  const counter = {}
  ;(participationRows || []).forEach((item) => {
    if (String(item?.status || '') !== 'joined') return
    const openid = String(item?.userId || item?._openid || '').trim()
    if (!openid) return
    const seg = normalizeSegmentCode(segmentMap[openid] || 'unknown')
    if (seg !== segmentCode) return
    const sceneName = String(item?.activitySceneName || '').trim()
    if (!sceneName) return
    counter[sceneName] = Number(counter[sceneName] || 0) + 1
  })
  return counter
}

function buildRepeatByScene(participationRows = []) {
  const sceneUserCounter = {}
  ;(participationRows || []).forEach((item) => {
    if (String(item?.status || '') !== 'joined') return
    const sceneName = String(item?.activitySceneName || '').trim()
    const userId = String(item?.userId || item?._openid || '').trim()
    if (!sceneName || !userId) return
    sceneUserCounter[sceneName] = sceneUserCounter[sceneName] || {}
    sceneUserCounter[sceneName][userId] = Number(sceneUserCounter[sceneName][userId] || 0) + 1
  })

  return Object.keys(sceneUserCounter).map((sceneName) => {
    const users = sceneUserCounter[sceneName]
    const allUserIds = Object.keys(users)
    const uniqueUsers = allUserIds.length
    const repeatUsers = allUserIds.filter((uid) => Number(users[uid] || 0) >= 2).length
    const rate = uniqueUsers > 0 ? repeatUsers / uniqueUsers : 0
    return { sceneName, uniqueUsers, repeatUsers, repeatRate: rate }
  })
}

function buildOperationInsightCards(input = {}) {
  const activityRows = Array.isArray(input.activityRows) ? input.activityRows : []
  const participationRows = Array.isArray(input.participationRows) ? input.participationRows : []
  const segmentList = Array.isArray(input.segmentList) ? input.segmentList : []
  const segmentMap = buildSegmentLabelMap(segmentList)
  const nowMs = Date.now()
  const start90Ms = nowMs - ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const activities90 = activityRows.filter((item) => {
    const ts = toTimestamp(item.createdAt || item.startTime)
    return Number.isFinite(ts) && ts >= start90Ms
  })

  const cards = []
  const pickRecommendCandidates = (sceneName = '', opts = {}) => {
    const limit = Number(opts.limit || 3)
    return activities90
      .filter((item) => String(item.sceneName || '') === String(sceneName || ''))
      .filter((item) => ['OPEN', 'FULL'].includes(String(item.status || '')))
      .filter((item) => !item.isRecommended)
      .sort((a, b) => Number(b.currentParticipants || 0) - Number(a.currentParticipants || 0))
      .slice(0, limit)
      .map((item) => ({
        activityId: item._id,
        title: item.title || '未命名活动',
        participants: Number(item.currentParticipants || 0),
      }))
  }

  // 1) 大理发起最多
  const launchCounter = buildSceneCounterFromActivities(activities90, (item) => String(item.cityId || 'dali') === 'dali')
  const launchTop = pickTopScene(launchCounter, 1)
  cards.push({
    key: 'top_launch_scene',
    title: '大理用户发起最多的活动',
    summary: launchTop ? `近${ANALYSIS_WINDOW_DAYS}天发起最多的是「${launchTop.sceneName}」` : '样本不足，暂未形成稳定结论',
    metric: launchTop ? `${launchTop.count} 场` : '--',
    sampleSize: activities90.length,
    confidence: activities90.length >= 20 ? 'high' : activities90.length >= 8 ? 'medium' : 'low',
    suggestion: launchTop ? `建议围绕「${launchTop.sceneName}」做固定档期和推荐位实验。` : '先补充样本后再看趋势。',
    actionType: launchTop ? 'batch_recommend' : '',
    actionLabel: launchTop ? '一键推荐候选活动' : '',
    actionPayload: launchTop ? {
      sceneName: launchTop.sceneName,
      reason: `运营结论卡执行：放大「${launchTop.sceneName}」供给`,
      candidates: pickRecommendCandidates(launchTop.sceneName),
    } : null,
  })

  // 2) 游客/旅居/本地偏好
  const visitorTop = pickTopScene(buildSceneCounterFromParticipations(participationRows, segmentMap, 'visitor'), 1)
  const nomadTop = pickTopScene(buildSceneCounterFromParticipations(participationRows, segmentMap, 'nomad'), 1)
  const localTop = pickTopScene(buildSceneCounterFromParticipations(participationRows, segmentMap, 'local'), 1)
  cards.push({
    key: 'segment_preference',
    title: '游客/旅居/本地偏好',
    summary: `游客偏好：${visitorTop?.sceneName || '暂无'}；旅居偏好：${nomadTop?.sceneName || '暂无'}；本地偏好：${localTop?.sceneName || '暂无'}`,
    metric: `游客${visitorTop?.count || 0} / 旅居${nomadTop?.count || 0} / 本地${localTop?.count || 0}`,
    sampleSize: participationRows.filter((item) => String(item.status || '') === 'joined').length,
    confidence: participationRows.length >= 40 ? 'high' : participationRows.length >= 15 ? 'medium' : 'low',
    suggestion: '按分群分别推首页“猜你想去”，并对比7日报名提升。',
    actionType: 'copy_summary',
    actionLabel: '复制分群偏好结论',
    actionPayload: {
      text: `游客偏好：${visitorTop?.sceneName || '暂无'}；旅居偏好：${nomadTop?.sceneName || '暂无'}；本地偏好：${localTop?.sceneName || '暂无'}`,
    },
  })

  // 3) 哪类更容易成局
  const groupRows = activities90.filter((item) => !!item.isGroupFormation)
  const formingByScene = {}
  groupRows.forEach((item) => {
    const sceneName = String(item.sceneName || '未分类场景')
    const minNeed = Number(item.minParticipants || 0)
    const current = Number(item.currentParticipants || 0)
    const formed = String(item.formationStatus || '') === 'CONFIRMED' || (minNeed > 0 && current >= minNeed)
    formingByScene[sceneName] = formingByScene[sceneName] || { total: 0, formed: 0 }
    formingByScene[sceneName].total += 1
    if (formed) formingByScene[sceneName].formed += 1
  })
  const formingRows = Object.keys(formingByScene).map((sceneName) => {
    const item = formingByScene[sceneName]
    const rate = item.total > 0 ? item.formed / item.total : 0
    return { sceneName, ...item, rate }
  }).sort((a, b) => (b.rate !== a.rate ? b.rate - a.rate : b.formed - a.formed))
  const easiest = formingRows.find((item) => item.total >= 2) || formingRows[0]
  cards.push({
    key: 'forming_easiest',
    title: '最容易成局的活动类型',
    summary: easiest ? `「${easiest.sceneName}」成局率最高` : '暂无成局样本',
    metric: easiest ? `${pctText(easiest.rate)}（${easiest.formed}/${easiest.total}）` : '--',
    sampleSize: groupRows.length,
    confidence: groupRows.length >= 16 ? 'high' : groupRows.length >= 8 ? 'medium' : 'low',
    suggestion: easiest ? `优先把「${easiest.sceneName}」做成固定周更栏目。` : '先增加需要成团的活动样本。',
    actionType: easiest ? 'batch_recommend' : '',
    actionLabel: easiest ? '一键推荐该类型候选' : '',
    actionPayload: easiest ? {
      sceneName: easiest.sceneName,
      reason: `运营结论卡执行：提升「${easiest.sceneName}」成局效率`,
      candidates: pickRecommendCandidates(easiest.sceneName),
    } : null,
  })

  // 4) 夜场适配
  const nightRows = activities90.filter((item) => isNightStart(item.startTime))
  const nightByScene = {}
  nightRows.forEach((item) => {
    const sceneName = String(item.sceneName || '未分类场景')
    nightByScene[sceneName] = nightByScene[sceneName] || { total: 0, participants: 0 }
    nightByScene[sceneName].total += 1
    nightByScene[sceneName].participants += Number(item.currentParticipants || 0)
  })
  const nightTop = Object.keys(nightByScene)
    .map((sceneName) => {
      const item = nightByScene[sceneName]
      return {
        sceneName,
        total: item.total,
        avgParticipants: item.total > 0 ? item.participants / item.total : 0,
      }
    })
    .sort((a, b) => (b.avgParticipants !== a.avgParticipants ? b.avgParticipants - a.avgParticipants : b.total - a.total))[0]
  cards.push({
    key: 'night_fit_scene',
    title: '更适合夜场的活动',
    summary: nightTop ? `夜场平均参与人数最高的是「${nightTop.sceneName}」` : '夜场样本不足',
    metric: nightTop ? `${nightTop.avgParticipants.toFixed(1)}人/场` : '--',
    sampleSize: nightRows.length,
    confidence: nightRows.length >= 12 ? 'high' : nightRows.length >= 6 ? 'medium' : 'low',
    suggestion: nightTop ? `夜场优先排「${nightTop.sceneName}」，并加强安全提示。` : '先积累夜场活动样本。',
    actionType: nightTop ? 'batch_recommend' : '',
    actionLabel: nightTop ? '一键推荐夜场候选' : '',
    actionPayload: nightTop ? {
      sceneName: nightTop.sceneName,
      reason: `运营结论卡执行：夜场放大「${nightTop.sceneName}」`,
      candidates: pickRecommendCandidates(nightTop.sceneName),
    } : null,
  })

  // 5) 复购表现
  const repeatRows = buildRepeatByScene(participationRows)
  const repeatTop = repeatRows
    .filter((item) => item.uniqueUsers >= 3)
    .sort((a, b) => (b.repeatRate !== a.repeatRate ? b.repeatRate - a.repeatRate : b.repeatUsers - a.repeatUsers))[0]
  cards.push({
    key: 'repeat_best_scene',
    title: '复购（复参与）表现最佳',
    summary: repeatTop ? `「${repeatTop.sceneName}」复参与率最高` : '暂无可用复参与样本',
    metric: repeatTop ? `${pctText(repeatTop.repeatRate)}（${repeatTop.repeatUsers}/${repeatTop.uniqueUsers}）` : '--',
    sampleSize: repeatRows.reduce((sum, item) => sum + item.uniqueUsers, 0),
    confidence: repeatRows.length >= 6 ? 'medium' : 'low',
    suggestion: repeatTop ? `针对「${repeatTop.sceneName}」增加会员/连续参与激励。` : '先扩大连续两次参与样本。',
    actionType: repeatTop ? 'copy_summary' : '',
    actionLabel: repeatTop ? '复制复购运营建议' : '',
    actionPayload: repeatTop ? {
      text: `复参与最佳：${repeatTop.sceneName}（${pctText(repeatTop.repeatRate)}）。建议上“连续参与激励+固定档期”。`,
    } : null,
  })

  // 6) 官方介入
  const officialRows = activities90.map((item) => {
    const tags = safeArray(item?.opsTagProfile?.dimensions?.operation?.officialOpsValue)
    return {
      sceneName: String(item.sceneName || '未分类场景'),
      officialHint: tags.some((tag) => String(tag).startsWith('适合官方')),
    }
  })
  const officialCounter = {}
  officialRows.forEach((item) => {
    officialCounter[item.sceneName] = officialCounter[item.sceneName] || { total: 0, hinted: 0 }
    officialCounter[item.sceneName].total += 1
    if (item.officialHint) officialCounter[item.sceneName].hinted += 1
  })
  const officialTop = Object.keys(officialCounter)
    .map((sceneName) => {
      const row = officialCounter[sceneName]
      return {
        sceneName,
        total: row.total,
        hinted: row.hinted,
        rate: row.total > 0 ? row.hinted / row.total : 0,
      }
    })
    .filter((item) => item.total >= 2)
    .sort((a, b) => (b.rate !== a.rate ? b.rate - a.rate : b.hinted - a.hinted))[0]
  cards.push({
    key: 'official_intervention',
    title: '最适合平台官方介入',
    summary: officialTop ? `「${officialTop.sceneName}」具备最高官方介入信号` : '暂无稳定官方介入信号',
    metric: officialTop ? `${pctText(officialTop.rate)}（${officialTop.hinted}/${officialTop.total}）` : '--',
    sampleSize: activities90.length,
    confidence: officialTop && officialTop.total >= 6 ? 'high' : officialTop ? 'medium' : 'low',
    suggestion: officialTop ? '可优先尝试官方联办、官方专题推荐。' : '先扩大活动样本再判断官方介入方向。',
    actionType: officialTop ? 'batch_recommend' : '',
    actionLabel: officialTop ? '一键推荐官方介入候选' : '',
    actionPayload: officialTop ? {
      sceneName: officialTop.sceneName,
      reason: `运营结论卡执行：官方介入「${officialTop.sceneName}」`,
      candidates: pickRecommendCandidates(officialTop.sceneName),
    } : null,
  })

  // 7) 商家合作
  const bizCounter = {}
  activities90.forEach((item) => {
    const sceneName = String(item.sceneName || '未分类场景')
    const supplyTags = safeArray(item?.opsTagProfile?.dimensions?.commercial?.supplySide)
    const pathTags = safeArray(item?.opsTagProfile?.dimensions?.commercial?.monetizationPath)
    const chargeType = String(item.chargeType || item?.pricing?.chargeType || '').toLowerCase()
    const hasBizSignal = supplyTags.some((tag) => ['商家驱动', '品牌驱动'].includes(String(tag)))
      || pathTags.some((tag) => ['品牌赞助', '商品销售', '餐饮联动', '酒水联动'].includes(String(tag)))
      || ['aa', 'paid'].includes(chargeType)
    bizCounter[sceneName] = bizCounter[sceneName] || { total: 0, biz: 0 }
    bizCounter[sceneName].total += 1
    if (hasBizSignal) bizCounter[sceneName].biz += 1
  })
  const bizTop = Object.keys(bizCounter)
    .map((sceneName) => {
      const item = bizCounter[sceneName]
      return {
        sceneName,
        total: item.total,
        biz: item.biz,
        rate: item.total > 0 ? item.biz / item.total : 0,
      }
    })
    .filter((item) => item.total >= 2)
    .sort((a, b) => (b.rate !== a.rate ? b.rate - a.rate : b.biz - a.biz))[0]
  cards.push({
    key: 'merchant_coop',
    title: '最适合与商家合作',
    summary: bizTop ? `「${bizTop.sceneName}」商家合作信号最强` : '暂无稳定商家合作信号',
    metric: bizTop ? `${pctText(bizTop.rate)}（${bizTop.biz}/${bizTop.total}）` : '--',
    sampleSize: activities90.length,
    confidence: bizTop && bizTop.total >= 6 ? 'high' : bizTop ? 'medium' : 'low',
    suggestion: bizTop ? `先从「${bizTop.sceneName}」切入，设计联名套餐和商户包。` : '继续积累付费与联名活动样本。',
    actionType: bizTop ? 'copy_summary' : '',
    actionLabel: bizTop ? '复制商家合作建议' : '',
    actionPayload: bizTop ? {
      text: `商家合作优先：${bizTop.sceneName}。建议先做联名套餐+商家权益包。`,
    } : null,
  })

  // 8) 节庆带动
  const dayStats = {}
  activities90.forEach((item) => {
    const dayKey = toDayKey(item.startTime || item.createdAt)
    if (!dayKey) return
    const sceneName = String(item.sceneName || '未分类场景')
    const isFestival = String(item.sceneId || '') === 'festival_theme'
    dayStats[dayKey] = dayStats[dayKey] || { festival: 0, nonFestival: 0, nonFestivalSceneCounter: {} }
    if (isFestival) {
      dayStats[dayKey].festival += 1
    } else {
      dayStats[dayKey].nonFestival += 1
      dayStats[dayKey].nonFestivalSceneCounter[sceneName] = Number(dayStats[dayKey].nonFestivalSceneCounter[sceneName] || 0) + 1
    }
  })
  const dayRows = Object.keys(dayStats).map((dayKey) => ({ dayKey, ...dayStats[dayKey] }))
  const festivalDays = dayRows.filter((item) => item.festival > 0)
  const normalDays = dayRows.filter((item) => item.festival === 0)
  const avgFestivalNon = festivalDays.length
    ? festivalDays.reduce((sum, item) => sum + item.nonFestival, 0) / festivalDays.length
    : 0
  const avgNormalNon = normalDays.length
    ? normalDays.reduce((sum, item) => sum + item.nonFestival, 0) / normalDays.length
    : 0
  const uplift = avgNormalNon > 0 ? (avgFestivalNon - avgNormalNon) / avgNormalNon : 0
  const boostedSceneCounter = {}
  festivalDays.forEach((item) => {
    Object.keys(item.nonFestivalSceneCounter || {}).forEach((sceneName) => {
      boostedSceneCounter[sceneName] = Number(boostedSceneCounter[sceneName] || 0) + Number(item.nonFestivalSceneCounter[sceneName] || 0)
    })
  })
  const boostedScene = pickTopScene(boostedSceneCounter, 1)
  cards.push({
    key: 'festival_uplift',
    title: '节庆主题带动效应',
    summary: festivalDays.length && normalDays.length
      ? `节庆日非节庆活动均值 ${avgFestivalNon.toFixed(1)}，较平日 ${avgNormalNon.toFixed(1)}，带动 ${pctText(uplift)}`
      : '当前样本不足，暂无法形成稳定节庆带动结论',
    metric: boostedScene ? `被带动最多：${boostedScene.sceneName}` : '--',
    sampleSize: dayRows.length,
    confidence: festivalDays.length >= 3 && normalDays.length >= 5 ? 'medium' : 'low',
    suggestion: boostedScene
      ? `节庆窗口可联动「${boostedScene.sceneName}」做跨场景专题。`
      : '建议增加节庆样本后再判断带动关系。',
    actionType: boostedScene ? 'copy_summary' : '',
    actionLabel: boostedScene ? '复制节庆联动建议' : '',
    actionPayload: boostedScene ? {
      text: `节庆联动建议：下次节庆窗口重点联动「${boostedScene.sceneName}」。`,
    } : null,
  })

  return cards
}

function buildWeeklyBrief(input = {}) {
  const activities = Array.isArray(input.activityRows) ? input.activityRows : []
  const participations = Array.isArray(input.participationRows) ? input.participationRows : []
  const insightCards = Array.isArray(input.insightCards) ? input.insightCards : []
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now.getTime() - (day - 1) * 24 * 60 * 60 * 1000)
  monday.setHours(0, 0, 0, 0)
  const mondayMs = monday.getTime()
  const prevMondayMs = mondayMs - 7 * 24 * 60 * 60 * 1000
  const nowMs = Date.now()
  const inRange = (ts, start, end) => Number.isFinite(ts) && ts >= start && ts < end

  const thisWeekActivities = activities.filter((item) => inRange(toTimestamp(item.createdAt), mondayMs, nowMs))
  const prevWeekActivities = activities.filter((item) => inRange(toTimestamp(item.createdAt), prevMondayMs, mondayMs))
  const thisWeekJoin = participations.filter((item) => String(item.status || '') === 'joined' && inRange(toTimestamp(item.joinedAt || item.createdAt), mondayMs, nowMs))
  const prevWeekJoin = participations.filter((item) => String(item.status || '') === 'joined' && inRange(toTimestamp(item.joinedAt || item.createdAt), prevMondayMs, mondayMs))
  const thisWeekCancel = participations.filter((item) => String(item.status || '') === 'cancelled' && inRange(toTimestamp(item.cancelledAt || item.updatedAt), mondayMs, nowMs))
  const prevWeekCancel = participations.filter((item) => String(item.status || '') === 'cancelled' && inRange(toTimestamp(item.cancelledAt || item.updatedAt), prevMondayMs, mondayMs))

  const growth = (cur, pre) => {
    const c = Number(cur || 0)
    const p = Number(pre || 0)
    if (p <= 0) return c > 0 ? 1 : 0
    return (c - p) / p
  }
  const topInsight = insightCards.slice(0, 3).map((item, idx) => `${idx + 1}. ${item.title}：${item.summary}`).join('\n')
  const text = [
    '【搭里运营自动周报】',
    `本周新活动：${thisWeekActivities.length}（环比 ${pctText(growth(thisWeekActivities.length, prevWeekActivities.length))}）`,
    `本周新报名：${thisWeekJoin.length}（环比 ${pctText(growth(thisWeekJoin.length, prevWeekJoin.length))}）`,
    `本周取消报名：${thisWeekCancel.length}（环比 ${pctText(growth(thisWeekCancel.length, prevWeekCancel.length))}）`,
    '',
    '重点结论：',
    topInsight || '暂无结论数据',
  ].join('\n')
  return {
    weekStartDate: toDayKey(mondayMs),
    generatedAt: new Date().toISOString(),
    text,
    metrics: {
      thisWeekActivities: thisWeekActivities.length,
      prevWeekActivities: prevWeekActivities.length,
      thisWeekJoin: thisWeekJoin.length,
      prevWeekJoin: prevWeekJoin.length,
      thisWeekCancel: thisWeekCancel.length,
      prevWeekCancel: prevWeekCancel.length,
    },
  }
}

function buildAnomalyAlerts(input = {}) {
  const weekly = input.weeklyBrief || {}
  const patrolSummary = input.patrolSummary || {}
  const alerts = []
  const m = weekly.metrics || {}
  const dropRate = (cur, pre) => (Number(pre || 0) > 0 ? (Number(cur || 0) - Number(pre || 0)) / Number(pre || 0) : 0)
  const joinDrop = dropRate(m.thisWeekJoin, m.prevWeekJoin)
  const activityDrop = dropRate(m.thisWeekActivities, m.prevWeekActivities)
  const cancelGrowth = dropRate(m.thisWeekCancel, m.prevWeekCancel)

  if (joinDrop <= -0.3) {
    alerts.push({ level: 'high', title: '本周报名下降明显', detail: `报名环比 ${pctText(joinDrop)}，建议优先处理供给与推荐位。` })
  }
  if (activityDrop <= -0.25) {
    alerts.push({ level: 'medium', title: '本周供给下降', detail: `发布环比 ${pctText(activityDrop)}，建议开启活动招募。` })
  }
  if (cancelGrowth >= 0.35) {
    alerts.push({ level: 'medium', title: '本周取消报名上升', detail: `取消环比 ${pctText(cancelGrowth)}，建议复盘时间/地点匹配。` })
  }
  const patrolLevel = String(patrolSummary.level || 'normal').toLowerCase()
  if (patrolLevel === 'high') {
    alerts.push({ level: 'high', title: '巡检高风险', detail: '巡检等级为高，请先处理超时举报和认证待办。' })
  } else if (patrolLevel === 'medium') {
    alerts.push({ level: 'medium', title: '巡检中风险', detail: '巡检等级为中，建议今天内完成巡检项处理。' })
  }

  return alerts.slice(0, 6)
}

function resolveVerifyAutoApproveMinutes() {
  const mins = Number(process.env.VERIFY_AUTO_APPROVE_MINUTES || VERIFY_AUTO_APPROVE_DEFAULT_MINUTES)
  if (!Number.isFinite(mins) || mins <= 0) return VERIFY_AUTO_APPROVE_DEFAULT_MINUTES
  return Math.max(1, Math.min(120, Math.round(mins)))
}

async function autoApprovePendingVerifyUsers(pendingUsers = [], options = {}) {
  const windowMinutes = Number(options.windowMinutes || VERIFY_AUTO_APPROVE_DEFAULT_MINUTES)
  if (!Array.isArray(pendingUsers) || !pendingUsers.length) {
    return { updatedCount: 0, updatedOpenids: [], windowMinutes, latestAutoApprovedAt: null }
  }

  const nowMs = Date.now()
  const thresholdMs = nowMs - windowMinutes * 60 * 1000
  const targetRows = pendingUsers.filter((item) => {
    if (!item || !item._id || !item._openid) return false
    if (String(item.verifyStatus || '') !== 'pending') return false
    const submitTs = toTimestamp(item.verifySubmittedAt || item.updatedAt || item.createdAt)
    return Number.isFinite(submitTs) && submitTs <= thresholdMs
  })

  if (!targetRows.length) {
    return { updatedCount: 0, updatedOpenids: [], windowMinutes, latestAutoApprovedAt: null }
  }

  const updatedOpenids = []
  let latestAutoApprovedAt = null

  for (const item of targetRows) {
    try {
      await db.collection('users').doc(item._id).update({
        data: {
          isVerified: true,
          verifyStatus: 'approved',
          identityCheckRequired: false,
          identityCheckStatus: 'approved',
          verifyAutoApproved: true,
          verifyAutoApprovedAt: db.serverDate(),
          verifyAutoPendingReview: true,
          verifyAutoWindowMinutes: windowMinutes,
          verifyFinalDecisionSource: 'auto',
          verifyReviewedAt: null,
          updatedAt: db.serverDate(),
        },
      })

      const cityId = item.cityId || 'dali'
      await db.collection('adminActions').add({
        data: {
          actionId: `verify_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          adminId: 'system',
          adminOpenid: 'system',
          adminRole: 'system',
          targetId: item._openid,
          targetType: 'user',
          action: 'verify_auto_approved',
          actionType: 'verify_auto_approved',
          reason: `身份核验提交超过${windowMinutes}分钟未人工审核，系统自动通过（待人工复核）`,
          result: '系统自动通过，待管理员复核',
          actionSource: 'system',
          canAutoExecute: true,
          manualOverride: false,
          beforeState: {
            verifyStatus: item.verifyStatus || 'pending',
            isVerified: !!item.isVerified,
            identityCheckStatus: item.identityCheckStatus || 'pending',
            verifySubmittedAt: item.verifySubmittedAt || null,
          },
          afterState: {
            verifyStatus: 'approved',
            isVerified: true,
            identityCheckStatus: 'approved',
            verifyAutoPendingReview: true,
          },
          cityId,
          outcomeVerified: null,
          outcomeNote: null,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })

      updatedOpenids.push(item._openid)
      latestAutoApprovedAt = new Date().toISOString()
    } catch (e) {
      console.error('自动通过身份核验失败', item._openid, e)
    }
  }

  return {
    updatedCount: updatedOpenids.length,
    updatedOpenids,
    windowMinutes,
    latestAutoApprovedAt,
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const meta = parseAdminMeta(OPENID)

  if (!meta.isAdmin) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const [pendingUsersRes, reportsRes, activitiesRes, actionLogsRes, userProfilesRes, participationsRaw, segmentRuleConfigRes] = await Promise.all([
    db.collection('users')
      .where({ verifyStatus: 'pending' })
      .field({
        _id: true,
        _openid: true,
        cityId: true,
        nickname: true,
        avatarUrl: true,
        verifyStatus: true,
        isVerified: true,
        identityCheckRequired: true,
        identityCheckStatus: true,
        verifyProvider: true,
        verifySubmittedAt: true,
        createdAt: true,
        updatedAt: true,
      })
      .get(),
    db.collection('adminActions')
      .where({ action: 'report' })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .field({
        _id: true,
        targetId: true,
        reason: true,
        createdAt: true,
        cityId: true,
        reportStatus: true,
        handleAction: true,
        handleNote: true,
        handledAt: true,
        reporterOpenid: true,
        reporterNickname: true,
      })
      .get(),
    db.collection('activities')
      .where({ status: _.in(['OPEN', 'FULL', 'ENDED', 'CANCELLED']) })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .field({
        _id: true,
        cityId: true,
        sceneId: true,
        sceneName: true,
        typeId: true,
        typeName: true,
        categoryId: true,
        categoryLabel: true,
        title: true,
        publisherId: true,
        publisherNickname: true,
        currentParticipants: true,
        minParticipants: true,
        status: true,
        isGroupFormation: true,
        formationStatus: true,
        isRecommended: true,
        chargeType: true,
        pricing: true,
        riskLevel: true,
        riskScore: true,
        riskReasonCodes: true,
        opsTagProfile: true,
        location: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
      })
      .get(),
    db.collection('adminActions')
      .where({
        action: _.in([
          'recommend',
          'unrecommend',
          'hide',
          'verify',
          'reject_verify',
          'mark_attendance',
          'ban',
          'resolve_report_hide',
          'resolve_report_ignore',
          'verify_auto_approved',
          'ops_patrol_run',
          'ops_patrol_alert',
          'set_segment_lock',
          'update_segment_rule_config',
          'segment_auto_switch',
        ]),
      })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .field({
        _id: true,
        action: true,
        targetId: true,
        targetType: true,
        actionSource: true,
        canAutoExecute: true,
        manualOverride: true,
        dryRun: true,
        agentTraceId: true,
        linkedActivityId: true,
        linkedReportId: true,
        notifyAfterAction: true,
        notifySummary: true,
        beforeState: true,
        afterState: true,
        patrolLevel: true,
        patrolScore: true,
        patrolTriggeredCount: true,
        patrolSignature: true,
        patrolSummary: true,
        patrolChecks: true,
        reason: true,
        result: true,
        cityId: true,
        adminOpenid: true,
        adminRole: true,
        createdAt: true,
      })
      .get(),
    db.collection('users')
      .limit(400)
      .field({
        _id: true,
        _openid: true,
        nickname: true,
        cityId: true,
        verifyStatus: true,
        verifyProvider: true,
        isVerified: true,
        publishCount: true,
        joinCount: true,
        attendCount: true,
        noShowCount: true,
        reportAgainstCount: true,
        recentPublish7dCount: true,
        locationAnomalyCount: true,
        userRiskScore: true,
        phoneVerified: true,
        mobileBindStatus: true,
        mobileBoundAt: true,
        identityCheckRequired: true,
        identityCheckStatus: true,
        identityCheckReasons: true,
        identityCheckTriggeredAt: true,
        verifyAutoApproved: true,
        verifyAutoApprovedAt: true,
        verifyAutoPendingReview: true,
        verifyAutoWindowMinutes: true,
        verifyFinalDecisionSource: true,
        verifyReviewedAt: true,
        realName: true,
        phone: true,
        userSegment: true,
        segmentTagVersion: true,
        segmentUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      })
      .get()
      .catch(() => ({ data: [] })),
    fetchRecentParticipations(PARTICIPATION_ANALYSIS_LIMIT),
    loadSegmentRuleConfig(meta.cityId || 'dali'),
  ])

  const shouldFilterCity = meta.adminRole === 'cityAdmin'
  const rawPendingUsers = pendingUsersRes.data || []
  const pendingUsersInScope = shouldFilterCity
    ? rawPendingUsers.filter((item) => !item.cityId || item.cityId === meta.cityId)
    : rawPendingUsers
  const autoVerifySummary = await autoApprovePendingVerifyUsers(
    pendingUsersInScope,
    { windowMinutes: resolveVerifyAutoApproveMinutes() }
  )
  const autoUpdatedOpenidSet = new Set(autoVerifySummary.updatedOpenids || [])
  const pendingVerifyList = pendingUsersInScope
    .filter((item) => !autoUpdatedOpenidSet.has(item._openid))
    .sort((a, b) => toTimestamp(b.verifySubmittedAt || b.updatedAt || b.createdAt) - toTimestamp(a.verifySubmittedAt || a.updatedAt || a.createdAt))

  const autoReviewUsersRes = await db.collection('users')
    .where({ verifyAutoPendingReview: true })
    .limit(200)
    .field({
      _id: true,
      _openid: true,
      nickname: true,
      avatarUrl: true,
      cityId: true,
      verifyStatus: true,
      isVerified: true,
      verifyProvider: true,
      verifySubmittedAt: true,
      verifyAutoApprovedAt: true,
      verifyAutoWindowMinutes: true,
      verifyFinalDecisionSource: true,
      verifyReviewedAt: true,
      updatedAt: true,
    })
    .get()
    .catch(() => ({ data: [] }))
  const autoVerifyReviewList = ((autoReviewUsersRes.data || []).filter((item) => {
    if (!shouldFilterCity) return true
    return !item.cityId || item.cityId === meta.cityId
  }))
    .sort((a, b) => toTimestamp(b.verifyAutoApprovedAt || b.updatedAt) - toTimestamp(a.verifyAutoApprovedAt || a.updatedAt))
    .slice(0, 80)

  const activityList = shouldFilterCity
    ? (activitiesRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId).slice(0, 120)
    : (activitiesRes.data || []).slice(0, 120)

  const rawReports = shouldFilterCity
    ? (reportsRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId)
    : (reportsRes.data || [])

  const activityMap = activityList.reduce((acc, item) => {
    acc[item._id] = item
    return acc
  }, {})

  const missingReportTargetIds = rawReports
    .map((item) => item.targetId)
    .filter((id) => id && !activityMap[id])

  if (missingReportTargetIds.length) {
    const extraActivities = await fetchActivitiesByIds(missingReportTargetIds)
    extraActivities.forEach((item) => {
      activityMap[item._id] = item
    })
  }

  const rawActionLogs = shouldFilterCity
    ? (actionLogsRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId)
    : (actionLogsRes.data || [])
  const rawUserProfiles = shouldFilterCity
    ? (userProfilesRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId)
    : (userProfilesRes.data || [])
  const rawParticipations = shouldFilterCity
    ? (participationsRaw || []).filter((item) => !item.cityId || item.cityId === meta.cityId)
    : (participationsRaw || [])

  const last24hMs = Date.now() - 24 * 60 * 60 * 1000

  const opsPatrolRunList = rawActionLogs
    .filter((item) => item.action === 'ops_patrol_run')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const latestOpsPatrol = opsPatrolRunList[0] || null
  const opsPatrolAlertList = rawActionLogs
    .filter((item) => item.action === 'ops_patrol_alert')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)
  const opsPatrolAlertCount24h = opsPatrolAlertList.filter((item) => {
    const ts = new Date(item.createdAt).getTime()
    return Number.isFinite(ts) && ts >= last24hMs
  }).length

  const missingLogActivityIds = rawActionLogs
    .map((item) => resolveActionLinkedActivityId(item))
    .filter((id) => id && !activityMap[id])

  if (missingLogActivityIds.length) {
    const extraActivities = await fetchActivitiesByIds(missingLogActivityIds)
    extraActivities.forEach((item) => {
      activityMap[item._id] = item
    })
  }

  const missingParticipationActivityIds = rawParticipations
    .map((item) => item.activityId)
    .filter((id) => id && !activityMap[id])
  if (missingParticipationActivityIds.length) {
    const extraActivities = await fetchActivitiesByIds(missingParticipationActivityIds)
    extraActivities.forEach((item) => {
      activityMap[item._id] = item
    })
  }

  const reportList = rawReports
    .map((item) => ({
      ...item,
      reportStatus: item.reportStatus || 'PENDING',
      targetActivity: activityMap[item.targetId] || null,
    }))
    .slice(0, 60)

  const reportMetaMap = buildReportMetaMap(rawReports)

  const enrichedActivityList = activityList.map((item) => ({
    ...item,
    reportMeta: reportMetaMap[item._id] || {
      total: 0,
      pending: 0,
      handled: 0,
      ignored: 0,
      latestReason: '',
      latestReportedAt: null,
      latestStatus: '',
    },
  }))

  const actionLogList = rawActionLogs
    .map((item) => {
      const linkedActivityId = resolveActionLinkedActivityId(item)
      return {
        ...item,
        linkedActivityId,
        linkedActivity: linkedActivityId ? (activityMap[linkedActivityId] || null) : null,
      }
    })
    .slice(0, 80)

  const participationList = rawParticipations
    .map((item) => ({
      ...item,
      activitySceneName: activityMap[item.activityId]?.sceneName
        || activityMap[item.activityId]?.categoryLabel
        || '',
      activityStartTime: activityMap[item.activityId]?.startTime || null,
      activityCityId: activityMap[item.activityId]?.cityId || '',
    }))
    .filter((item) => {
      if (!shouldFilterCity) return true
      return !item.activityCityId || item.activityCityId === meta.cityId || !item.cityId || item.cityId === meta.cityId
    })
    .slice(0, PARTICIPATION_ANALYSIS_LIMIT)

  const segmentRuleConfig = segmentRuleConfigRes?.config || DEFAULT_SEGMENT_RULE_CONFIG
  const segmentRuleConfigVersion = segmentRuleConfigRes?.version || 'segment_rule_default'
  const segmentRuleConfigUpdatedAt = segmentRuleConfigRes?.updatedAt || null
  const { segmentList, overview: userSegmentOverview } = buildUserSegmentPack(
    rawUserProfiles,
    Object.values(activityMap),
    participationList,
    segmentRuleConfig
  )
  const segmentByOpenid = segmentList.reduce((acc, item) => {
    if (item?.openid) acc[item.openid] = item
    return acc
  }, {})
  const segmentSyncResult = await syncUserSegmentsToDb(rawUserProfiles, segmentList)

  const userProfileList = rawUserProfiles
    .slice(0, 300)
    .map((item) => {
      const segment = segmentByOpenid[item._openid] || null
      const realNamePlain = maybeDecodeSensitive(item.realName || '')
      const phonePlain = maybeDecodeSensitive(item.phone || '')
      const identityReasons = normalizeIdentityReasons(item.identityCheckReasons)
      const computedRiskScore = calcUserRiskScore(item)
      const rawRiskScore = Number(item.userRiskScore)
      const riskScore = Number.isFinite(rawRiskScore) ? rawRiskScore : computedRiskScore
      return {
        _id: item._id,
        openid: item._openid || '',
        nickname: item.nickname || '',
        cityId: item.cityId || 'dali',
        verifyStatus: item.verifyStatus || 'none',
        verifyProvider: item.verifyProvider || 'manual',
        isVerified: !!item.isVerified,
        publishCount: Number(item.publishCount || 0),
        joinCount: Number(item.joinCount || 0),
        attendCount: Number(item.attendCount || 0),
        noShowCount: Number(item.noShowCount || 0),
        reportAgainstCount: Number(item.reportAgainstCount || 0),
        recentPublish7dCount: Number(item.recentPublish7dCount || 0),
        locationAnomalyCount: Number(item.locationAnomalyCount || 0),
        userRiskScore: riskScore,
        phoneVerified: !!item.phoneVerified,
        mobileBindStatus: item.mobileBindStatus || (item.phoneVerified ? 'bound' : 'unbound'),
        mobileBoundAt: item.mobileBoundAt || null,
        identityCheckRequired: !!item.identityCheckRequired,
        identityCheckStatus: item.identityCheckStatus || 'none',
        identityCheckReasons: identityReasons,
        identityCheckTriggeredAt: item.identityCheckTriggeredAt || null,
        hasRealName: !!realNamePlain,
        hasPhone: !!phonePlain,
        realNameMasked: maskName(realNamePlain),
        phoneMasked: maskPhone(phonePlain),
        userSegment: segment
          ? {
              selfDeclared: segment.selfDeclared,
              autoInferred: segment.autoInferred,
              finalLabel: segment.finalLabel,
              finalLabelText: segmentLabel(segment.finalLabel),
              confidence: segment.confidence,
              source: segment.source,
              evidence: segment.evidence,
            }
          : {
              selfDeclared: 'unknown',
              autoInferred: 'unknown',
              finalLabel: 'unknown',
              finalLabelText: segmentLabel('unknown'),
              confidence: 'low',
              source: 'auto_inferred',
              evidence: {},
            },
        realNamePlain,
        phonePlain,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      }
    })

  const opsTagOverview = buildOpsTagOverview(enrichedActivityList)
  const opsInsightCards = buildOperationInsightCards({
    activityRows: enrichedActivityList,
    participationRows: participationList,
    segmentList,
  })
  const opsPatrolSummary = latestOpsPatrol
    ? {
        level: latestOpsPatrol.patrolLevel || latestOpsPatrol.patrolSummary?.level || 'normal',
        score: Number(latestOpsPatrol.patrolScore || latestOpsPatrol.patrolSummary?.score || 0),
        triggeredCount: Number(latestOpsPatrol.patrolTriggeredCount || latestOpsPatrol.patrolSummary?.triggeredCount || 0),
        cityId: latestOpsPatrol.patrolSummary?.cityId || latestOpsPatrol.cityId || meta.cityId,
        checkedAt: latestOpsPatrol.patrolSummary?.checkedAt || latestOpsPatrol.createdAt || null,
        reportOverdueCount: Number(latestOpsPatrol.patrolSummary?.reportOverdueCount || 0),
        verifyOverdueCount: Number(latestOpsPatrol.patrolSummary?.verifyOverdueCount || 0),
        supplyAlertLevel: latestOpsPatrol.patrolSummary?.supplyAlertLevel || 'normal',
        supplyAlertFlags: latestOpsPatrol.patrolSummary?.supplyAlertFlags || [],
        source: latestOpsPatrol.patrolSummary?.source || latestOpsPatrol.actionSource || '',
        alertCount24h: opsPatrolAlertCount24h,
        hasRecentRun: true,
      }
    : {
        level: 'normal',
        score: 0,
        triggeredCount: 0,
        cityId: meta.cityId,
        checkedAt: null,
        reportOverdueCount: 0,
        verifyOverdueCount: 0,
        supplyAlertLevel: 'normal',
        supplyAlertFlags: [],
        source: '',
        alertCount24h: opsPatrolAlertCount24h,
        hasRecentRun: false,
      }
  const opsWeeklyBrief = buildWeeklyBrief({
    activityRows: enrichedActivityList,
    participationRows: participationList,
    insightCards: opsInsightCards,
  })
  const opsAnomalyAlerts = buildAnomalyAlerts({
    weeklyBrief: opsWeeklyBrief,
    patrolSummary: opsPatrolSummary,
  })

  return {
    success: true,
    currentOpenid: OPENID,
    adminRole: meta.adminRole,
    cityId: meta.cityId,
    pendingVerifyList,
    autoVerifyReviewList,
    autoVerifySummary: {
      pendingReviewCount: autoVerifyReviewList.length,
      autoApprovedThisLoadCount: autoVerifySummary.updatedCount || 0,
      windowMinutes: autoVerifySummary.windowMinutes || resolveVerifyAutoApproveMinutes(),
      latestAutoApprovedAt: autoVerifySummary.latestAutoApprovedAt || null,
    },
    opsPatrol: {
      summary: opsPatrolSummary,
      latestChecks: latestOpsPatrol?.patrolChecks || [],
      alerts: opsPatrolAlertList,
      runs: opsPatrolRunList.slice(0, 8),
    },
    reportList,
    opsTagOverview,
    opsInsightCards,
    opsWeeklyBrief,
    opsAnomalyAlerts,
    userSegmentOverview,
    userSegmentSync: segmentSyncResult,
    userSegmentRuleConfig: segmentRuleConfig,
    userSegmentRuleConfigVersion: segmentRuleConfigVersion,
    userSegmentRuleConfigUpdatedAt: segmentRuleConfigUpdatedAt,
    activityList: enrichedActivityList,
    actionLogList,
    userProfileList,
    serverTimestamp: Date.now(),
  }
}
