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

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const meta = parseAdminMeta(OPENID)

  if (!meta.isAdmin) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const [pendingUsersRes, reportsRes, activitiesRes, actionLogsRes, officialVerifyAuditRes, retryUsersRes, userProfilesRes] = await Promise.all([
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
          'official_verify_alert_immediate',
          'official_verify_callback',
          'ops_patrol_run',
          'ops_patrol_alert',
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
      .catch(() => ({ data: [] })),
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
        identityCheckRequired: true,
        identityCheckStatus: true,
        identityCheckReasons: true,
        identityCheckTriggeredAt: true,
        realName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      })
      .get()
      .catch(() => ({ data: [] })),
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
  const rawUserProfiles = shouldFilterCity
    ? (userProfilesRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId)
    : (userProfilesRes.data || [])

  const officialVerifyAuditList = (officialVerifyAuditRes.data || []).slice(0, 60)
  const officialVerifyAuditSummary = officialVerifyAuditList.reduce((acc, item) => {
    acc.total += 1
    const status = String(item.status || '')
    if (status === 'SUCCESS') acc.success += 1
    else if (status.startsWith('FAILED')) acc.failed += 1
    else acc.processing += 1
    if (item.retriable) acc.retriable += 1
    if (status === 'FAILED_REPLAY_ATTACK') acc.replayBlocked += 1
    if (
      status === 'FAILED_SIGNATURE_MISMATCH'
      || status === 'FAILED_SIGNATURE_EXPIRED'
      || status === 'FAILED_INVALID_SIGNATURE_PARAMS'
      || status === 'FAILED_SIGN_CONFIG'
    ) acc.signatureFailed += 1
    if (status === 'FAILED_UNAUTHORIZED') acc.unauthorizedFailed += 1
    if (status === 'FAILED_IP_DENIED') acc.ipDenied += 1
    return acc
  }, {
    total: 0,
    success: 0,
    failed: 0,
    processing: 0,
    retriable: 0,
    replayBlocked: 0,
    signatureFailed: 0,
    unauthorizedFailed: 0,
    ipDenied: 0,
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
  const officialVerifyThresholdAlertList = rawActionLogs
    .filter((item) => item.action === 'official_verify_alert')
    .slice(0, 10)
  const officialVerifyImmediateAlertList = rawActionLogs
    .filter((item) => item.action === 'official_verify_alert_immediate')
    .slice(0, 20)
  const thresholdAlertCount24h = officialVerifyThresholdAlertList.filter((item) => {
    const ts = new Date(item.createdAt).getTime()
    return Number.isFinite(ts) && ts >= last24hMs
  }).length
  const immediateAlertCount24h = officialVerifyImmediateAlertList.filter((item) => {
    const ts = new Date(item.createdAt).getTime()
    return Number.isFinite(ts) && ts >= last24hMs
  }).length
  const officialVerifyAlertList = [...officialVerifyImmediateAlertList, ...officialVerifyThresholdAlertList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)

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

  const userProfileList = rawUserProfiles
    .slice(0, 300)
    .map((item) => {
      const realNamePlain = maybeDecodeSensitive(item.realName || '')
      const phonePlain = maybeDecodeSensitive(item.phone || '')
      const identityReasons = normalizeIdentityReasons(item.identityCheckReasons)
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
        identityCheckRequired: !!item.identityCheckRequired,
        identityCheckStatus: item.identityCheckStatus || 'none',
        identityCheckReasons: identityReasons,
        identityCheckTriggeredAt: item.identityCheckTriggeredAt || null,
        hasRealName: !!realNamePlain,
        hasPhone: !!phonePlain,
        realNameMasked: maskName(realNamePlain),
        phoneMasked: maskPhone(phonePlain),
        realNamePlain,
        phonePlain,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      }
    })

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
        alertCount24h: immediateAlertCount24h + thresholdAlertCount24h,
        immediateAlertCount24h,
        thresholdAlertCount24h,
      },
      recent: officialVerifyAuditList,
      alerts: officialVerifyAlertList,
      immediateAlerts: officialVerifyImmediateAlertList.slice(0, 10),
      thresholdAlerts: officialVerifyThresholdAlertList,
    },
    opsPatrol: {
      summary: latestOpsPatrol
        ? {
            level: latestOpsPatrol.patrolLevel || latestOpsPatrol.patrolSummary?.level || 'normal',
            score: Number(latestOpsPatrol.patrolScore || latestOpsPatrol.patrolSummary?.score || 0),
            triggeredCount: Number(latestOpsPatrol.patrolTriggeredCount || latestOpsPatrol.patrolSummary?.triggeredCount || 0),
            cityId: latestOpsPatrol.patrolSummary?.cityId || latestOpsPatrol.cityId || meta.cityId,
            checkedAt: latestOpsPatrol.patrolSummary?.checkedAt || latestOpsPatrol.createdAt || null,
            reportOverdueCount: Number(latestOpsPatrol.patrolSummary?.reportOverdueCount || 0),
            verifyOverdueCount: Number(latestOpsPatrol.patrolSummary?.verifyOverdueCount || 0),
            officialVerifyFailedCount: Number(latestOpsPatrol.patrolSummary?.officialVerifyFailedCount || 0),
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
            officialVerifyFailedCount: 0,
            supplyAlertLevel: 'normal',
            supplyAlertFlags: [],
            source: '',
            alertCount24h: opsPatrolAlertCount24h,
            hasRecentRun: false,
          },
      latestChecks: latestOpsPatrol?.patrolChecks || [],
      alerts: opsPatrolAlertList,
      runs: opsPatrolRunList.slice(0, 8),
    },
    reportList,
    activityList: enrichedActivityList,
    actionLogList,
    userProfileList,
    serverTimestamp: Date.now(),
  }
}
