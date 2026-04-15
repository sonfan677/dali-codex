const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function normalizeSegmentCode(raw = '') {
  const safe = String(raw || '').trim().toLowerCase()
  if (!safe) return 'unknown'
  if (['游客', 'tourist', 'visitor', 'travel'].includes(safe)) return 'visitor'
  if (['旅居', '旅居者', 'nomad', 'stay'].includes(safe)) return 'nomad'
  if (['本地', '本地人', '常住', 'local', 'resident'].includes(safe)) return 'local'
  if (['unknown', 'none', 'skip', '暂不选择', '未选择', 'clear'].includes(safe)) return 'unknown'
  return 'unknown'
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

const DEFAULT_PUBLISH_GOVERNANCE_CONFIG = {
  publishRulesVersion: 'publish_rules_v1',
  organizerAgreementVersion: 'organizer_agreement_v1',
  complaintDowngradeThreshold: 3,
  complaintRestrictAllThreshold: 6,
  enableComplaintRestriction: true,
  enableTierGate: true,
  userPublishNeedReview: true,
  highRiskForceManualReview: true,
  tierRules: {
    normal: { maxRiskLevel: 'L2', allowPaid: false },
    verified: { maxRiskLevel: 'L2', allowPaid: true },
    commercial: { maxRiskLevel: 'L3', allowPaid: true },
    qualified: { maxRiskLevel: 'L4', allowPaid: true },
  },
}

function parseIntSafe(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
}

function parseBoolSafe(value, fallback = false) {
  if (value === true || value === false) return value
  const safe = String(value || '').trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(safe)) return true
  if (['false', '0', 'no', 'off'].includes(safe)) return false
  return !!fallback
}

function normalizeRiskLevel(value = 'L2', fallback = 'L2') {
  const safe = String(value || fallback).trim().toUpperCase()
  if (['L1', 'L2', 'L3', 'L4'].includes(safe)) return safe
  return fallback
}

function sanitizeSegmentRuleConfig(raw = {}) {
  const visitor = raw?.visitor || {}
  const local = raw?.local || {}
  const confidence = raw?.confidence || {}
  const cfg = {
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
  return cfg
}

function sanitizeTierRule(raw = {}, fallback = { maxRiskLevel: 'L2', allowPaid: false }) {
  return {
    maxRiskLevel: normalizeRiskLevel(raw?.maxRiskLevel, fallback.maxRiskLevel),
    allowPaid: parseBoolSafe(raw?.allowPaid, fallback.allowPaid),
  }
}

function sanitizePublishGovernanceConfig(raw = {}, current = DEFAULT_PUBLISH_GOVERNANCE_CONFIG) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const base = current && typeof current === 'object'
    ? current
    : DEFAULT_PUBLISH_GOVERNANCE_CONFIG
  const next = {
    publishRulesVersion: String(source.publishRulesVersion || base.publishRulesVersion || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.publishRulesVersion).trim() || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.publishRulesVersion,
    organizerAgreementVersion: String(source.organizerAgreementVersion || base.organizerAgreementVersion || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.organizerAgreementVersion).trim() || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.organizerAgreementVersion,
    complaintDowngradeThreshold: Math.max(1, Math.min(20, parseIntSafe(source.complaintDowngradeThreshold, base.complaintDowngradeThreshold || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintDowngradeThreshold))),
    complaintRestrictAllThreshold: Math.max(2, Math.min(30, parseIntSafe(source.complaintRestrictAllThreshold, base.complaintRestrictAllThreshold || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintRestrictAllThreshold))),
    enableComplaintRestriction: parseBoolSafe(source.enableComplaintRestriction, base.enableComplaintRestriction),
    enableTierGate: parseBoolSafe(source.enableTierGate, base.enableTierGate),
    userPublishNeedReview: parseBoolSafe(source.userPublishNeedReview, base.userPublishNeedReview),
    highRiskForceManualReview: parseBoolSafe(source.highRiskForceManualReview, base.highRiskForceManualReview),
  }
  const tierSource = source.tierRules && typeof source.tierRules === 'object'
    ? source.tierRules
    : (base.tierRules || {})
  next.tierRules = {
    normal: sanitizeTierRule(tierSource.normal || {}, base.tierRules?.normal || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.normal),
    verified: sanitizeTierRule(tierSource.verified || {}, base.tierRules?.verified || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.verified),
    commercial: sanitizeTierRule(tierSource.commercial || {}, base.tierRules?.commercial || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.commercial),
    qualified: sanitizeTierRule(tierSource.qualified || {}, base.tierRules?.qualified || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.qualified),
  }
  return next
}

