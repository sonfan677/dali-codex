const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function toChinaDateKey(input = Date.now()) {
  const ms = new Date(input).getTime()
  const chinaMs = ms + 8 * 60 * 60 * 1000
  const d = new Date(chinaMs)
  const y = d.getUTCFullYear()
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${d.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const cityId = event?.cityId || 'dali'
  const todayKey = toChinaDateKey()

  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (users.length === 0) {
    const nickname = event.nickname || ''
    const avatarUrl = event.avatarUrl || ''
    // 新用户：创建记录
    await db.collection('users').add({
      data: {
        _openid: OPENID,
        nickname,
        avatarUrl,
        isVerified: false,
        verifyStatus: 'none',
        subscribeNearbyActivity: false,
        publishCount: 0,
        joinCount: 0,
        cityId,
        registeredDateKey: todayKey,
        loginDateKeyLatest: todayKey,
        loginDateKeys: [todayKey],
        lastLoginAt: db.serverDate(),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
    return {
      success: true,
      isNewUser: true,
      isVerified: false,
      verifyStatus: 'none',
      openid: OPENID,
      nickname,
      avatarUrl,
    }
  }

  // 老用户：如果传入了昵称或头像则更新
  if (event.nickname || event.avatarUrl) {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: {
        nickname: event.nickname || users[0].nickname,
        avatarUrl: event.avatarUrl || users[0].avatarUrl,
        cityId: users[0].cityId || cityId,
        loginDateKeyLatest: todayKey,
        loginDateKeys: _.addToSet(todayKey),
        lastLoginAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
  } else {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: {
        cityId: users[0].cityId || cityId,
        loginDateKeyLatest: todayKey,
        loginDateKeys: _.addToSet(todayKey),
        lastLoginAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
  }

  const nickname = event.nickname || users[0].nickname || ''
  const avatarUrl = event.avatarUrl || users[0].avatarUrl || ''

  return {
    success: true,
    isNewUser: false,
    isVerified: users[0].isVerified,
    verifyStatus: users[0].verifyStatus,
    openid: OPENID,
    nickname,
    avatarUrl,
  }
}
