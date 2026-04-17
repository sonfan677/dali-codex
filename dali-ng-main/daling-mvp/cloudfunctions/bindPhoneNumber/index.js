const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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

function maskPhone(phone = '') {
  const p = String(phone || '')
  if (p.length < 7) return p ? '***' : ''
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const code = String(event.code || '').trim()
  if (!code) {
    return { success: false, error: 'CODE_REQUIRED', message: '缺少手机号凭证' }
  }

  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .limit(1)
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '请先登录后再绑定手机号' }
  }

  let phoneInfo = null
  try {
    const resp = await cloud.openapi.phonenumber.getPhoneNumber({ code })
    phoneInfo = resp?.phoneInfo || null
  } catch (e) {
    console.error('获取手机号失败', e)
    return { success: false, error: 'PHONE_API_FAILED', message: '获取手机号失败，请重试' }
  }

  const phoneNumber = String(phoneInfo?.phoneNumber || phoneInfo?.purePhoneNumber || '').trim()
  if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
    return { success: false, error: 'INVALID_PHONE', message: '手机号格式不正确' }
  }

  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      phone: encryptSensitive(phoneNumber),
      phoneSensitiveVersion: 'aes-256-gcm-v1',
      phoneVerified: true,
      mobileBindStatus: 'bound',
      mobileBoundAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  return {
    success: true,
    phoneMasked: maskPhone(phoneNumber),
    mobileBindStatus: 'bound',
    phoneVerified: true,
  }
}
