<script>
import { callCloud } from '@/utils/cloud.js'

export default {
  async onLaunch() {
    // #ifdef MP-WEIXIN
    wx.cloud.init({
      // 使用当前小程序绑定的云环境，避免写死到某个环境
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
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
        getApp().globalData.verifyProvider = res.verifyProvider || 'manual'
        getApp().globalData.phoneVerified = !!res.phoneVerified
        getApp().globalData.mobileBindStatus = res.mobileBindStatus || (res.phoneVerified ? 'bound' : 'unbound')
        getApp().globalData.mobileBoundAt = res.mobileBoundAt || null
        getApp().globalData.userRiskScore = Number.isFinite(Number(res.userRiskScore)) ? Number(res.userRiskScore) : 100
        getApp().globalData.identityCheckRequired = !!res.identityCheckRequired
        getApp().globalData.identityCheckStatus = res.identityCheckStatus || 'none'
        getApp().globalData.identityCheckReasons = Array.isArray(res.identityCheckReasons) ? res.identityCheckReasons : []
        getApp().globalData.identityCheckTriggeredAt = res.identityCheckTriggeredAt || null
        getApp().globalData.officialVerifyStatus = res.officialVerifyStatus || 'not_started'
        getApp().globalData.officialVerifyTicket = res.officialVerifyTicket || null
        getApp().globalData.officialVerifiedAt = res.officialVerifiedAt || null
        getApp().globalData.isLoggedIn   = true
        getApp().globalData.nickname     = res.nickname || ''
        getApp().globalData.avatarUrl    = res.avatarUrl || ''
        getApp().globalData.subscriptions = res.subscriptions || {}
        getApp().globalData.shouldPromptNearbySubscription = !!res.shouldPromptNearbySubscription

        if (res.isNewUser && !res.nickname && !res.avatarUrl) {
          setTimeout(() => {
            uni.navigateTo({ url: '/pages/welcome/index' })
          }, 500)
        }
      }
    } catch(e) {
      console.error('静默登录失败', e)
    }

    // 启动阶段不主动触发定位采集，避免在隐私/权限未完成时触发系统报错。
    // 位置获取统一交由页面内用户可感知的授权流程处理。
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
