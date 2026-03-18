const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

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
