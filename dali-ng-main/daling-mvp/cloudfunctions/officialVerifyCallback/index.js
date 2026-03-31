const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function safeText(v, max = 200) {
  return String(v || '').slice(0, max)
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

exports.main = async (event = {}) => {
  const callbackToken = safeText(event?.token, 120)
  const configuredToken = safeText(process.env.OFFICIAL_VERIFY_CALLBACK_TOKEN, 120)

  const ticket = safeText(event?.ticket, 120)
  const openid = safeText(event?.openid, 120)
  const result = String(event?.result || '').toLowerCase()
  const detail = safeText(event?.detail, 300)
  const traceId = safeText(event?.traceId, 120)
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
    callbackId: safeText(event?.callbackId, 120),
    traceId,
    tokenPassed: configuredToken ? callbackToken === configuredToken : true,
    ticket,
    openid,
    result,
    detail,
    status: 'PROCESSING',
    retriable: false,
  }, existingAudit)

  if (configuredToken && callbackToken !== configuredToken) {
    await finishAudit(auditId, {
      status: 'FAILED_UNAUTHORIZED',
      retriable: true,
      error: 'UNAUTHORIZED',
      message: 'callback token 无效',
    })
    return { success: false, error: 'UNAUTHORIZED', message: 'callback token 无效' }
  }

  if (!ticket && !openid) {
    await finishAudit(auditId, {
      status: 'FAILED_INVALID_PARAMS',
      retriable: false,
      error: 'INVALID_PARAMS',
      message: 'ticket/openid 至少传一个',
    })
    return { success: false, error: 'INVALID_PARAMS', message: 'ticket/openid 至少传一个' }
  }

  if (!['approved', 'rejected'].includes(result)) {
    await finishAudit(auditId, {
      status: 'FAILED_INVALID_RESULT',
      retriable: false,
      error: 'INVALID_RESULT',
      message: 'result 仅支持 approved/rejected',
    })
    return { success: false, error: 'INVALID_RESULT', message: 'result 仅支持 approved/rejected' }
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
    await finishAudit(auditId, {
      status: 'FAILED_USER_NOT_FOUND',
      retriable: true,
      error: 'USER_NOT_FOUND',
      message: '未找到对应用户',
    })
    return { success: false, error: 'USER_NOT_FOUND', message: '未找到对应用户' }
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
