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
    userRiskScore: 100,
    officialVerifyStatus: 'not_started',
    isLoggedIn: false,
  }),

  actions: {
    // 登录并同步云端用户信息
    async login(userInfo) {
      try {
        const res = await callCloud('login', {
          nickname: userInfo.nickname || '',
          avatarUrl: userInfo.avatarUrl || '',
        })
        this.openid = res.openid || ''
        this.isVerified = res.isVerified || false
        this.verifyStatus = res.verifyStatus || 'none'
        this.verifyProvider = res.verifyProvider || 'manual'
        this.phoneVerified = !!res.phoneVerified
        this.mobileBindStatus = res.mobileBindStatus || (res.phoneVerified ? 'bound' : 'unbound')
        this.mobileBoundAt = res.mobileBoundAt || null
        this.userRiskScore = Number.isFinite(Number(res.userRiskScore)) ? Number(res.userRiskScore) : 100
        this.officialVerifyStatus = res.officialVerifyStatus || 'not_started'
        this.nickname = userInfo.nickname || ''
        this.avatarUrl = userInfo.avatarUrl || ''
        this.isLoggedIn = true
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
      this.userRiskScore = 100
      this.officialVerifyStatus = 'not_started'
      this.isLoggedIn = false
    }
  }
})
