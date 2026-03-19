// stores/location.js
import { defineStore } from 'pinia'

function getSettingAsync() {
  return new Promise((resolve, reject) => {
    wx.getSetting({ success: resolve, fail: reject })
  })
}

function getPrivacySettingAsync() {
  return new Promise((resolve) => {
    if (typeof wx.getPrivacySetting !== 'function') {
      resolve(null)
      return
    }
    wx.getPrivacySetting({
      success: resolve,
      fail: () => resolve(null),
    })
  })
}

function requirePrivacyAuthorizeAsync() {
  return new Promise((resolve) => {
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve(true)
      return
    }
    wx.requirePrivacyAuthorize({
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}

function authorizeFuzzyAsync() {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.userFuzzyLocation',
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}

function getFuzzyLocationAsync() {
  return new Promise((resolve, reject) => {
    wx.getFuzzyLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject,
    })
  })
}

export const useLocationStore = defineStore('location', {
  state: () => ({
    lat: null,
    lng: null,
    updatedAt: 0,
    hasPermission: null, // null=未知 true=已授权 false=拒绝
  }),

  actions: {
    async refreshLocation(options = {}) {
      const { interactive = false } = options
      const now = Date.now()

      // #ifndef MP-WEIXIN
      this.hasPermission = false
      return false
      // #endif

      // #ifdef MP-WEIXIN
      // 优先读 globalData 里启动时已获取的位置
      const gd = getApp().globalData || {}
      if (gd.lat && gd.lng && !this.lat) {
        this.lat = gd.lat
        this.lng = gd.lng
        this.updatedAt = now
        this.hasPermission = true
        return true
      }
      // 3分钟内有缓存就不重新获取
      if (this.lat && this.lng && now - this.updatedAt < 3 * 60 * 1000) {
        return true
      }

      try {
        const privacyRes = await getPrivacySettingAsync()
        if (privacyRes && privacyRes.needAuthorization) {
          if (!interactive) {
            this.hasPermission = false
            return false
          }
          const privacyOk = await requirePrivacyAuthorizeAsync()
          if (!privacyOk) {
            this.hasPermission = false
            return false
          }
        }

        const setting = await getSettingAsync().catch(() => null)
        const hasScope = !!setting?.authSetting?.['scope.userFuzzyLocation']

        if (!hasScope) {
          // 静默刷新时不打扰用户，只标记权限状态
          if (!interactive) {
            this.hasPermission = false
            return false
          }
          const authOk = await authorizeFuzzyAsync()
          if (!authOk) {
            this.hasPermission = false
            return false
          }
        }

        const locRes = await getFuzzyLocationAsync()
        this.lat = locRes.latitude
        this.lng = locRes.longitude
        this.updatedAt = now
        this.hasPermission = true
        gd.lat = locRes.latitude
        gd.lng = locRes.longitude
        gd.locationUpdatedAt = now
        return true
      } catch (e) {
        this.hasPermission = false
        return false
      }
      // #endif
    }
  }
})
