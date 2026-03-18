<script>
import { callCloud } from '@/utils/cloud.js'

export default {
  async onLaunch() {
    // #ifdef MP-WEIXIN
    wx.cloud.init({
      env: 'cloud1-0gvvsqcu142e90b5',
      traceUser: true,
    })

    // 静默登录
    try {
      const res = await callCloud('login', {})
      if (res && res.success) {
        getApp().globalData = getApp().globalData || {}
        getApp().globalData.openid       = res.openid || ''
        getApp().globalData.isVerified   = res.isVerified || false
        getApp().globalData.verifyStatus = res.verifyStatus || 'none'
        getApp().globalData.isLoggedIn   = true
        getApp().globalData.nickname     = res.nickname || ''
        getApp().globalData.avatarUrl    = res.avatarUrl || ''

        if (res.isNewUser && !res.nickname && !res.avatarUrl) {
          setTimeout(() => {
            uni.navigateTo({ url: '/pages/welcome/index' })
          }, 500)
        }
      }
    } catch(e) {
      console.error('静默登录失败', e)
    }

    // 静默检查位置权限
    wx.getSetting({
      success: (settingRes) => {
        if (settingRes.authSetting['scope.userFuzzyLocation']) {
          wx.getFuzzyLocation({
            type: 'gcj02',
            success: (locRes) => {
              getApp().globalData.lat = locRes.latitude
              getApp().globalData.lng = locRes.longitude
            },
            fail: () => console.log('位置获取失败')
          })
        }
      }
    })
    // #endif
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, 'PingFang SC', sans-serif;
}
</style>