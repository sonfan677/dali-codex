const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function isTruthy(value) {
  const text = String(value || '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'on', 'y'].includes(text)
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
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

function normalizeScenario(value = '') {
  const safe = String(value || '').trim().toLowerCase()
  if (safe === 'medium' || safe === 'high') return safe
  return 'high'
}

function getCurrentEnvName(context = {}) {
  return String(
    context.ENV
      || process.env.TCB_ENV
      || process.env.WX_CLOUD_ENV
      || ''
  ).trim()
}

function buildSeedTag(customTag = '') {
  const safe = String(customTag || '').trim()
  if (safe) return safe.slice(0, 80)
  return `ops_patrol_seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function addAdminAction(data = {}) {
  await db.collection('adminActions').add({
    data: {
      actionId: `ops_patrol_seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: data.adminOpenid || 'system',
      adminOpenid: data.adminOpenid || 'system',
      adminRole: data.adminRole || 'system',
      targetId: data.targetId || '',
      targetType: data.targetType || 'system',
      action: data.action || 'ops_patrol_seed_data',
      actionType: data.action || 'ops_patrol_seed_data',
      reason: data.reason || '',
      result: data.result || '',
      cityId: data.cityId || 'dali',
      seedTag: data.seedTag || '',
      isTestSeed: true,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  }).catch(() => null)
}