function normalizeOrganizerTierCode(value = '') {
  const safe = String(value || '').trim().toLowerCase()
  if (['normal', 'verified', 'commercial', 'qualified'].includes(safe)) return safe
  return ''
}

function organizerTierLabel(code = '') {
  const map = {
    normal: '普通发起者',
    verified: '认证发起者',
    commercial: '商业组织者',
    qualified: '资质组织者',
  }
  return map[normalizeOrganizerTierCode(code)] || '普通发起者'
}

function isCollectionMissingError(err) {
  const msg = String(err?.errMsg || err?.message || err || '')
  return /COLLECTION_NOT_EXIST|collection not exists|Db or Table not exist|DATABASE_COLLECTION_NOT_EXIST/i.test(msg)
}

async function loadPublishGovernanceSnapshot(cityId = 'dali') {
  const safeCityId = String(cityId || '').trim() || 'dali'
  let raw = null
  try {
    const byId = await db.collection('opsConfigs').doc('publish_governance').get()
    raw = byId?.data || null
  } catch (e) {}
  if (!raw) {
    try {
      const byKey = await db.collection('opsConfigs')
        .where({ key: 'publish_governance', cityId: safeCityId })
        .limit(1)
        .get()
      raw = byKey?.data?.[0] || null
    } catch (e) {}
  }
  if (raw) return raw
  try {
    const queryRes = await db.collection('adminActions')
      .where({
        action: 'update_publish_governance_config',
        targetId: 'publish_governance',
      })
      .limit(100)
      .get()
    const rows = Array.isArray(queryRes?.data) ? queryRes.data : []
    const candidates = rows
      .filter((row) => row?.afterState?.publishGovernanceConfig)
      .filter((row) => !safeCityId || !row.cityId || row.cityId === safeCityId)
    const withTs = candidates.map((row) => {
      const tsFromCreatedAt = new Date(row?.createdAt).getTime()
      const tsFromUpdatedAt = new Date(row?.afterState?.updatedAt).getTime()
      const tsFromVersion = Number(String(row?.afterState?.version || '').split('_').pop())
      const tsFromActionId = Number(String(row?.actionId || '').split('_')[1])
      const ts = [tsFromCreatedAt, tsFromUpdatedAt, tsFromVersion, tsFromActionId]
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => b - a)[0] || 0
      return { row, ts }
    })
    withTs.sort((a, b) => b.ts - a.ts)
    const picked = withTs[0]?.row || null
    if (picked) {
      return {
        key: 'publish_governance',
        cityId: picked.cityId || safeCityId,
        version: picked.afterState?.version || '',
        publishGovernanceConfig: picked.afterState.publishGovernanceConfig,
        updatedAt: picked.afterState?.updatedAt || picked.createdAt || null,
        updatedBy: picked.afterState?.updatedBy || picked.adminOpenid || '',
      }
    }
  } catch (e) {}
  return null
}

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const isAdmin = adminOpenids.includes(openid)

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
    isAdmin,
    adminRole: roleMap[openid] || 'superAdmin',
    adminCityId: cityScopeMap[openid] || 'dali',
  }
}

function normalizeFestivalThemeTag(value = '') {
  const safe = String(value || '').trim().replace(/\s+/g, '')
  if (!safe) return ''
  return safe.slice(0, 8)
}

