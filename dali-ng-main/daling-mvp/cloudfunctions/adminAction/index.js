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

function parseIntSafe(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : fallback
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
          _id: 'user_segment_rule',
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
