<template>
  <view class="page">

    <!-- 未登录 -->
    <view v-if="!isLoggedIn" class="login-tip">
      <text class="tip-icon">👤</text>
      <text class="tip-text">登录后查看你的活动</text>
      <button class="login-btn" @tap="goLogin">去登录</button>
    </view>

    <!-- 已登录 -->
    <view v-else>

      <!-- 用户信息卡片 -->
      <view class="user-card">
        <button
          v-if="!userInfo.avatarUrl"
          class="avatar avatar-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <text class="avatar-tip">点击设置头像</text>
        </button>
        <image
          v-else
          class="avatar"
          :src="userInfo.avatarUrl"
          mode="aspectFill"
        />
        <view class="user-info">
          <text class="nickname">{{ userInfo.nickname || '搭里用户' }}</text>
          <view class="badges">
            <text v-if="userInfo.isVerified" class="badge badge--verified">✅ 已实名</text>
            <text v-else class="badge badge--pending" @tap="goVerify">
              {{ verifyBadgeText }}
            </text>
          </view>
          <view class="scheme1-row">
            <text class="scheme1-label">方案1状态：</text>
            <text class="scheme1-value" :class="userInfo.phoneVerified ? 'scheme1-value--ok' : 'scheme1-value--warn'">
              {{ userInfo.phoneVerified ? (userInfo.phoneMasked ? `已绑定手机号 ${userInfo.phoneMasked}` : '已绑定手机号') : '未绑定手机号' }}
            </text>
          </view>
          <button
            v-if="!userInfo.phoneVerified"
            class="phone-bind-btn"
            open-type="getPhoneNumber"
            @getphonenumber="onGetPhoneNumber"
          >一键绑定手机号</button>
          <view class="scheme2-row">
            <text class="scheme2-label">方案2状态：</text>
            <text class="scheme2-value" :class="scheme2StatusClass">{{ scheme2StatusText }}</text>
          </view>
          <text v-if="needsIdentityRecheck" class="scheme2-reason">{{ scheme2ReasonText }}</text>
          <button
            v-if="needsIdentityRecheck"
            class="scheme2-verify-btn"
            @tap="goVerify"
          >去补充核验</button>
        </view>
        <view class="stats">
          <view class="stat-item">
            <text class="stat-num">{{ publishCount }}</text>
            <text class="stat-label">发布</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ joinCount }}</text>
            <text class="stat-label">参与</text>
          </view>
		  <!-- 管理员入口（仅管理员可见） -->
		  <view v-if="isAdmin" class="admin-entry" @tap="goAdmin">
		    <text class="admin-text">⚙️ 管理后台</text>
		  </view>
        </view>

        <view class="credit-row">
          <view class="credit-item">
            <text class="credit-label">风控分</text>
            <text class="credit-value">{{ riskScoreText }}</text>
          </view>
          <view class="credit-item">
            <text class="credit-label">到场率</text>
            <text class="credit-value">{{ completionRateText }}</text>
          </view>
          <view class="credit-item">
            <text class="credit-label">爽约次数</text>
            <text class="credit-value">{{ userInfo.noShowCount || 0 }}</text>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tabs">
        <view
          class="tab"
          :class="{ 'tab--active': activeTab === 'published' }"
          @tap="activeTab = 'published'"
        >我发布的</view>
        <view
          class="tab"
          :class="{ 'tab--active': activeTab === 'joined' }"
          @tap="activeTab = 'joined'"
        >我参与的</view>
      </view>

      <!-- 活动列表 -->
      <view class="list">

        <!-- 加载中 -->
        <view v-if="loading" class="center-tip">
          <text class="tip-text">加载中...</text>
        </view>

        <!-- 发布的活动 -->
        <template v-else-if="activeTab === 'published'">
          <view
            v-for="item in publishedActivities"
            :key="item._id"
            class="activity-item"
            @tap="goDetail(item._id)"
          >
            <view class="item-main">
              <text class="item-title">{{ item.title }}</text>
              <text class="item-time">{{ formatTime(item.startTime) }}</text>
              <text class="item-addr">📍 {{ item.location && item.location.address }}</text>
            </view>
            <view class="item-right">
              <text class="item-count">{{ item.currentParticipants }}人</text>
              <text class="item-status" :class="'status--' + item.status">
                {{ statusText(item.status) }}
              </text>
            </view>
          </view>

          <view v-if="publishedActivities.length === 0" class="empty">
            <text class="empty-icon">📝</text>
            <text class="empty-text">还没有发布过活动</text>
            <button class="empty-btn" @tap="goPublish">去发布</button>
          </view>
        </template>

        <!-- 参与的活动 -->
        <template v-else>
          <view
            v-for="item in joinedActivities"
            :key="item._id"
            class="activity-item"
            @tap="goDetail(item._id)"
          >
            <view class="item-main">
              <text class="item-title">{{ item.title }}</text>
              <text class="item-time">{{ formatTime(item.startTime) }}</text>
              <text class="item-addr">📍 {{ item.location && item.location.address }}</text>
            </view>
            <view class="item-right">
              <text class="item-count">{{ item.currentParticipants }}人</text>
              <text class="item-status" :class="'status--' + item.status">
                {{ statusText(item.status) }}
              </text>
            </view>
          </view>

          <view v-if="joinedActivities.length === 0" class="empty">
            <text class="empty-icon">🎯</text>
            <text class="empty-text">还没有参与过活动</text>
            <button class="empty-btn" @tap="goIndex">去发现</button>
          </view>
        </template>
		<!-- 底部链接 -->
		<view class="footer-links">
		  <text class="footer-link" @tap="uni.navigateTo({ url: '/pages/agreement/index' })">用户协议</text>
		  <text class="footer-sep">·</text>
		  <text class="footer-link" @tap="uni.navigateTo({ url: '/pages/privacy/index' })">隐私政策</text>
		</view>

      </view>

    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'

