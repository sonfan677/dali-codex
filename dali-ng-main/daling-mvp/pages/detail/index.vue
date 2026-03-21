<template>
  <view class="page" v-if="activity">

    <!-- 封面图（有则展示） -->
    <image
      v-if="activity.coverImage"
      class="cover"
      :src="activity.coverImage"
      mode="aspectFill"
    />

    <view class="content">

      <!-- 标签 -->
      <view class="tags">
        <text v-if="activity.isRecommended" class="tag tag--recommend">官方推荐</text>
        <text v-if="activity.isVerified"    class="tag tag--verified">已实名发布</text>
        <text class="tag tag--trust">{{ trustStars }} {{ trustIdentity }}</text>
        <text
          v-for="tag in trustTags"
          :key="`detail-risk-${activity._id}-${tag}`"
          class="tag tag--risk"
        >{{ tag }}</text>
      </view>

      <!-- 标题 -->
      <text class="title">{{ activity.title }}</text>

      <!-- 基本信息 -->
      <view class="info-row">
        <text class="info-label">时间</text>
        <text class="info-value">{{ formatTime(activity.startTime) }} – {{ formatTime(activity.endTime) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">地点</text>
        <text class="info-value">{{ activity.location && activity.location.address }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">人数</text>
        <text class="info-value">
          已有 {{ activity.currentParticipants }} 人参与
          <text v-if="activity.maxParticipants < 999">· 最多 {{ activity.maxParticipants }} 人</text>
        </text>
      </view>

      <!-- 描述 -->
      <view v-if="activity.description" class="desc-box">
        <text class="desc-text">{{ activity.description }}</text>
      </view>

      <!-- 发布者 -->
      <view class="publisher">
        <image
          class="pub-avatar"
          :src="activity.publisherAvatar || '/static/default-avatar.png'"
          mode="aspectFill"
        />
        <view class="pub-info">
          <text class="pub-name">{{ activity.publisherNickname || '匿名用户' }}</text>
          <text class="pub-label">{{ trustIdentity }}</text>
          <text class="pub-trust">{{ trustStars }}</text>
        </view>
      </view>

      <!-- 成团进度 -->
      <view v-if="activity.isGroupFormation" class="formation-block">
        <view class="formation-header">
          <text class="formation-title">成团进度</text>
          <text class="formation-status">{{ formationStatusText }}</text>
        </view>
        <view class="formation-bar">
          <view class="formation-fill" :style="{ width: formationProgress + '%' }" />
        </view>
        <text class="formation-desc">{{ formationDesc }}</text>
      </view>

    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <text class="report-btn" @tap="report">举报</text>

      <!-- 我是发布者 -->
      <button
        v-if="isPublisher"
        class="btn btn--cancel"
        @tap="cancelActivity"
        :disabled="!canCancel"
      >取消活动</button>

      <!-- 已报名 -->
      <button v-else-if="hasJoined" class="btn btn--joined" disabled>
        已报名 ✓
      </button>

      <!-- 可以报名 -->
      <button
        v-else-if="canJoin"
        class="btn btn--join"
        @tap="join"
        :loading="joining"
      >{{ joinBtnText }}</button>

      <!-- 不可报名 -->
      <button v-else class="btn btn--disabled" disabled>
        {{ disabledReason }}
      </button>
    </view>

  </view>

  <!-- 加载中 -->
  <view v-else class="loading-page">
    <text class="loading-text">加载中...</text>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'
import { getTimeStatus, formationTimeLeft } from '@/utils/distance.js'

export default {
  data() {
    return {
      activity: null,
      hasJoined: false,
      joining: false,
      serverTime: Date.now(),
      currentOpenid: '',
    }
  },

  onLoad(options) {
    this.activityId = options.id
    this.currentOpenid = getApp().globalData?.openid || ''
    this.loadDetail()
  },

  computed: {
    isPublisher() {
      return this.currentOpenid && this.activity?.publisherId === this.currentOpenid
    },

    timeStatus() {
      if (!this.activity) return { status: 'upcoming_soon', text: '' }
      return getTimeStatus(this.activity.startTime, this.activity.endTime, new Date(this.serverTime))
    },

    canJoin() {
      if (!this.activity) return false
      return this.activity.status === 'OPEN' && this.timeStatus.status !== 'ended'
    },

    canCancel() {
      if (!this.activity) return false
      return !['ENDED', 'CANCELLED'].includes(this.activity.status)
    },

    joinBtnText() {
      if (this.activity?.isGroupFormation && this.activity?.formationStatus === 'FORMING') {
        const shortage = (this.activity.minParticipants || 0) - (this.activity.currentParticipants || 0)
        if (shortage > 0) return `参与成团（还差${shortage}人）`
      }
      return '我要参与'
    },

    disabledReason() {
      if (!this.activity) return ''
      const map = { FULL: '已满员', ENDED: '已结束', CANCELLED: '已取消' }
      return map[this.activity.status] || '不可报名'
    },

    formationProgress() {
      if (!this.activity?.isGroupFormation) return 0
      const cur = this.activity.currentParticipants || 0
      const min = this.activity.minParticipants || 1
      return Math.min(100, Math.round((cur / min) * 100))
    },

    formationStatusText() {
      const s = this.activity?.formationStatus
      if (s === 'CONFIRMED') return '✅ 已成团'
      if (s === 'FAILED')    return '招募已结束'
      return '成团中'
    },

    formationDesc() {
      if (!this.activity?.isGroupFormation) return ''
      const { currentParticipants, minParticipants, formationDeadline, formationStatus } = this.activity
      if (formationStatus === 'CONFIRMED') return `共 ${currentParticipants} 人，已成团！`
      if (formationStatus === 'FAILED')    return '未达到成团人数'
      const shortage = (minParticipants || 0) - (currentParticipants || 0)
      const timeLeft = formationDeadline
        ? formationTimeLeft(new Date(formationDeadline), new Date(this.serverTime))
        : ''
      if (shortage <= 0) return `已达成团人数！${timeLeft}`
      return `还差 ${shortage} 人 · ${timeLeft}`
    },

    trustProfile() {
      return this.activity?.trustProfile || {}
    },

    trustStars() {
      if (this.trustProfile.starText) return this.trustProfile.starText
      const stars = Number(this.trustProfile.displayStars || 3)
      return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`
    },

    trustIdentity() {
      return this.trustProfile.identityLabel || (this.activity?.isVerified ? '已认证' : '新入驻')
    },

    trustTags() {
      return Array.isArray(this.trustProfile.riskTags) ? this.trustProfile.riskTags.slice(0, 3) : []
    },
  },

  methods: {
    async loadDetail() {
      try {
        const res = await callCloud('getActivityDetail', { activityId: this.activityId })
        if (!res || !res.success) throw new Error(res?.message || '活动不存在')
        this.activity = res.activity
        this.hasJoined = !!res.hasJoined
        this.serverTime = res.serverTime || Date.now()
        this.currentOpenid = res.currentOpenid || this.currentOpenid
      } catch(e) {
        uni.showToast({ title: '活动不存在', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1500)
      }
    },
    // 请求订阅消息授权
    requestSubscribe() {
      return new Promise((resolve) => {
        // #ifdef MP-WEIXIN
        if (typeof wx === 'undefined' || typeof wx.requestSubscribeMessage !== 'function') {
          resolve({ ok: false, reason: 'UNSUPPORTED' })
          return
        }

        const TMPL_START   = 'zgiN-rGOY7w4igxoQA5cwB6DqO9jsFIPkXQund_ZBiM'
        const TMPL_CANCEL  = '3wPqnwBSWK5LnfA-BIDxFeXkSkD01D5meepLNQw6IVY'
        const TMPL_FORMING = 'LC4Z3cL8VoDl679__aRVVvuh4VRCys70b5ZQc0edI0o'
        const tmplIds = [TMPL_START, TMPL_CANCEL, TMPL_FORMING].filter(Boolean)

        wx.requestSubscribeMessage({
          tmplIds,
          success: (res) => {
            const statusList = Object.keys(res || {})
              .filter((k) => k !== 'errMsg')
              .map((k) => String(res[k] || ''))
            const accepted = statusList.includes('accept')
            const rejected = statusList.includes('reject')
            const banned   = statusList.includes('ban')

            console.log('[订阅消息] 授权结果:', JSON.stringify(res))
            resolve({
              ok: true,
              accepted,
              rejected,
              banned,
              raw: res,
            })
          },
          fail: (err) => {
            console.log('[订阅消息] 授权失败:', JSON.stringify(err))
            resolve({
              ok: false,
              reason: 'FAIL',
              errMsg: String(err?.errMsg || ''),
              raw: err,
            })
          }
        })
        // #endif

        // 非微信环境直接通过
        // #ifndef MP-WEIXIN
        resolve({ ok: false, reason: 'NON_MP' })
        // #endif
      })
    },
    async join() {
      const isLoggedIn = getApp().globalData?.isLoggedIn
      if (!isLoggedIn) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
    
      // 请求订阅授权（不影响报名主流程）
      const subRes = await this.requestSubscribe()
      if (subRes?.ok && subRes.accepted) {
        uni.showToast({ title: '已开启活动通知', icon: 'none', duration: 1200 })
      } else if (subRes?.ok && (subRes.rejected || subRes.banned)) {
        uni.showModal({
          title: '未开启订阅消息',
          content: '你可在设置中开启“订阅消息”，以便接收活动提醒',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm && typeof wx !== 'undefined' && wx.openSetting) {
              wx.openSetting({ withSubscriptions: true })
            }
          }
        })
      } else if (!subRes?.ok) {
        const detail = subRes?.errMsg || ''
        uni.showModal({
          title: '订阅授权未弹出',
          content: detail
            ? `不影响报名\n原因：${detail}`
            : '不影响报名\n可能是微信侧限制或设置关闭',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm && typeof wx !== 'undefined' && wx.openSetting) {
              wx.openSetting({ withSubscriptions: true })
            }
          }
        })
      }
    
      this.joining = true
      try {
        const res = await callCloud('joinActivity', { activityId: this.activityId })
        if (res.success) {
          this.hasJoined = true
          this.activity.currentParticipants += 1
          if (res.isFull) this.activity.status = 'FULL'
          uni.showToast({ title: '报名成功！', icon: 'success' })
        } else {
          const msgs = {
            ALREADY_JOINED: '你已经报名了',
            FULL:           '活动已满员',
            ENDED:          '活动已结束',
            NOT_OPEN:       '活动暂不接受报名',
            OWN_ACTIVITY:   '不能报名自己的活动',
          }
          uni.showToast({ title: msgs[res.error] || '报名失败', icon: 'none' })
        }
      } catch(e) {
        uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      } finally {
        this.joining = false
      }
    },

    async cancelActivity() {
      const count = this.activity?.currentParticipants || 0
      uni.showModal({
        title: '确认取消活动？',
        content: count > 0 ? `已有 ${count} 人报名，取消后他们将看到活动状态变更` : '确认取消这个活动吗？',
        cancelText: '我再想想',
        confirmText: '确认取消',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const result = await callCloud('cancelActivity', { activityId: this.activityId })
            if (result.success) {
              this.activity.status = 'CANCELLED'
              uni.showToast({ title: '活动已取消', icon: 'success' })
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    report() {
      uni.showModal({
        title: '举报此活动',
        editable: true,
        placeholderText: '请简要描述举报原因',
        success: async (res) => {
          if (res.confirm && res.content) {
            try {
              // #ifdef MP-WEIXIN
              const db = wx.cloud.database()
              await db.collection('adminActions').add({
                data: {
                  targetId:   this.activityId,
                  targetType: 'activity',
                  action:     'report',
                  reason:     res.content,
                  createdAt:  db.serverDate(),
                }
              })
              // #endif
              uni.showToast({ title: '举报已提交，感谢反馈', icon: 'success' })
            } catch(e) {
              uni.showToast({ title: '提交失败，请重试', icon: 'none' })
            }
          }
        }
      })
    },

    formatTime(t) {
      if (!t) return ''
      const d = new Date(t)
      const mo = d.getMonth() + 1
      const day = d.getDate()
      const h  = d.getHours().toString().padStart(2, '0')
      const m  = d.getMinutes().toString().padStart(2, '0')
      return `${mo}/${day} ${h}:${m}`
    },
  }
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 160rpx; }
.cover { width: 100%; height: 400rpx; display: block; }
.content { padding: 32rpx; }

.tags { display: flex; gap: 12rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.tag { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx; }
.tag--recommend { background: #FFF3CD; color: #856404; }
.tag--verified  { background: #EEF7EE; color: #1E7145; }
.tag--trust     { background: #FFF7E8; color: #8B5E00; }
.tag--risk      { background: #FFF0F0; color: #B03A3A; }

.title {
  font-size: 38rpx; font-weight: bold; color: #1a1a1a;
  display: block; margin-bottom: 32rpx;
}

.info-row {
  display: flex; gap: 20rpx; margin-bottom: 20rpx; align-items: flex-start;
}
.info-label { font-size: 26rpx; color: #999; width: 80rpx; flex-shrink: 0; }
.info-value { font-size: 26rpx; color: #333; flex: 1; line-height: 1.5; }

.desc-box {
  background: white; border-radius: 12rpx;
  padding: 24rpx; margin: 24rpx 0;
}
.desc-text { font-size: 28rpx; color: #555; line-height: 1.7; }

.publisher {
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 0; border-top: 1rpx solid #eee; margin-top: 8rpx;
}
.pub-avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%; background: #eee;
}
.pub-info { display: flex; flex-direction: column; gap: 6rpx; }
.pub-name  { font-size: 28rpx; color: #333; }
.pub-label { font-size: 22rpx; color: #1E7145; }
.pub-trust { font-size: 22rpx; color: #8B5E00; }

.formation-block {
  background: #EEF4FB; border-radius: 12rpx;
  padding: 24rpx; margin-top: 24rpx;
}
.formation-header {
  display: flex; justify-content: space-between; margin-bottom: 16rpx;
}
.formation-title { font-size: 26rpx; color: #1A3C5E; font-weight: bold; }
.formation-status { font-size: 26rpx; color: #1E7145; }
.formation-bar {
  height: 12rpx; background: rgba(0,0,0,0.08);
  border-radius: 6rpx; overflow: hidden; margin-bottom: 12rpx;
}
.formation-fill {
  height: 100%; background: #2E75B6; border-radius: 6rpx;
}
.formation-desc { font-size: 24rpx; color: #555; }

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: white; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 20rpx;
}
.report-btn { font-size: 26rpx; color: #999; padding: 0 16rpx; flex-shrink: 0; }

.btn {
  flex: 1; height: 88rpx; border-radius: 16rpx;
  font-size: 30rpx; font-weight: bold; border: none;
}
.btn--join     { background: #1A3C5E; color: white; }
.btn--joined   { background: #f0f0f0; color: #999; }
.btn--cancel   { background: white; color: #C00000; border: 2rpx solid #C00000; }
.btn--disabled { background: #f0f0f0; color: #999; }

.loading-page {
  min-height: 100vh; display: flex;
  align-items: center; justify-content: center;
}
.loading-text { font-size: 28rpx; color: #999; }
</style>
