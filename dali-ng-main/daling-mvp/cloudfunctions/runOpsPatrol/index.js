const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parsePositiveNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseAdminMeta(openid = '') {
  const adminOpenids = splitCsv(process.env.ADMIN_OPENIDS)
  const roleMap = splitCsv(process.env.ADMIN_ROLE_MAP)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})
  const cityScopeMap = splitCsv(process.env.ADMIN_CITY_SCOPE)
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

function toMs(value) {
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

function severityRank(level = '') {
  const map = { low: 1, medium: 2, high: 3 }
  return map[String(level || '').toLowerCase()] || 0
}

function levelAtLeast(level, base) {
  return severityRank(level) >= severityRank(base)
}

function safeSliceList(list = [], max = 5) {
  return Array.isArray(list) ? list.slice(0, max) : []
}

async function collectPendingReports(cityId, overdueHours = 24, nowMs = Date.now()) {
  const { data } = await db.collection('adminActions')
    .where({ action: 'report' })
    .orderBy('createdAt', 'desc')
    .limit(500)
    .field({
      _id: true,
      cityId: true,
      reason: true,
      reportStatus: true,
      createdAt: true,
      targetId: true,
    })
    .get()
    .catch(() => ({ data: [] }))

  const cityRows = (data || []).filter((item) => !cityId || !item.cityId || item.cityId === cityId)
  const pendingRows = cityRows.filter((item) => {
    const status = String(item.reportStatus || 'PENDING').toUpperCase()
    return status !== 'HANDLED' && status !== 'IGNORED'
  })

  const overdueMs = Math.max(1, overdueHours) * 60 * 60 * 1000
  const overdueRows = pendingRows.filter((item) => {
    const createdMs = toMs(item.createdAt)
    return Number.isFinite(createdMs) && createdMs <= nowMs - overdueMs
  })

  return {
    totalPending: pendingRows.length,
    overdueCount: overdueRows.length,
    samples: safeSliceList(overdueRows.map((item) => ({
      targetId: item.targetId || '',
      reason: item.reason || '',
      createdAt: item.createdAt || null,
    })), 3),
  }
}

async function collectPendingVerify(cityId, overdueHours = 24, nowMs = Date.now()) {
  const { data } = await db.collection('users')
    .where({ verifyStatus: 'pending' })
    .limit(500)
    .field({
      _id: true,
      _openid: true,
      cityId: true,
      nickname: true,
      verifySubmittedAt: true,
      updatedAt: true,
      createdAt: true,
      verifyProvider: true,
    })
    .get()
    .catch(() => ({ data: [] }))

  const cityRows = (data || []).filter((item) => !cityId || !item.cityId || item.cityId === cityId)
  const overdueMs = Math.max(1, overdueHours) * 60 * 60 * 1000
  const overdueRows = cityRows.filter((item) => {
    const baseMs = toMs(item.verifySubmittedAt || item.updatedAt || item.createdAt)
    return Number.isFinite(baseMs) && baseMs <= nowMs - overdueMs
  })

  return {
    totalPending: cityRows.length,
    overdueCount: overdueRows.length,
    samples: safeSliceList(overdueRows.map((item) => ({
      openid: item._openid || '',
      nickname: item.nickname || '',
      verifyProvider: item.verifyProvider || '',
      verifySubmittedAt: item.verifySubmittedAt || item.updatedAt || item.createdAt || null,
    })), 3),
  }
}

async function collectSupplyAlert(cityId) {
  const { data } = await db.collection('supplyMetrics')
    .where({ cityId })
    .orderBy('dateKey', 'desc')
    .limit(1)
    .field({
      cityId: true,
      dateKey: true,
      alertLevel: true,
      alertFlags: true,
      weekSummary: true,
    })
    .get()
    .catch(() => ({ data: [] }))

  const latest = data && data[0] ? data[0] : null
  if (!latest) {
    return {
      hasData: false,
      alertLevel: 'normal',
      alertFlags: [],
      dateKey: '',
      weekSummary: {},
    }
  }

  return {
    hasData: true,
    alertLevel: String(latest.alertLevel || 'normal').toLowerCase(),
    alertFlags: Array.isArray(latest.alertFlags) ? latest.alertFlags : [],
    dateKey: latest.dateKey || '',
    weekSummary: latest.weekSummary || {},
  }
}

async function addAdminAction(data = {}) {
  await db.collection('adminActions').add({
    data: {
      actionId: `${data.action || 'ops_patrol'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: data.adminOpenid || 'system',
      adminOpenid: data.adminOpenid || 'system',
      adminRole: data.adminRole || 'system',
      targetId: data.targetId || '',
      targetType: data.targetType || 'system',
      action: data.action || 'ops_patrol_run',
      actionType: data.action || 'ops_patrol_run',
      reason: data.reason || '',
      result: data.result || '',
      cityId: data.cityId || 'dali',
      patrolLevel: data.patrolLevel || 'normal',
      patrolScore: Number(data.patrolScore || 0),
      patrolTriggeredCount: Number(data.patrolTriggeredCount || 0),
      patrolSignature: data.patrolSignature || '',
      patrolSummary: data.patrolSummary || {},
      patrolChecks: data.patrolChecks || [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  }).catch(() => null)
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const adminMeta = parseAdminMeta(OPENID)
  const runToken = String(event.runToken || '')
  const envRunToken = String(process.env.OPS_PATROL_RUN_TOKEN || '')
  const tokenPassed = envRunToken && runToken && runToken === envRunToken
  const canRun = adminMeta.isAdmin || tokenPassed

  if (!canRun) {
    return { success: false, error: 'UNAUTHORIZED', message: '无权限执行巡检' }
  }

  const nowMs = Date.now()
  const source = String(event.source || (adminMeta.isAdmin ? 'admin_manual' : 'system_auto')).slice(0, 40)
  const cityId = adminMeta.adminRole === 'cityAdmin'
    ? adminMeta.cityId
    : String(event.cityId || adminMeta.cityId || 'dali')

  const reportSlaHours = parsePositiveNumber(process.env.OPS_PATROL_REPORT_PENDING_SLA_HOURS, 24)
  const verifySlaHours = parsePositiveNumber(process.env.OPS_PATROL_VERIFY_PENDING_SLA_HOURS, 24)
  const supplyAlertLevel = String(process.env.OPS_PATROL_SUPPLY_ALERT_LEVEL || 'high').toLowerCase()
  const alertEnabled = String(process.env.OPS_PATROL_ENABLE_ALERT || 'true').toLowerCase() !== 'false'
  const alertCooldownMinutes = parsePositiveNumber(process.env.OPS_PATROL_ALERT_COOLDOWN_MINUTES, 30)

  const [reportCheck, verifyCheck, supplyCheck] = await Promise.all([
    collectPendingReports(cityId, reportSlaHours, nowMs),
    collectPendingVerify(cityId, verifySlaHours, nowMs),
    collectSupplyAlert(cityId),
  ])

  const checks = [
    {
      code: 'PENDING_REPORT_OVERDUE',
      label: '举报待处理超时',
      severity: 'high',
      triggered: reportCheck.overdueCount > 0,
      metric: reportCheck.overdueCount,
      message: reportCheck.overdueCount > 0
        ? `有 ${reportCheck.overdueCount} 条举报超过 ${reportSlaHours}h 未处理`
        : '举报处理时效正常',
    },
    {
      code: 'PENDING_VERIFY_OVERDUE',
      label: '认证待处理超时',
      severity: 'medium',
      triggered: verifyCheck.overdueCount > 0,
      metric: verifyCheck.overdueCount,
      message: verifyCheck.overdueCount > 0
        ? `有 ${verifyCheck.overdueCount} 条认证超过 ${verifySlaHours}h 未处理`
        : '认证处理时效正常',
    },
    {
      code: 'SUPPLY_ALERT_LEVEL',
      label: '供给指标预警',
      severity: 'medium',
      triggered: supplyCheck.hasData && levelAtLeast(supplyCheck.alertLevel, supplyAlertLevel) && supplyCheck.alertFlags.length > 0,
      metric: supplyCheck.alertFlags.length,
      message: supplyCheck.hasData
        ? `供给预警等级 ${supplyCheck.alertLevel}（${supplyCheck.alertFlags.join(',') || '无预警'}）`
        : '供给指标暂无数据',
    },
  ]

  const triggeredChecks = checks.filter((item) => item.triggered)
  const hasHigh = triggeredChecks.some((item) => item.severity === 'high')
  const hasMedium = triggeredChecks.some((item) => item.severity === 'medium')
  const level = hasHigh ? 'high' : hasMedium ? 'medium' : 'normal'
  const score = triggeredChecks.reduce((sum, item) => {
    if (item.severity === 'high') return sum + 40
    if (item.severity === 'medium') return sum + 25
    return sum + 10
  }, 0)

  const summary = {
    cityId,
    level,
    score,
    triggeredCount: triggeredChecks.length,
    reportOverdueCount: reportCheck.overdueCount,
    verifyOverdueCount: verifyCheck.overdueCount,
    supplyAlertLevel: supplyCheck.alertLevel || 'normal',
    supplyAlertFlags: supplyCheck.alertFlags || [],
    checkedAt: new Date(nowMs).toISOString(),
    source,
    reportSlaHours,
    verifySlaHours,
  }

  const patrolSignature = `${cityId}|${triggeredChecks.map((item) => item.code).sort().join(',') || 'NONE'}`
  let alertTriggered = false
  if (alertEnabled && triggeredChecks.length > 0) {
    const since = new Date(nowMs - alertCooldownMinutes * 60 * 1000)
    const { data: recent } = await db.collection('adminActions')
      .where({
        action: 'ops_patrol_alert',
        cityId,
        createdAt: db.command.gte(since),
        patrolSignature,
      })
      .limit(1)
      .get()
      .catch(() => ({ data: [] }))

    if (!recent || recent.length === 0) {
      alertTriggered = true
      await addAdminAction({
        action: 'ops_patrol_alert',
        adminOpenid: OPENID || 'system',
        adminRole: adminMeta.isAdmin ? adminMeta.adminRole : 'system',
        targetId: cityId,
        targetType: 'system',
        cityId,
        reason: `运营自动巡检发现 ${triggeredChecks.length} 项风险`,
        result: triggeredChecks.map((item) => item.message).join('；').slice(0, 500),
        patrolLevel: level,
        patrolScore: score,
        patrolTriggeredCount: triggeredChecks.length,
        patrolSignature,
        patrolSummary: summary,
        patrolChecks: triggeredChecks,
      })
    }
  }

  await addAdminAction({
    action: 'ops_patrol_run',
    adminOpenid: OPENID || 'system',
    adminRole: adminMeta.isAdmin ? adminMeta.adminRole : 'system',
    targetId: cityId,
    targetType: 'system',
    cityId,
    reason: source === 'admin_manual' ? '管理员手动执行运营巡检' : '系统自动执行运营巡检',
    result: `level=${level}; score=${score}; triggered=${triggeredChecks.length}; alert=${alertTriggered ? 'yes' : 'no'}`,
    patrolLevel: level,
    patrolScore: score,
    patrolTriggeredCount: triggeredChecks.length,
    patrolSignature,
    patrolSummary: summary,
    patrolChecks: checks,
  })

  return {
    success: true,
    cityId,
    level,
    score,
    triggeredCount: triggeredChecks.length,
    alertTriggered,
    summary,
    checks,
    reportCheck,
    verifyCheck,
    supplyCheck,
    executedAt: new Date(nowMs).toISOString(),
  }
}
