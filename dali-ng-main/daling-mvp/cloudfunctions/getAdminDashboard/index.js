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
        title: true,
        publisherNickname: true,
        currentParticipants: true,
        status: true,
        isRecommended: true,
        location: true,
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

  const [pendingUsersRes, reportsRes, activitiesRes, actionLogsRes] = await Promise.all([
    db.collection('users')
      .where({ verifyStatus: 'pending' })
      .field({ _id: true, _openid: true, nickname: true, avatarUrl: true })
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
        title: true,
        publisherNickname: true,
        currentParticipants: true,
        status: true,
        isRecommended: true,
        location: true,
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
          'ban',
          'resolve_report_hide',
          'resolve_report_ignore',
        ]),
      })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .field({
        _id: true,
        action: true,
        targetId: true,
        targetType: true,
        linkedActivityId: true,
        linkedReportId: true,
        beforeState: true,
        afterState: true,
        reason: true,
        result: true,
        cityId: true,
        adminOpenid: true,
        adminRole: true,
        createdAt: true,
      })
      .get()
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
    reportList,
    activityList: enrichedActivityList,
    actionLogList,
    serverTimestamp: Date.now(),
  }
}