export default {
  data() {
    return {
      activeTab: 'published',
      loading: false,
      publishedActivities: [],
      joinedActivities: [],
      userInfo: {
        nickname: '',
        avatarUrl: '',
        isVerified: false,
        verifyStatus: 'none',
        verifyProvider: 'manual',
        phoneVerified: false,
        mobileBindStatus: 'unbound',
        mobileBoundAt: null,
        phoneMasked: '',
        userRiskScore: 100,
        identityCheckRequired: false,
        identityCheckStatus: 'none',
        identityCheckReasons: [],
        identityCheckTriggeredAt: null,
        reliabilityScore: null,
        historicalCompletionRate: null,
        noShowCount: 0,
        attendCount: 0,
        reportAgainstCount: 0,
        recentPublish7dCount: 0,
        locationAnomalyCount: 0,
      },
      publishCount: 0,
      joinCount: 0,
      isAdmin: false,
    }
  },

  computed: {
    isLoggedIn() {
      return !!getApp().globalData?.isLoggedIn
    },
    verifyBadgeText() {
      if (this.userInfo.verifyStatus === 'pending') {
        return this.userInfo.verifyProvider === 'wechat_official' ? '⏳ 官方核验中' : '⏳ 审核中'
      }
      return '去认证 →'
    },
    riskScoreText() {
      const score = Number(this.userInfo.userRiskScore)
      if (!Number.isFinite(score)) return '--'
      return `${Math.max(0, Math.min(100, Math.round(score)))}`
    },
    completionRateText() {
      const ratio = Number(this.userInfo.historicalCompletionRate)
      if (!Number.isFinite(ratio)) return '--'
      return `${Math.round(ratio * 100)}%`
    },
    needsIdentityRecheck() {
      return !!this.userInfo.identityCheckRequired && this.userInfo.identityCheckStatus !== 'approved'
    },
    scheme2StatusClass() {
      if (this.needsIdentityRecheck) return 'scheme2-value--warn'
      return 'scheme2-value--ok'
    },
    scheme2StatusText() {
      if (!this.userInfo.identityCheckRequired) return '未触发补充核验'
      if (this.userInfo.identityCheckStatus === 'approved') return '补充核验已通过'
      if (this.userInfo.identityCheckStatus === 'pending') return '补充核验审核中'
      if (this.userInfo.identityCheckStatus === 'rejected') return '补充核验未通过'
      return '待补充核验'
    },
    scheme2ReasonText() {
      const map = {
        REPORTED_USER: '触发原因：账号被举报后需补充身份核验',
        HIGH_FREQ_ORGANIZER: '触发原因：近期高频发布触发补充核验',
      }
      const reasons = Array.isArray(this.userInfo.identityCheckReasons)
        ? this.userInfo.identityCheckReasons.map((code) => map[String(code)] || String(code)).filter(Boolean)
        : []
      return reasons.length ? reasons.join('；') : '触发原因：账号进入补充核验流程'
    },
  },

  async onShow() {
    if (!this.isLoggedIn) return
    await this.loadAdminStatus()
    this.loadUserInfo()
    await this.loadActivities()
  },

  methods: {
    async loadAdminStatus() {
      try {
        const res = await callCloud('checkAdmin')
        this.isAdmin = !!(res && res.success && res.isAdmin)
      } catch (e) {
        this.isAdmin = false
      }
    },

    // 加载用户信息
    async loadUserInfo() {
      try {
        // #ifdef MP-WEIXIN
        const db = wx.cloud.database()
        const openid = getApp().globalData?.openid
        if (!openid) return

        const { data } = await db.collection('users')
          .where({ _openid: openid })
          .get()

        if (data.length > 0) {
          const user = data[0]
          this.userInfo = {
            nickname:     user.nickname || '',
            avatarUrl:    user.avatarUrl || '',
            isVerified:   user.isVerified || false,
            verifyStatus: user.verifyStatus || 'none',
            verifyProvider: user.verifyProvider || 'manual',
            phoneVerified: !!user.phoneVerified,
            mobileBindStatus: user.mobileBindStatus || (user.phoneVerified ? 'bound' : 'unbound'),
            mobileBoundAt: user.mobileBoundAt || null,
            phoneMasked: this.maskPhone(user.phone),
            userRiskScore: this.calcUserRiskScore(user),
            identityCheckRequired: !!user.identityCheckRequired,
            identityCheckStatus: user.identityCheckStatus || 'none',
            identityCheckReasons: Array.isArray(user.identityCheckReasons) ? user.identityCheckReasons : [],
            identityCheckTriggeredAt: user.identityCheckTriggeredAt || null,
            reliabilityScore: user.reliabilityScore ?? null,
            historicalCompletionRate: user.historicalCompletionRate ?? null,
            noShowCount: Number(user.noShowCount || 0),
            attendCount: Number(user.attendCount || 0),
            reportAgainstCount: Number(user.reportAgainstCount || 0),
            recentPublish7dCount: Number(user.recentPublish7dCount || 0),
            locationAnomalyCount: Number(user.locationAnomalyCount || 0),
          }
          this.publishCount = user.publishCount || 0
          this.joinCount    = user.joinCount    || 0

          // 同步 globalData
          getApp().globalData.isVerified   = user.isVerified || false
          getApp().globalData.verifyStatus = user.verifyStatus || 'none'
          getApp().globalData.verifyProvider = user.verifyProvider || 'manual'
          getApp().globalData.phoneVerified = !!user.phoneVerified
          getApp().globalData.mobileBindStatus = user.mobileBindStatus || (user.phoneVerified ? 'bound' : 'unbound')
          getApp().globalData.mobileBoundAt = user.mobileBoundAt || null
          getApp().globalData.userRiskScore = this.calcUserRiskScore(user)
          getApp().globalData.identityCheckRequired = !!user.identityCheckRequired
          getApp().globalData.identityCheckStatus = user.identityCheckStatus || 'none'
          getApp().globalData.identityCheckReasons = Array.isArray(user.identityCheckReasons) ? user.identityCheckReasons : []
          getApp().globalData.identityCheckTriggeredAt = user.identityCheckTriggeredAt || null
        }
        // #endif
      } catch(e) {
        console.error('加载用户信息失败', e)
      }
	  
    },
    async onChooseAvatar(e) {
	  const avatarUrl = e.detail.avatarUrl
	  uni.showModal({
	    title: '设置昵称',
	    editable: true,
	    placeholderText: '请输入你的昵称',
	    success: async (res) => {
	      if (res.confirm) {
            const nickname = res.content || '搭里用户'
	        try {
	          await callCloud('login', { nickname, avatarUrl })
	          this.userInfo.avatarUrl = avatarUrl
	          this.userInfo.nickname = nickname
	          uni.showToast({ title: '设置成功', icon: 'success' })
	        } catch(e) {
	          uni.showToast({ title: '设置失败，请重试', icon: 'none' })
	        }
	      }
	    }
      })
    },

    maskPhone(raw = '') {
      const text = String(raw || '').trim()
      if (!text) return ''
      if (/^1[3-9]\d{9}$/.test(text)) return `${text.slice(0, 3)}****${text.slice(-4)}`
      return ''
    },

    calcUserRiskScore(user = {}) {
      const noShowCount = Number(user.noShowCount || 0)
      const reportAgainstCount = Number(user.reportAgainstCount || 0)
      const recentPublish7dCount = Number(user.recentPublish7dCount || 0)
      const locationAnomalyCount = Number(user.locationAnomalyCount || 0)
      const overloadPublishPenalty = Math.max(0, recentPublish7dCount - 5) * 3
      const score = 100
        - noShowCount * 12
        - reportAgainstCount * 8
        - locationAnomalyCount * 5
        - overloadPublishPenalty
      return Math.max(0, Math.min(100, Math.round(score)))
    },

    async onGetPhoneNumber(e) {
      const code = e?.detail?.code || ''
      if (!code) {
        uni.showToast({ title: '未获取到手机号凭证', icon: 'none' })
        return
      }
      try {
        const res = await callCloud('bindPhoneNumber', { code })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '绑定失败，请重试', icon: 'none' })
          return
        }
        this.userInfo.phoneVerified = true
        this.userInfo.mobileBindStatus = 'bound'
        this.userInfo.phoneMasked = res.phoneMasked || ''
        getApp().globalData.phoneVerified = true
        getApp().globalData.mobileBindStatus = 'bound'
        uni.showToast({ title: '手机号绑定成功', icon: 'success' })
        await this.loadUserInfo()
      } catch (err) {
        console.error('绑定手机号失败', err)
        uni.showToast({ title: '绑定失败，请稍后重试', icon: 'none' })
      }
    },

	goAdmin() {
	  uni.navigateTo({ url: '/pages/admin/index' })
	},

    // 加载活动列表
    async loadActivities() {
      this.loading = true
      try {
        // #ifdef MP-WEIXIN
        const db = wx.cloud.database()
        const openid = getApp().globalData?.openid
        if (!openid) return

        // 我发布的
        const { data: published } = await db.collection('activities')
          .where({ publisherId: openid })
          .orderBy('createdAt', 'desc')
          .limit(20)
          .get()
        this.publishedActivities = published

        // 我参与的：先查 participations，再查对应活动
        const { data: parts } = await db.collection('participations')
          .where({ status: 'joined', userId: openid })
          .orderBy('joinedAt', 'desc')
          .limit(20)
          .get()

        if (parts.length > 0) {
          const activityIds = parts.map(p => p.activityId)
          // 云数据库一次最多查20条，用 or 拼接
          const _ = db.command
          const orConditions = activityIds.map(id => ({ _id: id }))
          const { data: joined } = await db.collection('activities')
            .where(_.or(orConditions))
            .get()
          this.joinedActivities = joined
        } else {
          this.joinedActivities = []
        }
        // #endif
      } catch(e) {
        console.error('加载活动列表失败', e)
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    statusText(status) {
      const map = {
        OPEN:      '招募中',
        FULL:      '已满员',
        ENDED:     '已结束',
        CANCELLED: '已取消',
      }
      return map[status] || status
    },

    formatTime(t) {
      if (!t) return ''
      const d = new Date(t)
      const mo  = d.getMonth() + 1
      const day = d.getDate()
      const h   = d.getHours().toString().padStart(2, '0')
      const m   = d.getMinutes().toString().padStart(2, '0')
      return `${mo}/${day} ${h}:${m}`
    },

    goDetail(id) {
      uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
    },
    goPublish() {
      uni.switchTab({ url: '/pages/publish/index' })
    },
    goIndex() {
      uni.switchTab({ url: '/pages/index/index' })
    },
    goVerify() {
      uni.navigateTo({ url: '/pages/verify/index' })
    },
    goLogin() {
      uni.switchTab({ url: '/pages/index/index' })
    },
  }
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; }

