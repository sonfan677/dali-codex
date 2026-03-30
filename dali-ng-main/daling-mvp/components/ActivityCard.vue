<template>
  <view class="card" @tap="$emit('tap')">

    <!-- 标签行 -->
    <view class="tags">
      <text v-if="activity.isRecommended" class="tag tag--recommend">官方推荐</text>
      <text v-if="activity.isVerified" class="tag tag--verified">已实名</text>
      <text class="tag tag--category">{{ categoryLabel }}</text>
      <text class="tag tag--trust">{{ trustStars }} {{ trustIdentity }}</text>
      <text
        v-for="tag in trustTags"
        :key="`risk-${activity._id}-${tag}`"
        class="tag tag--risk"
      >{{ tag }}</text>
      <text class="tag tag--distance">{{ distanceText }}</text>
    </view>

    <!-- 标题 -->
    <text class="title">{{ activity.title }}</text>

    <!-- 时间状态 + 人数 -->
    <view class="meta">
      <text class="status" :class="'status--' + timeStatus.status">
        {{ timeStatus.text }}
      </text>
      <text class="dot">·</text>
      <text class="participants">已有 {{ activity.currentParticipants }} 人参与</text>
    </view>

    <!-- 成团进度（仅成团活动显示） -->
    <view v-if="activity.isGroupFormation" class="formation">
      <view class="formation-bar">
        <view class="formation-fill" :style="{ width: formationProgress + '%' }" />
      </view>
      <text class="formation-text">{{ formationText }}</text>
    </view>

  </view>
</template>

<script>
import { getDistance, distanceToText, getTimeStatus, formationTimeLeft } from '@/utils/distance.js'
import { getCategoryLabel } from '@/utils/activityMeta.js'

export default {
  name: 'ActivityCard',

  props: {
    activity: { type: Object, required: true },
    userLat:  { type: Number, default: null },
    userLng:  { type: Number, default: null },
    serverTime: { type: Number, default: () => Date.now() },
  },

  emits: ['tap'],

  computed: {
    distanceText() {
      if (this.activity._distance != null) {
        return distanceToText(this.activity._distance)
      }
      if (this.userLat && this.userLng && this.activity.location?.lat) {
        const d = getDistance(
          this.userLat, this.userLng,
          this.activity.location.lat, this.activity.location.lng
        )
        return distanceToText(d)
      }
      return this.activity.location?.address || '位置未知'
    },

    timeStatus() {
      return getTimeStatus(
        this.activity.startTime,
        this.activity.endTime,
        new Date(this.serverTime)
      )
    },

    formationProgress() {
      const cur = this.activity.currentParticipants || 0
      const min = this.activity.minParticipants || 1
      return Math.min(100, Math.round((cur / min) * 100))
    },

    formationText() {
      const {
        formationStatus,
        currentParticipants,
        minParticipants,
        formationDeadline,
        organizerDecisionDeadline,
      } = this.activity
      if (formationStatus === 'CONFIRMED') return '✅ 已成团！'
      if (formationStatus === 'PENDING_ORGANIZER') {
        const shortage = Math.max(0, (minParticipants || 0) - (currentParticipants || 0))
        const decisionLeft = organizerDecisionDeadline
          ? formationTimeLeft(organizerDecisionDeadline, new Date(this.serverTime))
          : '等待发布者决策'
        if (shortage <= 0) return `等待发布者确认 · ${decisionLeft}`
        return `待发布者决策（还差${shortage}人）· ${decisionLeft}`
      }
      if (formationStatus === 'FAILED')    return '招募已结束'
      const shortage = (minParticipants || 0) - (currentParticipants || 0)
      const timeLeft = formationDeadline ? formationTimeLeft(formationDeadline, new Date(this.serverTime)) : ''
      if (shortage <= 0) return `已达成团人数 · ${timeLeft}`
      if (shortage <= 2) return `最后名额！还差 ${shortage} 人 · ${timeLeft}`
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
      return this.trustProfile.identityLabel || (this.activity.isVerified ? '已认证' : '新入驻')
    },

    trustTags() {
      return Array.isArray(this.trustProfile.riskTags) ? this.trustProfile.riskTags.slice(0, 2) : []
    },

    categoryLabel() {
      if (this.activity?.categoryLabel) return this.activity.categoryLabel
      return getCategoryLabel(this.activity?.categoryId || 'other')
    },
  }
}
</script>

<style scoped>
.card {
  background: white;
  border-radius: 16rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.tag--recommend { background: #FFF3CD; color: #856404; }
.tag--verified  { background: #EEF7EE; color: #1E7145; }
.tag--category  { background: #F0F7FF; color: #1E5EA8; }
.tag--trust     { background: #FFF7E8; color: #8B5E00; }
.tag--risk      { background: #FFF0F0; color: #B03A3A; }
.tag--distance  { background: #EEF4FB; color: #1A3C5E; }

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1a1a1a;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.4;
}
.meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.status { font-size: 26rpx; font-weight: bold; }
.status--ongoing      { color: #1E7145; }
.status--ending_soon  { color: #BF5700; }
.status--imminent     { color: #C00000; }
.status--starting_soon{ color: #BF5700; }
.status--upcoming_soon{ color: #555; }
.status--upcoming_far { color: #777; }
.status--ended        { color: #999; }
.dot { color: #ccc; font-size: 24rpx; }
.participants { font-size: 26rpx; color: #666; }

.formation {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}
.formation-bar {
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  margin-bottom: 10rpx;
  overflow: hidden;
}
.formation-fill {
  height: 100%;
  background: #2E75B6;
  border-radius: 4rpx;
}
.formation-text { font-size: 24rpx; color: #555; }
</style>