function normalizeFestivalThemeTagList(input = [], max = 5) {
  const source = Array.isArray(input)
    ? input
    : String(input || '').split(/[,\n，、;；]/g)
  const next = []
  source.forEach((item) => {
    const safe = normalizeFestivalThemeTag(item)
    if (!safe || next.includes(safe)) return
    next.push(safe)
  })
  return next.slice(0, Math.max(0, Number(max) || 5))
}

async function getActivitySnapshot(targetId) {
  try {
    const res = await db.collection('activities').doc(targetId).get()
    return res.data || null
  } catch (e) {
    return null
  }
}

async function getUserSnapshot(openid) {
  try {
    const { data } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
    return data[0] || null
  } catch (e) {
    return null
  }
}

async function getReportSnapshot(reportId) {
  try {
    const res = await db.collection('adminActions').doc(reportId).get()
    return res.data || null
  } catch (e) {
    return null
  }
}

async function fetchJoinedParticipantOpenids(activityId) {
  if (!activityId) return []
  try {
    const { data } = await db.collection('participations')
      .where({
        activityId,
        status: 'joined',
      })
      .limit(100)
      .field({
        _openid: true,
        userId: true,
      })
      .get()
    return (data || [])
      .map((item) => item.userId || item._openid || '')
      .filter(Boolean)
  } catch (e) {
    return []
  }
}