/* 未登录 */
.login-tip {
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 24rpx;
}
.tip-icon { font-size: 80rpx; }
.tip-text { font-size: 28rpx; color: #999; }
.login-btn {
  margin-top: 16rpx;
  background: #1A3C5E; color: white;
  border-radius: 16rpx; font-size: 28rpx;
  padding: 16rpx 60rpx; border: none;
}

/* 用户卡片 */
.user-card {
  background: #1A3C5E;
  padding: 48rpx 32rpx 40rpx;
  display: flex; align-items: center; gap: 24rpx;
  flex-wrap: wrap;
}
.avatar {
  width: 120rpx; height: 120rpx;
  border-radius: 50%; background: rgba(255,255,255,0.2);
  flex-shrink: 0;
}
.user-info { flex: 1; }
.nickname { font-size: 32rpx; font-weight: bold; color: white; display: block; margin-bottom: 12rpx; }
.badges { display: flex; gap: 12rpx; }
.badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge--verified { background: rgba(255,255,255,0.2); color: white; }
.badge--pending  { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }
.scheme1-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.scheme1-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.75);
}
.scheme1-value {
  font-size: 22rpx;
  color: rgba(255,255,255,0.95);
}
.scheme1-value--ok { color: #d1fadf; }
.scheme1-value--warn { color: #fde68a; }
.phone-bind-btn {
  margin-top: 12rpx;
  width: 240rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #1A3C5E;
  font-size: 22rpx;
  border: none;
}
.phone-bind-btn::after { border: none; }
.scheme2-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.scheme2-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.75);
}
.scheme2-value {
  font-size: 22rpx;
  color: rgba(255,255,255,0.95);
}
.scheme2-value--ok { color: #d1fadf; }
.scheme2-value--warn { color: #fecaca; }
.scheme2-reason {
  margin-top: 8rpx;
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: rgba(255,255,255,0.9);
}
.scheme2-verify-btn {
  margin-top: 12rpx;
  width: 240rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  background: #fde68a;
  color: #5b3d00;
  font-size: 22rpx;
  border: none;
}
.scheme2-verify-btn::after { border: none; }

.stats { display: flex; gap: 32rpx; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.stat-num   { font-size: 36rpx; font-weight: bold; color: white; }
.stat-label { font-size: 22rpx; color: rgba(255,255,255,0.7); }

/* Tab */
.tabs {
  display: flex;
  background: white;
  border-bottom: 1rpx solid #f0f0f0;
}
.tab {
  flex: 1; text-align: center;
  padding: 28rpx 0;
  font-size: 28rpx; color: #888;
}
.tab--active {
  color: #1A3C5E; font-weight: bold;
  border-bottom: 4rpx solid #1A3C5E;
}

/* 列表 */
.list { padding: 16rpx; }

.activity-item {
  background: white; border-radius: 12rpx;
  padding: 28rpx 32rpx; margin-bottom: 16rpx;
  display: flex; align-items: center; gap: 20rpx;
}
.item-main { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.item-title { font-size: 30rpx; font-weight: bold; color: #1a1a1a; }
.item-time  { font-size: 24rpx; color: #888; }
.item-addr  { font-size: 24rpx; color: #888; }

.item-right {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 8rpx; flex-shrink: 0;
}
.item-count { font-size: 24rpx; color: #888; }
.item-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.status--OPEN      { background: #EEF7EE; color: #1E7145; }
.status--FULL      { background: #EEF4FB; color: #1A3C5E; }
.status--ENDED     { background: #f5f5f5; color: #999; }
.status--CANCELLED { background: #FFF0F0; color: #C00000; }

/* 空状态 */
.center-tip, .empty {
  display: flex; flex-direction: column;
  align-items: center; padding: 100rpx 40rpx; gap: 20rpx;
}
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.empty-btn {
  margin-top: 8rpx;
  background: #1A3C5E; color: white;
  border-radius: 16rpx; font-size: 28rpx;
  padding: 16rpx 60rpx; border: none;
}
.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 32rpx;
  gap: 16rpx;
}
.footer-link { font-size: 24rpx; color: #999; }
.footer-sep  { font-size: 24rpx; color: #ccc; }
.avatar-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.avatar-tip {
  font-size: 20rpx;
  color: rgba(255,255,255,0.8);
  text-align: center;
  line-height: 1.3;
}
.admin-entry {
  margin-top: 20rpx;
  padding: 16rpx 24rpx;
  background: rgba(255,255,255,0.15);
  border-radius: 12rpx;
  display: inline-block;
}
.admin-text { font-size: 26rpx; color: rgba(255,255,255,0.9); }

.credit-row {
  width: 100%;
  display: flex;
  gap: 16rpx;
  margin-top: 10rpx;
}
.credit-item {
  flex: 1;
  background: rgba(255,255,255,0.12);
  border-radius: 12rpx;
  padding: 14rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.credit-label {
  font-size: 20rpx;
  color: rgba(255,255,255,0.75);
}
.credit-value {
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
</style>
