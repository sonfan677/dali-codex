const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function safeText(v, max = 200) {
  return String(v || '').slice(0, max)
}

function isTruthy(value) {
  const text = String(value || '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'on', 'y'].includes(text)
}

function parsePositiveNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeIp(raw) {
  const text = safeText(raw, 200)
  if (!text) return ''
  return text.split(',')[0].trim()
}

function getClientIp(event = {}, context = {}) {
  const fromEvent = [
    event.sourceIp,
    event.clientIp,
    event.realIp,
    event.headers?.['x-forwarded-for'],
    event.headers?.['x-real-ip'],
  ]
  for (const item of fromEvent) {
    const ip = normalizeIp(item)
    if (ip) return ip
  }

  const fromContext = [
    context.CLIENTIP,
    context.clientIP,
    context.CLIENT_IP,
  ]
  for (const item of fromContext) {
    const ip = normalizeIp(item)
    if (ip) return ip
  }

  return ''
}

function matchIpRule(ip = '', rule = '') {
  if (!ip || !rule) return false
  if (rule === '*') return true
  if (rule.endsWith('*')) {
    const prefix = rule.slice(0, -1)
    return ip.startsWith(prefix)
  }
  return ip === rule
}

function isIpAllowed(ip = '', rules = []) {
  if (!rules.length) return true
  if (!ip) return false
  return rules.some((rule) => matchIpRule(ip, rule))
}

function toSecondsTimestamp(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return NaN
  if (n > 1e12) return Math.floor(n / 1000)
  return Math.floor(n)
}

function buildSignaturePayload({
  timestampSec,
  nonce,
  ticket,
  openid,
  result,
  traceId,
  callbackId,
}) {
  return [
    timestampSec,
    nonce,
    ticket || '',
    openid || '',
    result || '',
    traceId || '',
    callbackId || '',
  ].join('|')
}

function calcHmacSha256(payload = '', secret = '') {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

function buildIdempotencyKey(event = {}, ticket = '', openid = '', result = '') {
  const callbackId = safeText(event?.callbackId, 120)
  const traceId = safeText(event?.traceId, 120)
  if (callbackId) return `cbid:${callbackId}`
  if (traceId) return `trace:${traceId}`
  return `digest:${ticket || '-'}|${openid || '-'}|${result || '-'}`
}

async function findAuditByKey(idempotencyKey) {
  const { data } = await db.collection('officialVerifyAudits')
    .where({ idempotencyKey })
    .limit(1)
    .get()
    .catch(() => ({ data: [] }))
  return data[0] || null
}

async function ensureAuditRecord(base = {}, existing = null) {
  if (existing?._id) {
    await db.collection('officialVerifyAudits').doc(existing._id).update({
      data: {
        ...base,
        retryCount: _.inc(1),
        updatedAt: db.serverDate(),
      },
    })
    return existing._id
  }
  const addRes = await db.collection('officialVerifyAudits').add({
    data: {
      ...base,
      retryCount: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })
  return addRes._id
}

async function finishAudit(auditId, patch = {}) {
  if (!auditId) return
  await db.collection('officialVerifyAudits').doc(auditId).update({
    data: {
      ...patch,
      updatedAt: db.serverDate(),
    },
  }).catch(() => {})
}

async function maybeTriggerFailAlert({ failureStatus = '', failureMessage = '' } = {}) {
  const statusText = String(failureStatus || '')
  if (!statusText.startsWith('FAILED')) return null

  const threshold = parsePositiveNumber(process.env.OFFICIAL_VERIFY_FAIL_ALERT_THRESHOLD, 5)
  const windowMinutes = parsePositiveNumber(process.env.OFFICIAL_VERIFY_FAIL_ALERT_WINDOW_MINUTES, 30)
  const windowMs = windowMinutes * 60 * 1000
  const since = new Date(Date.now() - windowMs)

  const { data: recentAudits } = await db.collection('officialVerifyAudits')
    .where({
      updatedAt: _.gte(since),
    })
    .orderBy('updatedAt', 'desc')
    .limit(80)
    .field({
      _id: true,
      status: true,
      updatedAt: true,
    })
    .get()
    .catch(() => ({ data: [] }))

  let consecutiveFailed = 0
  for (const item of recentAudits || []) {
    const s = String(item.status || '')
    if (s.startsWith('FAILED')) {
      consecutiveFailed += 1
      continue
    }
    if (s === 'SUCCESS') break
  }

  if (consecutiveFailed < threshold) return null

  const bucket = Math.floor(Date.now() / windowMs)
  const alertKey = `official_verify_alert_${windowMinutes}m_${bucket}`
  const { data: exists } = await db.collection('adminActions')
    .where({
      action: 'official_verify_alert',
      alertKey,
    })
    .limit(1)
    .get()
    .catch(() => ({ data: [] }))

  if (exists && exists.length > 0) {
    return {
      triggered: false,
      alreadyExists: true,
      consecutiveFailed,
      threshold,
      windowMinutes,
    }
  }

  await db.collection('adminActions').add({
    data: {
      actionId: `official_verify_alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: 'system',
      adminOpenid: 'system',
      adminRole: 'system',
      targetId: '',
      targetType: 'system',
      action: 'official_verify_alert',
      actionType: 'official_verify_alert',
      reason: `官方实名回调连续失败 ${consecutiveFailed} 次（${windowMinutes} 分钟窗口）`,
      result: failureMessage || failureStatus || 'CALLBACK_FAILED',
      cityId: 'dali',
      alertKey,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  }).catch(() => {})

  return {
    triggered: true,
    consecutiveFailed,
    threshold,
    windowMinutes,
    alertKey,
  }
}

exports.main = async (event = {}, context = {}) => {
  const callbackToken = safeText(event?.token, 120)
  const configuredToken = safeText(process.env.OFFICIAL_VERIFY_CALLBACK_TOKEN, 120)
  const clientIp = getClientIp(event, context)

  const ticket = safeText(event?.ticket, 120)
  const openid = safeText(event?.openid, 120)
  const result = String(event?.result || '').toLowerCase()
  const detail = safeText(event?.detail, 300)
  const traceId = safeText(event?.traceId, 120)
  const callbackId = safeText(event?.callbackId, 120)
  const idempotencyKey = buildIdempotencyKey(event, ticket, openid, result)

  const existingAudit = await findAuditByKey(idempotencyKey)
  if (existingAudit?.status === 'SUCCESS') {
    return {
      success: true,
      idempotent: true,
      openid: existingAudit.userOpenid || openid || '',
      result: existingAudit.result || result,
      verifyStatus: existingAudit.verifyStatus || '',
      officialVerifyStatus: existingAudit.officialVerifyStatus || '',
      message: '重复回调已幂等处理',
    }
  }

  const auditId = await ensureAuditRecord({
    idempotencyKey,
    callbackId,
    traceId,
    clientIp,
    tokenPassed: configuredToken ? callbackToken === configuredToken : true,
    ticket,
    openid,
    result,
    detail,
    status: 'PROCESSING',
    retriable: false,
  }, existingAudit)

  const fail = async (status, error, message, retriable = false, extra = {}) => {
    await finishAudit(auditId, {
      status,
      retriable,
      error,
      message,
      ...extra,
    })
    const alert = await maybeTriggerFailAlert({
      failureStatus: status,
      failureMessage: message,
    })
    return {
      success: false,
      error,
      message,
      alertTriggered: !!alert?.triggered,
    }
  }

  if (configuredToken && callbackToken !== configuredToken) {
    return fail('FAILED_UNAUTHORIZED', 'UNAUTHORIZED', 'callback token 无效', true)
  }

  const ipWhitelistEnabled = isTruthy(process.env.OFFICIAL_VERIFY_IP_WHITELIST_ENABLED)
  const whitelist = splitCsv(process.env.OFFICIAL_VERIFY_IP_WHITELIST)
  if (ipWhitelistEnabled && whitelist.length > 0 && !isIpAllowed(clientIp, whitelist)) {
    return fail('FAILED_IP_DENIED', 'IP_DENIED', '回调来源IP不在白名单内', true, {
      whitelistChecked: true,
    })
  }

  const signSecret = safeText(process.env.OFFICIAL_VERIFY_SIGN_SECRET, 200)
  const signatureRequired = isTruthy(process.env.OFFICIAL_VERIFY_SIGNATURE_REQUIRED)
  const timestampRaw = event?.timestamp
  const nonce = safeText(event?.nonce, 120)
  const signature = safeText(event?.signature, 200).toLowerCase()
  const ttlSeconds = parsePositiveNumber(process.env.OFFICIAL_VERIFY_SIGN_TTL_SECONDS, 300)

  if (signatureRequired || signSecret) {
    if (!signSecret) {
      return fail('FAILED_SIGN_CONFIG', 'SIGN_CONFIG_MISSING', '签名校验已开启但缺少签名密钥配置', false)
    }
    const timestampSec = toSecondsTimestamp(timestampRaw)
    if (!Number.isFinite(timestampSec) || !nonce || !signature) {
      return fail('FAILED_INVALID_SIGNATURE_PARAMS', 'INVALID_SIGNATURE_PARAMS', '缺少签名参数（timestamp/nonce/signature）', false)
    }
    const nowSec = Math.floor(Date.now() / 1000)
    if (Math.abs(nowSec - timestampSec) > ttlSeconds) {
      return fail('FAILED_SIGNATURE_EXPIRED', 'SIGNATURE_EXPIRED', `签名时间戳超时（>${ttlSeconds}s）`, true, {
        signatureTimestamp: timestampSec,
      })
    }

    const payload = buildSignaturePayload({
      timestampSec,
      nonce,
      ticket,
      openid,
      result,
      traceId,
      callbackId,
    })
    const expected = calcHmacSha256(payload, signSecret).toLowerCase()
    if (signature !== expected) {
      return fail('FAILED_SIGNATURE_MISMATCH', 'SIGNATURE_MISMATCH', '签名校验失败', true, {
        signaturePayload: payload,
      })
    }
  }

  if (!ticket && !openid) {
    return fail('FAILED_INVALID_PARAMS', 'INVALID_PARAMS', 'ticket/openid 至少传一个', false)
  }
  if (!['approved', 'rejected'].includes(result)) {
    return fail('FAILED_INVALID_RESULT', 'INVALID_RESULT', 'result 仅支持 approved/rejected', false)
  }

  let user = null
  if (ticket) {
    const byTicket = await db.collection('users')
      .where({ officialVerifyTicket: ticket })
      .limit(1)
      .get()
      .catch(() => ({ data: [] }))
    user = byTicket?.data?.[0] || null
  }

  if (!user && openid) {
    const byOpenid = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
      .catch(() => ({ data: [] }))
    user = byOpenid?.data?.[0] || null
  }

  if (!user) {
    return fail('FAILED_USER_NOT_FOUND', 'USER_NOT_FOUND', '未找到对应用户', true)
  }

  if (String(user.officialVerifyLastEventKey || '') === idempotencyKey) {
    const verifyStatus = user.verifyStatus || ''
    const officialVerifyStatus = user.officialVerifyStatus || ''
    await finishAudit(auditId, {
      status: 'SUCCESS',
      retriable: false,
      userOpenid: user._openid,
      verifyStatus,
      officialVerifyStatus,
      message: '重复回调已幂等处理',
      result,
      processedAt: db.serverDate(),
    })
    return {
      success: true,
      idempotent: true,
      openid: user._openid,
      result,
      verifyStatus,
      officialVerifyStatus,
      message: '重复回调已幂等处理',
    }
  }

  const verifyStatus = result === 'approved' ? 'approved' : 'rejected'
  const officialVerifyStatus = result === 'approved' ? 'verified' : 'rejected'

  const patch = {
    verifyProvider: 'wechat_official',
    officialVerifyStatus,
    officialVerifyTicket: ticket || user.officialVerifyTicket || null,
    officialVerifyTraceId: traceId || '',
    officialVerifyDetail: detail || '',
    officialVerifiedAt: result === 'approved' ? db.serverDate() : (user.officialVerifiedAt || null),
    officialVerifyLastCallbackAt: db.serverDate(),
    officialVerifyLastEventKey: idempotencyKey,
    officialVerifyLastError: result === 'approved' ? '' : (detail || '官方核验未通过'),
    verifyStatus,
    isVerified: result === 'approved',
    updatedAt: db.serverDate(),
  }

  await db.collection('users').doc(user._id).update({ data: patch })

  const { data: existedActions } = await db.collection('adminActions')
    .where({
      action: 'official_verify_callback',
      callbackKey: idempotencyKey,
    })
    .limit(1)
    .get()
    .catch(() => ({ data: [] }))

  if (!existedActions.length) {
    await db.collection('adminActions').add({
      data: {
        actionId: `official_verify_callback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        adminId: 'system',
        adminOpenid: 'system',
        adminRole: 'system',
        targetId: user._openid,
        targetType: 'user',
        action: 'official_verify_callback',
        actionType: 'official_verify_callback',
        reason: detail || `微信官方实名认证回调：${result}`,
        result,
        verifyTicket: ticket || user.officialVerifyTicket || '',
        cityId: user.cityId || 'dali',
        traceId,
        clientIp,
        callbackKey: idempotencyKey,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    }).catch(() => {})
  }

  await finishAudit(auditId, {
    status: 'SUCCESS',
    retriable: false,
    userOpenid: user._openid,
    verifyStatus,
    officialVerifyStatus,
    message: '回调处理成功',
    result,
    processedAt: db.serverDate(),
  })

  return {
    success: true,
    idempotent: false,
    openid: user._openid,
    result,
    verifyStatus,
    officialVerifyStatus,
  }
}
