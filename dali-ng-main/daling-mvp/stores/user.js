// stores/user.js
import { defineStore } from 'pinia'
import { callCloud } from '@/utils/cloud.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    openid: '',
    nickname: '',
    avatarUrl: '',
    isVerified: false,
    verifyStatus: 'none',
    verifyProvider: 'manual',
    phoneVerified: false,
    mobileBindStatus: 'unbound',
    mobileBoundAt: null,
    socialPreference: 'unknown',
    residencyType: 'unknown',
    identityTags: [],
    userRiskScore: 100,
    identityCheckRequired: false,
    identityCheckStatus: 'none',
    identityCheckReasons: [],
    identityCheckTriggeredAt: null,
    lastSessionSyncAt: 0,
    isLoggedIn: false,
  }),

  actions: {
    applyLoginSnapshot(res = {}, fallbackProfile = {}) {
      this.openid = res.openid || this.openid || ''
      this.isVerified = !!res.isVerified
      this.verifyStatus = res.verifyStatus || 'none'
      this.verifyProvider = res.verifyProvider || 'manual'
      this.phoneVerified = !!res.phoneVerified
      this.mobileBindStatus = res.mobileBindStatus || (res.phoneVerified ? 'bound' : 'unbound')
      this.mobileBoundAt = res.mobileBoundAt || null
      this.socialPreference = res.socialPreference || 'unknown'
      this.residencyType = res.residencyType || 'unknown'
      this.identityTags = Array.isArray(res.identityTags) ? res.identityTags : []
      this.userRiskScore = Number.isFinite(Number(res.userRiskScore)) ? Number(res.userRiskScore) : 100
      this.identityCheckRequired = !!res.identityCheckRequired
      this.identityCheckStatus = res.identityCheckStatus || 'none'
      this.identityCheckReasons = Array.isArray(res.identityCheckReasons) ? res.identityCheckReasons : []
      this.identityCheckTriggeredAt = res.identityCheckTriggeredAt || null
      this.nickname = fallbackProfile.nickname || res.nickname || this.nickname || ''
      this.avatarUrl = fallbackProfile.avatarUrl || res.avatarUrl || this.avatarUrl || ''
      this.isLoggedIn = true
      this.syncGlobalFromStore()
      return res
    },

    syncGlobalFromStore() {
      getApp().globalData = getApp().globalData || {}
      const gd = getApp().globalData
      gd.openid = this.openid || ''
      gd.isVerified = !!this.isVerified
      gd.verifyStatus = this.verifyStatus || 'none'
      gd.verifyProvider = this.verifyProvider || 'manual'
      gd.phoneVerified = !!this.phoneVerified
      gd.mobileBindStatus = this.mobileBindStatus || (this.phoneVerified ? 'bound' : 'unbound')
      gd.mobileBoundAt = this.mobileBoundAt || null
      gd.socialPreference = this.socialPreference || 'unknown'
      gd.residencyType = this.residencyType || 'unknown'
      gd.identityTags = Array.isArray(this.identityTags) ? this.identityTags : []
      gd.userRiskScore = Number.isFinite(Number(this.userRiskScore)) ? Number(this.userRiskScore) : 100
      gd.identityCheckRequired = !!this.identityCheckRequired
      gd.identityCheckStatus = this.identityCheckStatus || 'none'
      gd.identityCheckReasons = Array.isArray(this.identityCheckReasons) ? this.identityCheckReasons : []
      gd.identityCheckTriggeredAt = this.identityCheckTriggeredAt || null
      gd.nickname = this.nickname || ''
      gd.avatarUrl = this.avatarUrl || ''
      gd.isLoggedIn = true
    },

    async syncSession(options = {}) {
      const force = !!options.force
      const minIntervalMs = Number(options.minIntervalMs || 15000)
      const now = Date.now()
      if (!force && this.lastSessionSyncAt > 0 && now - this.lastSessionSyncAt < minIntervalMs) {
        return { success: true, skipped: true }
      }
      const res = await callCloud('login', {})
      if (res && res.success) {
        this.applyLoginSnapshot(res)
        this.lastSessionSyncAt = now
      }
      return res
    },

    // 登录并同步云端用户信息
    async login(userInfo = {}) {
      try {
        const res = await callCloud('login', {
          nickname: userInfo.nickname || '',
          avatarUrl: userInfo.avatarUrl || '',
        })
        this.applyLoginSnapshot(res, {
          nickname: userInfo.nickname || '',
          avatarUrl: userInfo.avatarUrl || '',
        })
        this.lastSessionSyncAt = Date.now()
        return res
      } catch (e) {
        console.error('登录失败', e)
        throw e
      }
    },

    logout() {
      this.openid = ''
      this.nickname = ''
      this.avatarUrl = ''
      this.isVerified = false
      this.verifyStatus = 'none'
      this.verifyProvider = 'manual'
      this.phoneVerified = false
      this.mobileBindStatus = 'unbound'
      this.mobileBoundAt = null
      this.socialPreference = 'unknown'
      this.residencyType = 'unknown'
      this.identityTags = []
      this.userRiskScore = 100
      this.identityCheckRequired = false
      this.identityCheckStatus = 'none'
      this.identityCheckReasons = []
      this.identityCheckTriggeredAt = null
      this.lastSessionSyncAt = 0
      this.isLoggedIn = false
    }
  }
})
