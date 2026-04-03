const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function encrypt(str) {
  return Buffer.from(String(str || '')).toString('base64')
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
      phone: encrypt(phoneNumber),
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