function formatActivityTime(value) {
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms)
  const mo = date.getMonth() + 1
  const day = date.getDate()
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${mo}月${day}日 ${h}:${m}`
}

async function notifyActivityCancelled({
  activity = null,
  reason = '',
}) {
  if (!activity || !activity._id) {
    return { attempted: 0, success: 0, failed: 0, skipped: true, reason: 'NO_ACTIVITY' }
  }

  const baseOpenids = [
    activity.publisherOpenid,
    activity.publisherId,
    activity._openid,
  ].filter(Boolean)
  const joinedOpenids = await fetchJoinedParticipantOpenids(activity._id)
  const notifyOpenids = [...new Set([...baseOpenids, ...joinedOpenids])]
    .filter(Boolean)
    .slice(0, 80)

  if (!notifyOpenids.length) {
    return { attempted: 0, success: 0, failed: 0, skipped: true, reason: 'NO_TARGET' }
  }

  const payload = {
    type: 'activity_cancelled',
    data: {
      title: activity.title || '活动',
      reason: reason || '活动已取消',
      tips: '可前往首页查看其他活动',
      time: formatActivityTime(activity.startTime),
      location: activity.location && activity.location.address ? activity.location.address : '',
    },
  }

  const settled = await Promise.allSettled(
    notifyOpenids.map((openid) => cloud.callFunction({
      name: 'sendNotification',
      data: {
        ...payload,
        openid,
      },
    }))
  )

  let success = 0
  settled.forEach((item) => {
    if (item.status === 'fulfilled' && item.value && item.value.result && item.value.result.success) {
      success += 1
    }
  })
  return {
    attempted: notifyOpenids.length,
    success,
    failed: notifyOpenids.length - success,
    skipped: false,
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { isAdmin, adminRole, adminCityId } = parseAdminMeta(OPENID)

  if (!isAdmin) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const { action, targetId, targetType, reason, cityId } = event
  const actionSource = event.actionSource === 'ai' ? 'ai' : 'human'
  const canAutoExecute = typeof event.canAutoExecute === 'boolean' ? event.canAutoExecute : false
  const manualOverride = !!event.manualOverride
  const dryRun = !!event.dryRun
  const notifyAfterAction = !!event.notifyAfterAction
  const agentTraceId = event.agentTraceId ? String(event.agentTraceId).slice(0, 120) : ''
  const expiresAtMs = new Date(event.expiresAt).getTime()
  const expiresAt = Number.isFinite(expiresAtMs) ? new Date(expiresAtMs) : null
  if (!reason || reason.trim().length < 2) {
    return { success: false, error: 'REASON_REQUIRED', message: '请填写操作原因（至少2个字）' }
  }

  const normalizedReason = reason.trim()
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: '预检查通过（未执行）',
      preview: {
        action,
        targetId: targetId || '',
        targetType: targetType || '',
        actionSource,
        canAutoExecute,
        manualOverride,
        expiresAt,
      },
    }
  }

  let finalTargetId = targetId
  let beforeState = null
  let afterState = null
  let result = {}
  let finalTargetType = targetType || ''
  let linkedActivityId = ''
  let linkedReportId = ''
  let activityForNotify = null
  let notifySummary = {
    attempted: 0,
    success: 0,
    failed: 0,
    skipped: true,
    reason: 'DISABLED',
  }

  switch (action) {
    case 'recommend':
    case 'unrecommend':
    case 'hide': {
      finalTargetType = finalTargetType || 'activity'
      linkedActivityId = targetId
      beforeState = await getActivitySnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
      }
      if (adminRole === 'cityAdmin' && beforeState.cityId && beforeState.cityId !== adminCityId) {
        return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
      }

      const nextPatch = action === 'recommend'
        ? { isRecommended: true, updatedAt: db.serverDate() }
        : action === 'unrecommend'
          ? { isRecommended: false, updatedAt: db.serverDate() }
          : { status: 'CANCELLED', updatedAt: db.serverDate() }

      await db.collection('activities').doc(targetId).update({ data: nextPatch })
      afterState = await getActivitySnapshot(targetId)
      if (action === 'hide') {
        activityForNotify = afterState || beforeState || null
      }
      result = {
        message: action === 'recommend'
          ? '已设为官方推荐'
          : action === 'unrecommend'
            ? '已取消官方推荐'
            : '活动已下架'
      }
      break
    }

    case 'approve_publish':
    case 'reject_publish': {
      finalTargetType = finalTargetType || 'activity'
      linkedActivityId = targetId
      beforeState = await getActivitySnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
      }
      if (adminRole === 'cityAdmin' && beforeState.cityId && beforeState.cityId !== adminCityId) {
        return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
      }

      const publishReviewStatus = String(beforeState.publishReviewStatus || '').toLowerCase()
      const isPendingPublish = publishReviewStatus === 'pending' || String(beforeState.status || '') === 'PUBLISH_PENDING'
      if (!isPendingPublish) {
        return { success: false, error: 'PUBLISH_REVIEW_NOT_PENDING', message: '该活动不在待审核状态' }
      }

      const nextPatch = action === 'approve_publish'
        ? {
            status: Number(beforeState.currentParticipants || 0) >= Number(beforeState.maxParticipants || 999)
              ? 'FULL'
              : 'OPEN',
            publishReviewRequired: false,
            publishReviewStatus: 'approved',
            publishReviewedAt: db.serverDate(),
            publishReviewedBy: OPENID,
            publishReviewSource: 'admin_action',
            publishReviewReason: normalizedReason,
            updatedAt: db.serverDate(),
          }
        : {
            status: 'PUBLISH_REJECTED',
            publishReviewRequired: false,
            publishReviewStatus: 'rejected',
            publishReviewedAt: db.serverDate(),
            publishReviewedBy: OPENID,
            publishReviewSource: 'admin_action',
            publishReviewReason: normalizedReason,
            updatedAt: db.serverDate(),
          }

      await db.collection('activities').doc(targetId).update({ data: nextPatch })
      afterState = await getActivitySnapshot(targetId)
      result = {
        message: action === 'approve_publish'
          ? '活动已审核通过并发布'
          : '活动已驳回'
      }
      break
    }

    case 'set_festival_tags': {
      finalTargetType = finalTargetType || 'activity'
      linkedActivityId = targetId
      beforeState = await getActivitySnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
      }
      if (adminRole === 'cityAdmin' && beforeState.cityId && beforeState.cityId !== adminCityId) {
        return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
      }

      const manualTags = normalizeFestivalThemeTagList(event.festivalThemeTags || [])
      const autoTags = normalizeFestivalThemeTagList(beforeState.festivalThemeTagsAuto || [])
      const effectiveTags = manualTags.length > 0 ? manualTags : autoTags
      const source = manualTags.length > 0
        ? 'manual'
        : (effectiveTags.length > 0 ? 'auto' : 'none')

      await db.collection('activities').doc(targetId).update({
        data: {
          festivalThemeTagsManual: manualTags,
          festivalThemeTags: effectiveTags,
          festivalThemeSource: source,
          festivalThemeManualUpdatedBy: OPENID,
          festivalThemeManualUpdatedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      afterState = await getActivitySnapshot(targetId)
      result = {
        message: manualTags.length > 0
          ? '节庆主题标签已更新（人工覆盖）'
          : '已清除人工覆盖，恢复自动节庆主题标签',
      }
      break
    }

    case 'verify':
    case 'reject_verify':
    case 'ban': {
      finalTargetType = finalTargetType || 'user'
      beforeState = await getUserSnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '用户不存在' }
      }

      const nextPatch = action === 'verify'
        ? {
            isVerified: true,
            verifyStatus: 'approved',
            identityCheckRequired: false,
            identityCheckStatus: 'approved',
            verifyAutoPendingReview: false,
            verifyFinalDecisionSource: 'manual',
            verifyReviewedAt: db.serverDate(),
            updatedAt: db.serverDate(),
          }
        : action === 'reject_verify'
          ? {
              isVerified: false,
              verifyStatus: 'rejected',
              identityCheckRequired: true,
              identityCheckStatus: 'rejected',
              verifyAutoPendingReview: false,
              verifyAutoApproved: false,
              verifyFinalDecisionSource: 'manual',
              verifyReviewedAt: db.serverDate(),
              updatedAt: db.serverDate(),
            }
          : { isBanned: true, updatedAt: db.serverDate() }

      await db.collection('users').where({ _openid: targetId }).update({ data: nextPatch })
      afterState = await getUserSnapshot(targetId)
      result = {
        message: action === 'verify'
          ? '身份核验已通过'
          : action === 'reject_verify'
            ? '身份核验已拒绝'
            : '用户已封禁'
      }
      break
    }

    case 'resolve_report_hide':
    case 'resolve_report_ignore': {
      const reportId = event.reportId || targetId
      if (!reportId) {
        return { success: false, error: 'REPORT_ID_REQUIRED', message: '缺少举报记录ID' }
      }

      const reportBefore = await getReportSnapshot(reportId)
      if (!reportBefore || reportBefore.action !== 'report') {
        return { success: false, error: 'REPORT_NOT_FOUND', message: '举报记录不存在' }
      }
      if (adminRole === 'cityAdmin' && reportBefore.cityId && reportBefore.cityId !== adminCityId) {
        return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
      }
      if (['HANDLED', 'IGNORED'].includes(reportBefore.reportStatus)) {
        return { success: false, error: 'ALREADY_HANDLED', message: '该举报已处理' }
      }

      finalTargetType = 'report'
      finalTargetId = reportId
      linkedReportId = reportId
      linkedActivityId = reportBefore.targetId || targetId || ''

      const reportPatch = {
        reportStatus: action === 'resolve_report_hide' ? 'HANDLED' : 'IGNORED',
        handleAction: action === 'resolve_report_hide' ? 'HIDE_ACTIVITY' : 'IGNORE',
        handleNote: normalizedReason,
        handlerOpenid: OPENID,
        handledAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }

      if (action === 'resolve_report_hide') {
        const activityId = reportBefore.targetId
        const activityBefore = await getActivitySnapshot(activityId)
        if (!activityBefore) {
          return { success: false, error: 'NOT_FOUND', message: '被举报活动不存在' }
        }
        if (adminRole === 'cityAdmin' && activityBefore.cityId && activityBefore.cityId !== adminCityId) {
          return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
        }

        await db.collection('activities').doc(activityId).update({
          data: {
            status: 'CANCELLED',
            updatedAt: db.serverDate(),
          }
        })
        await db.collection('adminActions').doc(reportId).update({ data: reportPatch })

        const activityAfter = await getActivitySnapshot(activityId)
        const reportAfter = await getReportSnapshot(reportId)
        beforeState = { report: reportBefore, activity: activityBefore }
        afterState = { report: reportAfter, activity: activityAfter }
        activityForNotify = activityAfter || activityBefore || null
        result = { message: '举报已处理，活动已下架' }
      } else {
        await db.collection('adminActions').doc(reportId).update({ data: reportPatch })
        const reportAfter = await getReportSnapshot(reportId)
        beforeState = reportBefore
        afterState = reportAfter
        result = { message: '举报已标记忽略' }
      }
      break
    }

    case 'set_segment_lock': {
      finalTargetType = 'user'
      beforeState = await getUserSnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '用户不存在' }
      }
      const lockSegment = normalizeSegmentCode(event.lockSegment || event.segment || '')
      const userSegment = beforeState.userSegment || {}
      const nextUserSegment = {
        ...userSegment,
        manualLock: lockSegment,
        finalLabel: lockSegment !== 'unknown'
          ? lockSegment
          : (normalizeSegmentCode(userSegment.selfDeclared || '') !== 'unknown'
            ? normalizeSegmentCode(userSegment.selfDeclared || '')
            : normalizeSegmentCode(userSegment.autoInferred || userSegment.finalLabel || 'unknown')),
        source: lockSegment !== 'unknown' ? 'manual_lock' : (userSegment.source || 'auto_inferred'),
        updatedAt: db.serverDate(),
      }
      await db.collection('users').where({ _openid: targetId }).update({
        data: {
          userSegment: nextUserSegment,
          segmentTagVersion: 'segment_v1',
          segmentUpdatedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      afterState = await getUserSnapshot(targetId)
      result = {
        message: lockSegment === 'unknown'
          ? '已清除分群锁定'
          : `已锁定为${segmentLabel(lockSegment)}`,
      }
      break
    }

    case 'set_organizer_tier': {
      finalTargetType = 'user'
      beforeState = await getUserSnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '用户不存在' }
      }
      const nextTier = normalizeOrganizerTierCode(event.organizerTier || event.tier || '')
      if (!nextTier) {
        return { success: false, error: 'INVALID_ORGANIZER_TIER', message: '组织者等级不合法' }
      }
      await db.collection('users').where({ _openid: targetId }).update({
        data: {
          organizerTier: nextTier,
          organizerTierUpdatedAt: db.serverDate(),
          organizerTierUpdatedBy: OPENID,
          updatedAt: db.serverDate(),
        },
      })
      afterState = await getUserSnapshot(targetId)
      result = {
        message: `组织者等级已设为${organizerTierLabel(nextTier)}`,
      }
      break
    }

    case 'update_segment_rule_config': {
      finalTargetType = 'system'
      finalTargetId = 'user_segment_rule'
      const payload = sanitizeSegmentRuleConfig(event.segmentRuleConfig || {})
      let beforeDoc = null
      try {
        const docRes = await db.collection('opsConfigs').doc('user_segment_rule').get()
        beforeDoc = docRes.data || null
      } catch (e) {
        beforeDoc = null
      }
      beforeState = beforeDoc ? {
        segmentRuleConfig: beforeDoc.segmentRuleConfig || DEFAULT_SEGMENT_RULE_CONFIG,
        version: beforeDoc.version || '',
      } : null

      await db.collection('opsConfigs').doc('user_segment_rule').set({
        data: {
          key: 'user_segment_rule',
          cityId: cityId || adminCityId || 'dali',
          segmentRuleConfig: payload,
          version: `segment_rule_${Date.now()}`,
          updatedBy: OPENID,
          updatedAt: db.serverDate(),
          createdAt: beforeDoc?.createdAt || db.serverDate(),
        },
      })
      const afterDocRes = await db.collection('opsConfigs').doc('user_segment_rule').get().catch(() => null)
      afterState = afterDocRes?.data || {
        segmentRuleConfig: payload,
      }
      result = {
        message: '分群规则已更新，刷新后台后生效',
      }
      break
    }

    case 'update_publish_governance_config': {
      finalTargetType = 'system'
      finalTargetId = 'publish_governance'
      const safeCityId = cityId || adminCityId || 'dali'
      const beforeDoc = await loadPublishGovernanceSnapshot(safeCityId)
      const beforeConfig = sanitizePublishGovernanceConfig(
        beforeDoc?.publishGovernanceConfig || {},
        DEFAULT_PUBLISH_GOVERNANCE_CONFIG
      )
      const payload = sanitizePublishGovernanceConfig(
        event.publishGovernanceConfig || {},
        beforeConfig
      )
      beforeState = beforeDoc ? {
        publishGovernanceConfig: beforeConfig,
        version: beforeDoc.version || '',
      } : null
      const version = `publish_governance_${Date.now()}`
      try {
        await db.collection('opsConfigs').doc('publish_governance').set({
          data: {
            key: 'publish_governance',
            cityId: safeCityId,
            publishGovernanceConfig: payload,
            version,
            updatedBy: OPENID,
            updatedAt: db.serverDate(),
            createdAt: beforeDoc?.createdAt || db.serverDate(),
          },
        })
        const afterDocRes = await db.collection('opsConfigs').doc('publish_governance').get().catch(() => null)
        afterState = afterDocRes?.data || {
          key: 'publish_governance',
          cityId: safeCityId,
          version,
          publishGovernanceConfig: payload,
          updatedBy: OPENID,
          updatedAt: new Date(),
        }
        result = {
          message: '治理开关已更新，发布规则实时生效',
          persistMode: 'opsConfigs',
          publishGovernanceConfig: payload,
          version,
          updatedAt: afterState?.updatedAt || null,
        }
      } catch (e) {
        if (!isCollectionMissingError(e)) {
          return {
            success: false,
            error: 'UPDATE_GOVERNANCE_FAILED',
            message: `治理开关更新失败：${String(e?.errMsg || e?.message || 'unknown').slice(0, 120)}`,
          }
        }
        // 兼容：未建 opsConfigs 集合时，先把配置快照写入 adminActions 日志，保持功能可用。
        afterState = {
          key: 'publish_governance',
          cityId: safeCityId,
          version,
          publishGovernanceConfig: payload,
          updatedBy: OPENID,
          updatedAt: new Date(),
          persistMode: 'adminActions_fallback',
        }
        result = {
          message: '治理开关已更新（兼容模式）',
          tip: '建议创建 opsConfigs 集合后再试，可获得稳定配置读写能力',
          persistMode: 'adminActions_fallback',
          publishGovernanceConfig: payload,
          version,
          updatedAt: afterState?.updatedAt || null,
        }
      }
      break
    }

    default:
      return { success: false, error: 'UNKNOWN_ACTION', message: '未知操作类型' }
  }

  if (notifyAfterAction && (action === 'hide' || action === 'resolve_report_hide')) {
    try {
      notifySummary = await notifyActivityCancelled({
        activity: activityForNotify,
        reason: normalizedReason,
      })
      if (notifySummary.attempted > 0) {
        result.message = `${result.message}（通知 ${notifySummary.success}/${notifySummary.attempted}）`
      }
    } catch (e) {
      notifySummary = {
        attempted: 0,
        success: 0,
        failed: 0,
        skipped: true,
        reason: e.message || 'NOTIFY_FAILED',
      }
    }
  }

  const finalCityId = cityId || beforeState?.cityId || afterState?.cityId || adminCityId || 'dali'
  await db.collection('adminActions').add({
    data: {
      actionId: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: OPENID,
      adminOpenid: OPENID,
      adminRole,
      targetId: finalTargetId,
      targetType: finalTargetType,
      action,
      actionType: action,
      reason: normalizedReason,
      beforeState: beforeState || null,
      afterState: afterState || null,
      linkedActivityId: linkedActivityId || '',
      linkedReportId: linkedReportId || '',
      notifyAfterAction,
      notifySummary,
      expiresAt,
      rollbackAt: null,
      rollbackResult: null,
      actionSource,
      canAutoExecute,
      manualOverride,
      dryRun: false,
      agentTraceId,
      result: result.message,
      cityId: finalCityId,
      outcomeVerified: null,
      outcomeNote: null,
      createdAt: db.serverDate(),
    }
  })

  return { success: true, ...result, notification: notifySummary }
}