async function addReportSeeds({
  count = 0,
  cityId = 'dali',
  overdueHours = 30,
  seedTag = '',
  adminOpenid = 'system',
  adminRole = 'system',
}) {
  if (!count) return []
  const createdBase = Date.now() - Math.max(25, Number(overdueHours) || 30) * 60 * 60 * 1000
  const ids = []
  for (let i = 0; i < count; i += 1) {
    const row = await db.collection('adminActions').add({
      data: {
        actionId: `seed_report_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        adminId: adminOpenid,
        adminOpenid,
        adminRole,
        targetId: `seed_activity_${seedTag}_${i + 1}`,
        targetType: 'activity',
        action: 'report',
        actionType: 'report',
        reason: `【巡检造数】举报超时样本 ${i + 1}`,
        reportStatus: 'PENDING',
        cityId,
        reporterOpenid: `seed_reporter_${seedTag}_${i + 1}`,
        reporterNickname: `巡检举报样本${i + 1}`,
        seedTag,
        isTestSeed: true,
        createdAt: new Date(createdBase - i * 5 * 60 * 1000),
        updatedAt: db.serverDate(),
      },
    })
    ids.push(row._id)
  }
  return ids
}

async function addVerifySeeds({
  count = 0,
  cityId = 'dali',
  overdueHours = 30,
  seedTag = '',
}) {
  if (!count) return []
  const createdBase = Date.now() - Math.max(25, Number(overdueHours) || 30) * 60 * 60 * 1000
  const ids = []
  for (let i = 0; i < count; i += 1) {
    const row = await db.collection('users').add({
      data: {
        nickname: `巡检待审样本${i + 1}`,
        cityId,
        verifyStatus: 'pending',
        verifyProvider: 'wechat_official',
        officialVerifyStatus: 'pending_callback',
        officialVerifyTicket: `seed_ticket_${seedTag}_${i + 1}`,
        verifySubmittedAt: new Date(createdBase - i * 6 * 60 * 1000),
        seedTag,
        isTestSeed: true,
        createdAt: new Date(createdBase - i * 6 * 60 * 1000),
        updatedAt: db.serverDate(),
      },
    })
    ids.push(row._id)
  }
  return ids
}

async function addOfficialFailSeeds({
  count = 0,
  seedTag = '',
}) {
  if (!count) return []
  const nowMs = Date.now()
  const ids = []
  for (let i = 0; i < count; i += 1) {
    const row = await db.collection('officialVerifyAudits').add({
      data: {
        idempotencyKey: `seed_official_fail_${seedTag}_${i + 1}`,
        callbackId: `seed_callback_${seedTag}_${i + 1}`,
        traceId: `seed_trace_${seedTag}_${i + 1}`,
        ticket: `seed_ticket_${seedTag}_${i + 1}`,
        openid: `seed_openid_${seedTag}_${i + 1}`,
        result: 'approved',
        status: 'FAILED_SIGNATURE_MISMATCH',
        retriable: true,
        error: 'SIGNATURE_MISMATCH',
        message: '【巡检造数】签名不匹配',
        retryCount: 0,
        seedTag,
        isTestSeed: true,
        createdAt: new Date(nowMs - (i + 1) * 8 * 60 * 1000),
        updatedAt: new Date(nowMs - i * 5 * 60 * 1000),
      },
    })
    ids.push(row._id)
  }
  return ids
}

async function removeByQuery(collectionName, query = {}) {
  let total = 0
  let rounds = 0
  while (rounds < 30) {
    rounds += 1
    const { data } = await db.collection(collectionName)
      .where(query)
      .field({ _id: true })
      .limit(100)
      .get()
      .catch(() => ({ data: [] }))
    if (!data || data.length === 0) break
    for (const item of data) {
      await db.collection(collectionName).doc(item._id).remove().catch(() => null)
      total += 1
    }
    if (data.length < 100) break
  }
  return total
}

async function cleanupSeedData({ seedTag = '', cleanupAll = false }) {
  const reportQuery = cleanupAll ? { isTestSeed: true, action: 'report' } : { isTestSeed: true, seedTag, action: 'report' }
  const userQuery = cleanupAll ? { isTestSeed: true, verifyStatus: 'pending' } : { isTestSeed: true, seedTag, verifyStatus: 'pending' }
  const auditQuery = cleanupAll ? { isTestSeed: true } : { isTestSeed: true, seedTag }

  const [reportRemoved, userRemoved, auditRemoved] = await Promise.all([
    removeByQuery('adminActions', reportQuery),
    removeByQuery('users', userQuery),
    removeByQuery('officialVerifyAudits', auditQuery),
  ])

  return {
    reportRemoved,
    userRemoved,
    auditRemoved,
    totalRemoved: reportRemoved + userRemoved + auditRemoved,
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext
  const adminMeta = parseAdminMeta(OPENID)
  const currentEnv = getCurrentEnvName(wxContext)

  const runToken = String(event.runToken || '')
  const envRunToken = String(process.env.OPS_PATROL_SEED_TOKEN || '')
  const tokenPassed = envRunToken && runToken && runToken === envRunToken
  const canRun = adminMeta.isAdmin || tokenPassed
  if (!canRun) {
    return { success: false, error: 'UNAUTHORIZED', message: '无权限执行测试造数' }
  }

  const mode = String(event.mode || 'seed').trim().toLowerCase()
  const seedTag = buildSeedTag(event.seedTag)
  const cityId = String(event.cityId || adminMeta.cityId || 'dali')
  const scenario = normalizeScenario(event.scenario)
  const cleanupAll = !!event.cleanupAll
  const seedEnabled = isTruthy(process.env.OPS_PATROL_SEED_ENABLED)
  const allowedEnvs = splitCsv(process.env.OPS_PATROL_SEED_ALLOWED_ENVS)
  const requireDualAuth = isTruthy(process.env.OPS_PATROL_SEED_REQUIRE_DUAL_AUTH)

  if (mode !== 'cleanup' && !seedEnabled) {
    return {
      success: false,
      error: 'SEED_DISABLED',
      message: '测试造数已关闭（OPS_PATROL_SEED_ENABLED=false）',
    }
  }

  if (mode !== 'cleanup' && allowedEnvs.length > 0) {
    const envMatched = currentEnv && allowedEnvs.includes(currentEnv)
    if (!envMatched) {
      return {
        success: false,
        error: 'ENV_DENIED',
        message: `当前环境 ${currentEnv || 'unknown'} 不在允许列表`,
      }
    }
  }

  if (mode !== 'cleanup' && requireDualAuth && !(adminMeta.isAdmin && tokenPassed)) {
    return {
      success: false,
      error: 'DUAL_AUTH_REQUIRED',
      message: '造数要求双重鉴权（管理员身份 + runToken）',
    }
  }

  if (mode === 'cleanup') {
    const cleanupResult = await cleanupSeedData({
      seedTag,
      cleanupAll,
    })
    await addAdminAction({
      action: 'ops_patrol_seed_cleanup',
      adminOpenid: OPENID || 'system',
      adminRole: adminMeta.isAdmin ? adminMeta.adminRole : 'system',
      targetId: cityId,
      cityId,
      seedTag: cleanupAll ? 'cleanup_all' : seedTag,
      reason: cleanupAll ? '清理全部巡检测试数据' : '清理指定巡检测试数据',
      result: `removed=${cleanupResult.totalRemoved}`,
    })
    return {
      success: true,
      mode,
      seedTag,
      cleanupAll,
      currentEnv,
      cleanupResult,
    }
  }

  const profile = scenario === 'medium'
    ? { reports: 0, verifies: 2, officialFails: 0 }
    : { reports: 3, verifies: 2, officialFails: 6 }

  if (event.clearBefore !== false) {
    await cleanupSeedData({
      seedTag,
      cleanupAll: true,
    })
  }

  const [reportIds, verifyIds, officialFailIds] = await Promise.all([
    addReportSeeds({
      count: profile.reports,
      cityId,
      overdueHours: Number(event.reportOverdueHours || 30),
      seedTag,
      adminOpenid: OPENID || 'system',
      adminRole: adminMeta.isAdmin ? adminMeta.adminRole : 'system',
    }),
    addVerifySeeds({
      count: profile.verifies,
      cityId,
      overdueHours: Number(event.verifyOverdueHours || 30),
      seedTag,
    }),
    addOfficialFailSeeds({
      count: profile.officialFails,
      seedTag,
    }),
  ])

  await addAdminAction({
    action: 'ops_patrol_seed_data',
    adminOpenid: OPENID || 'system',
    adminRole: adminMeta.isAdmin ? adminMeta.adminRole : 'system',
    targetId: cityId,
    cityId,
    seedTag,
    reason: `生成巡检测试数据（${scenario}）`,
    result: `reports=${reportIds.length}; verifies=${verifyIds.length}; officialFails=${officialFailIds.length}`,
  })

  return {
    success: true,
    mode,
    scenario,
    cityId,
    currentEnv,
    seedTag,
    inserted: {
      reports: reportIds.length,
      verifies: verifyIds.length,
      officialFails: officialFailIds.length,
    },
    tips: [
      '现在去管理后台点击「立即巡检」即可触发对应风险等级',
      '测试结束后调用 mode=cleanup 清理造数数据',
    ],
  }
}
