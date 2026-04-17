const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ID_CARD_WEIGHT = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CARD_CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
const ID_CARD_REGION_PREFIX = new Set([
  '11', '12', '13', '14', '15',
  '21', '22', '23',
  '31', '32', '33', '34', '35', '36', '37',
  '41', '42', '43', '44', '45', '46',
  '50', '51', '52', '53', '54',
  '61', '62', '63', '64', '65',
  '71', '81', '82', '91',
])

const SENSITIVE_CIPHER_PREFIX = 'enc:v1'

function getSensitiveCipherKey() {
  const raw = String(
    process.env.SENSITIVE_DATA_KEY
    || process.env.ADMIN_TOKEN
    || 'dali_sensitive_fallback_v1_change_me'
  ).trim()
  return crypto.createHash('sha256').update(raw).digest()
}

function encryptSensitive(str) {
  const safe = String(str || '')
  if (!safe) return ''
  const key = getSensitiveCipherKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(safe, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    SENSITIVE_CIPHER_PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

function isValidBirthDate(yyyymmdd = '') {
  if (!/^\d{8}$/.test(yyyymmdd)) return false
  const year = Number(yyyymmdd.slice(0, 4))
  const month = Number(yyyymmdd.slice(4, 6))
  const day = Number(yyyymmdd.slice(6, 8))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false
  if (year < 1900 || year > 2099) return false
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year
    || date.getMonth() + 1 !== month
    || date.getDate() !== day
  ) return false
  return date.getTime() <= Date.now()
}

function validateChineseIdCard(raw = '') {
  const idCard = String(raw || '').trim().toUpperCase()
  if (!idCard) {
    return { ok: false, message: '请填写身份证号' }
  }
  if (!/^\d{17}[\dX]$/.test(idCard)) {
    return { ok: false, message: '身份证号需为18位（最后一位可为X）' }
  }
  if (!ID_CARD_REGION_PREFIX.has(idCard.slice(0, 2))) {
    return { ok: false, message: '身份证号地区码不合法' }
  }
  if (!isValidBirthDate(idCard.slice(6, 14))) {
    return { ok: false, message: '身份证号出生日期不合法' }
  }
  const sum = ID_CARD_WEIGHT.reduce((acc, weight, idx) => {
    return acc + weight * Number(idCard[idx])
  }, 0)
  const checkCode = ID_CARD_CHECK_CODES[sum % 11]
  if (checkCode !== idCard[17]) {
    return { ok: false, message: '身份证号校验位不正确，请检查后重试' }
  }
  return { ok: true, normalized: idCard }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { realName, idCard } = event
  const provider = 'manual'

  // 基础校验
  if (!realName || realName.trim().length < 2) {
    return { success: false, error: 'INVALID_NAME', message: '请填写真实姓名' }
  }
  const idCardValidation = validateChineseIdCard(idCard)
  if (!idCardValidation.ok) {
    return { success: false, error: 'INVALID_ID_CARD', message: idCardValidation.message || '请填写正确的身份证号' }
  }

  // 检查是否已提交过
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '请先登录' }
  }

  if (users[0].verifyStatus === 'approved') {
    return { success: false, error: 'ALREADY_VERIFIED', message: '你已经完成身份核验' }
  }

  // 加密存储
  const cityId = users[0].cityId || 'dali'
  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      realName: encryptSensitive(realName.trim()),
      idCard: encryptSensitive(idCardValidation.normalized),
      sensitiveCipherVersion: 'aes-256-gcm-v1',
      verifyStatus: 'pending',
      verifyProvider: provider,
      identityCheckRequired: true,
      identityCheckStatus: 'pending',
      verifySubmittedAt: db.serverDate(),
      verifyAutoApproved: false,
      verifyAutoApprovedAt: null,
      verifyAutoPendingReview: false,
      verifyAutoWindowMinutes: null,
      verifyFinalDecisionSource: 'manual_submit',
      verifyReviewedAt: null,
      updatedAt: db.serverDate(),
    }
  })

  // 写入管理员待办（adminActions集合）
  // 先确认 adminActions 集合存在，不存在会自动报错
  try {
    await db.collection('adminActions').add({
      data: {
        actionId: `verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        adminId: 'system',
        adminOpenid: 'system',
        adminRole: 'system',
        targetId: OPENID,
        targetType: 'user',
        action: 'verify_request',
        actionType: 'verify_request',
        reason: `用户申请身份核验：${realName.trim().slice(0,1)}**`,
        cityId,
        expiresAt: null,
        rollbackAt: null,
        rollbackResult: null,
        outcomeVerified: null,
        outcomeNote: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
  } catch(e) {
    // adminActions 集合不存在时不影响主流程
    console.error('写入adminActions失败', e)
  }

  return { success: true, verifyProvider: provider }
}
