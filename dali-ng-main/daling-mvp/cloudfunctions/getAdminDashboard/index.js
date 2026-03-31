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
        categoryId: true,
        categoryLabel: true,
        title: true,
        publisherNickname: true,
        currentParticipants: true,
        status: true,
        isRecommended: true,
        riskLevel: true,
        riskScore: true,
        riskReasonCodes: true,
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

function resolveActionLinkedActivityId(item = {}) {
  if (item.targetType === 'activity' && item.targetId) return item.targetId
  if (item.linkedActivityId) return item.linkedActivityId
  if (item.beforeState?.activity?._id) return item.beforeState.activity._id
  if (item.beforeState?.targetId) return item.beforeState.targetId
  if (item.afterState?.activity?._id) return item.afterState.activity._id
  if (item.afterState?.targetId) return item.afterState.targetId
  return ''
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const meta = parseAdminMeta(OPENID)

  if (!meta.isAdmin) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const [pendingUsersRes, reportsRes, activitiesRes, actionLogsRes, officialVerifyAuditRes, retryUsersRes] = await Promise.all([
    db.collection('users')
      .where({ verifyStatus: 'pending' })
      .field({
        _id: true,
        _openid: true,
        nickname: true,
        avatarUrl: true,
        verifyProvider: true,
        officialVerifyStatus: true,
        officialVerifyTicket: true,
        officialVerifyRetryCount: true,
        officialVerifyLastError: true,
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
        categoryId: true,
        categoryLabel: true,
        title: true,
        publisherNickname: true,
        currentParticipants: true,
        status: true,
        isRecommended: true,
        riskLevel: true,
        riskScore: true,
        riskReasonCodes: true,
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
          'official_verify_retry',
          'mark_attendance',
          'ban',
          'resolve_report_hide',
          'resolve_report_ignore',
          'official_verify_alert',
          'official_verify_callback',
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
        reason: true,
        result: true,
        cityId: true,
        adminOpenid: true,
        adminRole: true,
        createdAt: true,
      })
      .get(),
    db.collection('officialVerifyAudits')
      .orderBy('updatedAt', 'desc')
      .limit(120)
      .field({
        _id: true,
        idempotencyKey: true,
        callbackId: true,
        traceId: true,
        ticket: true,
        openid: true,
        userOpenid: true,
        result: true,
        status: true,
        retriable: true,
        error: true,
        message: true,
        verifyStatus: true,
        officialVerifyStatus: true,
        retryCount: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      })
      .get()
      .catch(() => ({ data: [] })),
    db.collection('users')
      .where({
        officialVerifyRetryCount: _.gt(0),
      })
      .limit(300)
      .field({
        _id: true,
        _openid: true,
        cityId: true,
        isVerified: true,
        verifyStatus: true,
        officialVerifyRetryCount: true,
      })
      .get()
      .catch(() => ({ data: [] }))
  ])

  const shouldFilterCity = meta.adminRole === 'cityAdmin'
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

  const officialVerifyAuditList = (officialVerifyAuditRes.data || []).slice(0, 60)
  const officialVerifyAuditSummary = officialVerifyAuditList.reduce((acc, item) => {
    acc.total += 1
    const status = String(item.status || '')
    if (status === 'SUCCESS') acc.success += 1
    else if (status.startsWith('FAILED')) acc.failed += 1
    else acc.processing += 1
    if (item.retriable) acc.retriable += 1
    return acc
  }, {
    total: 0,
    success: 0,
    failed: 0,
    processing: 0,
    retriable: 0,
  })

  const pendingOfficialCount = (pendingUsersRes.data || [])
    .filter((item) => item.verifyProvider === 'wechat_official' || item.officialVerifyStatus === 'pending_callback')
    .length

  const totalEffective = officialVerifyAuditSummary.success + officialVerifyAuditSummary.failed
  const passRate = totalEffective > 0
    ? Number((officialVerifyAuditSummary.success / totalEffective).toFixed(4))
    : null

  const failReasonCounter = {}
  officialVerifyAuditList.forEach((item) => {
    const status = String(item.status || '')
    if (!status.startsWith('FAILED')) return
    const key = item.error || item.message || status
    failReasonCounter[key] = Number(failReasonCounter[key] || 0) + 1
  })
  const topFailReasons = Object.keys(failReasonCounter)
    .map((reason) => ({ reason, count: failReasonCounter[reason] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const rawRetryUsers = retryUsersRes.data || []
  const retryUsers = shouldFilterCity
    ? rawRetryUsers.filter((item) => !item.cityId || item.cityId === meta.cityId)
    : rawRetryUsers
  const retryUserCount = retryUsers.length
  const retryConvertedCount = retryUsers.filter((item) => item.isVerified || item.verifyStatus === 'approved').length
  const retryConversionRate = retryUserCount > 0
    ? Number((retryConvertedCount / retryUserCount).toFixed(4))
    : null

  const last24hMs = Date.now() - 24 * 60 * 60 * 1000
  const officialVerifyAlertList = rawActionLogs
    .filter((item) => item.action === 'official_verify_alert')
    .slice(0, 10)
  const officialVerifyAlertCount24h = officialVerifyAlertList.filter((item) => {
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

  return {
    success: true,
    currentOpenid: OPENID,
    adminRole: meta.adminRole,
    cityId: meta.cityId,
    pendingVerifyList: pendingUsersRes.data || [],
    officialVerifyAudit: {
      summary: {
        ...officialVerifyAuditSummary,
        pendingOfficialCount,
        passRate,
        retryUserCount,
        retryConvertedCount,
        retryConversionRate,
        topFailReasons,
        alertCount24h: officialVerifyAlertCount24h,
      },
      recent: officialVerifyAuditList,
      alerts: officialVerifyAlertList,
    },
    reportList,
    activityList: enrichedActivityList,
    actionLogList,
    serverTimestamp: Date.now(),
  }
}
