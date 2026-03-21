// stores/location.js
import { defineStore } from 'pinia'

// 接口审核开关：在 getFuzzyLocation 审核通过前保持 false，避免真机报 -80424
// 审核通过后改为 true 即可恢复真实附近定位能力
const ENABLE_FUZZY_LOCATION = true

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

function getFuzzyLocationAsync() {
  return new Promise((resolve, reject) => {
    wx.getFuzzyLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject,
    })
  })
}

function isFuzzyUnauthorized(err) {
  const msg = String(err?.errMsg || '')
  const code = Number(err?.errCode || 0)
  return code === -80424 || msg.includes('getFuzzyLocation') || msg.includes('not authorized')
}

function isLocationAuthDenied(err) {
  const msg = String(err?.errMsg || '').toLowerCase()
  return msg.includes('auth deny') || msg.includes('auth denied') || msg.includes('permission')
}

export const useLocationStore = defineStore('location', {
  state: () => ({
    lat: null,
    lng: null,
    updatedAt: 0,
    hasPermission: null, // null=未知 true=已授权 false=拒绝
    lastErrorCode: '',
  }),

  actions: {
    async refreshLocation(options = {}) {
      const { interactive = false, force = false } = options
      const now = Date.now()

      // #ifndef MP-WEIXIN
      this.hasPermission = false
      return false
      // #endif

      // #ifdef MP-WEIXIN
      // 优先读 globalData 里启动时已获取的位置
      const gd = getApp().globalData || {}
      if (!force && gd.lat && gd.lng && !this.lat) {
        this.lat = gd.lat
        this.lng = gd.lng
        this.updatedAt = now
        this.hasPermission = true
        this.lastErrorCode = ''
        return true
      }
      // 3分钟内有缓存就不重新获取
      if (!force && this.lat && this.lng && now - this.updatedAt < 3 * 60 * 1000) {
        this.lastErrorCode = ''
        return true
      }

      // 静默刷新：已授权则自动取定位；未授权则保持未知状态（显示底部引导，不显示顶部报错条）
      if (!interactive) {
        try {
          const privacyRes = await getPrivacySettingAsync()
          if (privacyRes && privacyRes.needAuthorization) {
            this.hasPermission = null
            this.lastErrorCode = ''
            return false
          }

          const setting = await getSettingAsync().catch(() => null)
          const hasFuzzyScope = !!setting?.authSetting?.['scope.userFuzzyLocation']
          if (!hasFuzzyScope) {
            this.hasPermission = null
            this.lastErrorCode = ''
            return false
          }

          if (!ENABLE_FUZZY_LOCATION) {
            this.hasPermission = false
            this.lastErrorCode = 'FUZZY_API_PENDING'
            return false
          }

          const locRes = await getFuzzyLocationAsync()
          this.lat = locRes.latitude
          this.lng = locRes.longitude
          this.updatedAt = now
          this.hasPermission = true
          this.lastErrorCode = ''
          gd.lat = locRes.latitude
          gd.lng = locRes.longitude
          gd.locationUpdatedAt = now
          return true
        } catch (err) {
          if (isLocationAuthDenied(err)) {
            this.hasPermission = false
            this.lastErrorCode = 'LOCATION_DENIED'
            return false
          }
          if (isFuzzyUnauthorized(err)) {
            this.hasPermission = false
            this.lastErrorCode = 'FUZZY_API_PENDING'
            return false
          }
          this.hasPermission = null
          this.lastErrorCode = 'LOCATION_FAILED'
          return false
        }
      }

      // 交互刷新：用户主动点击授权
      if (!ENABLE_FUZZY_LOCATION) {
        this.hasPermission = false
        this.lastErrorCode = 'FUZZY_API_PENDING'
        return false
      }

      try {
        const privacyRes = await getPrivacySettingAsync()
        // 交互模式下，隐私状态未知或未同意时，先走 requirePrivacyAuthorize
        if (!privacyRes || privacyRes.needAuthorization) {
          const privacyOk = await requirePrivacyAuthorizeAsync()
          if (!privacyOk) {
            this.hasPermission = false
            this.lastErrorCode = 'PRIVACY_DENIED'
            return false
          }
        }

        await getSettingAsync().catch(() => null)

        try {
          const locRes = await getFuzzyLocationAsync()
          this.lat = locRes.latitude
          this.lng = locRes.longitude
          this.updatedAt = now
          this.hasPermission = true
          this.lastErrorCode = ''
          gd.lat = locRes.latitude
          gd.lng = locRes.longitude
          gd.locationUpdatedAt = now
          return true
        } catch (fuzzyErr) {
          // 模糊定位接口未授权（-80424）时，提示接口审核中
          if (isFuzzyUnauthorized(fuzzyErr)) {
            this.hasPermission = false
            this.lastErrorCode = 'FUZZY_API_PENDING'
            return false
          }
          if (isLocationAuthDenied(fuzzyErr)) {
            this.hasPermission = false
            this.lastErrorCode = 'LOCATION_DENIED'
            return false
          }
          this.hasPermission = false
          this.lastErrorCode = 'LOCATION_FAILED'
          return false
        }
      } catch (e) {
        this.hasPermission = false
        this.lastErrorCode = 'LOCATION_FAILED'
        return false
      }
      // #endif
    }
  }
})
