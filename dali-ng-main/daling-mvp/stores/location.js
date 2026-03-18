// stores/location.js
import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    lat: null,
    lng: null,
    updatedAt: 0,
    hasPermission: null, // null=未知 true=已授权 false=拒绝
  }),

  actions: {
    async refreshLocation() {
      const now = Date.now()
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
      return new Promise((resolve) => {
        uni.getFuzzyLocation({
          type: 'gcj02',
          success: (res) => {
            this.lat = res.latitude
            this.lng = res.longitude
            this.updatedAt = now
            this.hasPermission = true
            resolve(true)
          },
          fail: () => {
            this.hasPermission = false
            resolve(false)
          }
        })
      })
    }
  }
})