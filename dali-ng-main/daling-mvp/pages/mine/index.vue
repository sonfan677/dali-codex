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
        <image
          class="avatar"
          :src="userInfo.avatarUrl || '/static/default-avatar.png'"
          mode="aspectFill"
        />
        <view class="user-info">
          <text class="nickname">{{ userInfo.nickname || '搭里用户' }}</text>
          <view class="badges">
            <text v-if="userInfo.isVerified" class="badge badge--verified">✅ 已核验</text>
            <text v-else-if="userInfo.verifyStatus === 'pending'" class="badge badge--pending">
              {{ pendingBadgeText }}
            </text>
          </view>
          <view class="persona-row">
            <text class="persona-chip">社交偏好：{{ socialPreferenceText }}</text>
            <text class="persona-chip">身份：{{ residencyTypeText }}</text>
          </view>
          <view v-if="identityTagTextList.length" class="persona-row">
            <text
              v-for="tag in identityTagTextList"
              :key="`mine-tag-${tag}`"
              class="persona-chip persona-chip--sub"
            >{{ tag }}</text>
          </view>
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
      <view class="profile-edit-wrap">
        <button class="profile-edit-btn" @tap="openProfileEditor">编辑我的资料</button>
      </view>

      <view v-if="showProfileEditor" class="profile-edit-mask" @tap="closeProfileEditor">
        <view class="profile-edit-dialog" @tap.stop>
          <text class="profile-edit-title">编辑用户信息</text>
          <view class="profile-edit-row">
            <button class="profile-avatar-btn" open-type="chooseAvatar" @chooseavatar="onProfileEditorChooseAvatar">
              <image v-if="profileEditDraft.avatarUrl" class="profile-avatar-img" :src="profileEditDraft.avatarUrl" mode="aspectFill" />
              <text v-else class="profile-avatar-tip">设置头像</text>
            </button>
            <input v-model="profileEditDraft.nickname" class="profile-edit-input" maxlength="20" placeholder="请输入用户名" />
          </view>

          <view class="profile-edit-field">
            <text class="profile-edit-label">社交偏好</text>
            <picker mode="selector" :range="socialPreferencePickerRange" :value="profileEditSocialPreferenceIndex" @change="onProfileEditSocialPreferenceChange">
              <view class="picker-row">
                <text class="picker-value">{{ socialPreferencePickerRange[profileEditSocialPreferenceIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>

          <view class="profile-edit-field">
            <text class="profile-edit-label">居住身份</text>
            <picker mode="selector" :range="residencyTypePickerRange" :value="profileEditResidencyTypeIndex" @change="onProfileEditResidencyTypeChange">
              <view class="picker-row">
                <text class="picker-value">{{ residencyTypePickerRange[profileEditResidencyTypeIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>

          <view class="profile-edit-field">
            <text class="profile-edit-label">身份标签（最多3个）</text>
            <view class="profile-tag-list">
              <text
                v-for="item in identityTagOptions"
                :key="`mine-edit-tag-${item.id}`"
                class="profile-tag-item"
                :class="{ 'profile-tag-item--active': profileEditDraft.identityTags.includes(item.id) }"
                @tap="toggleProfileEditIdentityTag(item.id)"
              >{{ item.label }}</text>
            </view>
          </view>

          <button class="profile-edit-confirm" @tap="saveProfileEditor">保存</button>
          <text class="profile-edit-cancel" @tap="closeProfileEditor">取消</text>
        </view>
      </view>

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
import {
  USER_IDENTITY_TAG_OPTIONS,
  USER_RESIDENCY_TYPE_OPTIONS,
  USER_SOCIAL_PREFERENCE_OPTIONS,
  getIdentityTagLabels,
  getResidencyTypeLabel,
  getSocialPreferenceLabel,
  normalizeIdentityTags,
  normalizeResidencyType,
  normalizeSocialPreference,
} from '@/utils/activityMeta.js'

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
        socialPreference: 'unknown',
        residencyType: 'unknown',
        identityTags: [],
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
      showProfileEditor: false,
      socialPreferenceOptions: USER_SOCIAL_PREFERENCE_OPTIONS,
      residencyTypeOptions: USER_RESIDENCY_TYPE_OPTIONS,
      identityTagOptions: USER_IDENTITY_TAG_OPTIONS,
      profileEditDraft: {
        nickname: '',
        avatarUrl: '',
        socialPreference: 'unknown',
        residencyType: 'unknown',
        identityTags: [],
      },
    }
  },

  computed: {
    isLoggedIn() {
      return !!getApp().globalData?.isLoggedIn
    },
    pendingBadgeText() {
      return '⏳ 审核中'
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
    socialPreferenceText() {
      return getSocialPreferenceLabel(this.userInfo.socialPreference)
    },
    residencyTypeText() {
      return getResidencyTypeLabel(this.userInfo.residencyType)
    },
    identityTagTextList() {
      return getIdentityTagLabels(this.userInfo.identityTags, 3)
    },
    socialPreferencePickerRange() {
      return this.socialPreferenceOptions.map((item) => item.label)
    },
    residencyTypePickerRange() {
      return this.residencyTypeOptions.map((item) => item.label)
    },
    profileEditSocialPreferenceIndex() {
      const idx = this.socialPreferenceOptions.findIndex((item) => item.id === this.profileEditDraft.socialPreference)
      return idx >= 0 ? idx : 0
    },
    profileEditResidencyTypeIndex() {
      const idx = this.residencyTypeOptions.findIndex((item) => item.id === this.profileEditDraft.residencyType)
      return idx >= 0 ? idx : 0
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
            socialPreference: user.socialPreference || 'unknown',
            residencyType: user.residencyType || 'unknown',
            identityTags: Array.isArray(user.identityTags) ? user.identityTags : [],
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
          getApp().globalData.socialPreference = user.socialPreference || 'unknown'
          getApp().globalData.residencyType = user.residencyType || 'unknown'
          getApp().globalData.identityTags = Array.isArray(user.identityTags) ? user.identityTags : []
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

    openProfileEditor() {
      this.profileEditDraft = {
        nickname: String(this.userInfo.nickname || '').trim(),
        avatarUrl: String(this.userInfo.avatarUrl || '').trim(),
        socialPreference: normalizeSocialPreference(this.userInfo.socialPreference),
        residencyType: normalizeResidencyType(this.userInfo.residencyType),
        identityTags: normalizeIdentityTags(this.userInfo.identityTags, 3),
      }
      this.showProfileEditor = true
    },

    closeProfileEditor() {
      this.showProfileEditor = false
    },

    onProfileEditorChooseAvatar(e) {
      this.profileEditDraft = {
        ...this.profileEditDraft,
        avatarUrl: String(e?.detail?.avatarUrl || '').trim(),
      }
    },

    onProfileEditSocialPreferenceChange(e) {
      const idx = Number(e?.detail?.value || 0)
      const option = this.socialPreferenceOptions[idx] || this.socialPreferenceOptions[0]
      this.profileEditDraft = {
        ...this.profileEditDraft,
        socialPreference: normalizeSocialPreference(option?.id || 'unknown'),
      }
    },

    onProfileEditResidencyTypeChange(e) {
      const idx = Number(e?.detail?.value || 0)
      const option = this.residencyTypeOptions[idx] || this.residencyTypeOptions[0]
      this.profileEditDraft = {
        ...this.profileEditDraft,
        residencyType: normalizeResidencyType(option?.id || 'unknown'),
      }
    },

    toggleProfileEditIdentityTag(tagId = '') {
      const safe = String(tagId || '').trim()
      if (!safe) return
      const current = Array.isArray(this.profileEditDraft.identityTags) ? [...this.profileEditDraft.identityTags] : []
      const exists = current.includes(safe)
      const next = exists
        ? current.filter((item) => item !== safe)
        : [...current, safe]
      this.profileEditDraft = {
        ...this.profileEditDraft,
        identityTags: normalizeIdentityTags(next, 3),
      }
    },

    async saveProfileEditor() {
      const nickname = String(this.profileEditDraft.nickname || '').trim()
      const avatarUrl = String(this.profileEditDraft.avatarUrl || '').trim()
      const socialPreference = normalizeSocialPreference(this.profileEditDraft.socialPreference)
      const residencyType = normalizeResidencyType(this.profileEditDraft.residencyType)
      const identityTags = normalizeIdentityTags(this.profileEditDraft.identityTags, 3)
      if (!nickname) {
        uni.showToast({ title: '请填写用户名', icon: 'none' })
        return
      }
      if (!avatarUrl) {
        uni.showToast({ title: '请设置头像', icon: 'none' })
        return
      }
      try {
        const res = await callCloud('login', {
          nickname,
          avatarUrl,
          socialPreference,
          residencyType,
          identityTags,
        })
        if (!res?.success) {
          uni.showToast({ title: '保存失败，请重试', icon: 'none' })
          return
        }
        getApp().globalData = getApp().globalData || {}
        getApp().globalData.nickname = nickname
        getApp().globalData.avatarUrl = avatarUrl
        getApp().globalData.socialPreference = socialPreference
        getApp().globalData.residencyType = residencyType
        getApp().globalData.identityTags = identityTags
        this.showProfileEditor = false
        await this.loadUserInfo()
        uni.showToast({ title: '资料已更新', icon: 'success' })
      } catch (e) {
        console.error('保存用户资料失败', e)
        uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
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
.persona-row {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.persona-chip {
  font-size: 20rpx;
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
}
.persona-chip--sub {
  background: rgba(255, 255, 255, 0.12);
}

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

.profile-edit-wrap {
  padding: 16rpx;
}
.profile-edit-btn {
  width: 100%;
  height: 74rpx;
  line-height: 74rpx;
  border-radius: 12rpx;
  border: 1rpx solid #d8e3f0;
  background: #fff;
  color: #1a3c5e;
  font-size: 26rpx;
}
.profile-edit-btn::after { border: none; }
.profile-edit-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.profile-edit-dialog {
  width: 84%;
  background: #fff;
  border-radius: 18rpx;
  padding: 30rpx 28rpx 24rpx;
}
.profile-edit-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.profile-edit-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.profile-avatar-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: none;
  background: #eef4fb;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.profile-avatar-btn::after { border: none; }
.profile-avatar-img {
  width: 100%;
  height: 100%;
}
.profile-avatar-tip {
  font-size: 22rpx;
  color: #1a3c5e;
}
.profile-edit-input {
  flex: 1;
  height: 72rpx;
  border-radius: 10rpx;
  background: #f5f7fa;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #1a1a1a;
}
.profile-edit-field {
  margin-top: 12rpx;
}
.profile-edit-label {
  display: block;
  font-size: 22rpx;
  color: #667085;
  margin-bottom: 6rpx;
}
.picker-row {
  min-height: 64rpx;
  border-radius: 10rpx;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14rpx;
}
.picker-value {
  font-size: 24rpx;
  color: #111827;
}
.arrow {
  font-size: 28rpx;
  color: #98a2b3;
}
.profile-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.profile-tag-item {
  padding: 7rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #475467;
  background: #fff;
  border: 1rpx solid #e4e7ec;
}
.profile-tag-item--active {
  color: #1a3c5e;
  border-color: #1a3c5e;
  background: #eaf2fb;
}
.profile-edit-confirm {
  margin-top: 20rpx;
  width: 100%;
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 12rpx;
  background: #1a3c5e;
  color: #fff;
  border: none;
}
.profile-edit-confirm::after { border: none; }
.profile-edit-cancel {
  margin-top: 14rpx;
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #98a2b3;
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
