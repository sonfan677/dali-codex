<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">官方活动日历</text>
      <text class="hero-sub">未来 {{ days }} 天 · 官方推荐活动与运营场次</text>
    </view>

    <view class="toolbar">
      <picker mode="selector" :range="dayOptions" :value="dayIndex" @change="onDayRangeChange">
        <view class="picker">时间范围：{{ dayOptions[dayIndex] }} <text class="arrow">›</text></view>
      </picker>
      <button class="refresh-btn" size="mini" :loading="loading" @tap="loadCalendar">刷新</button>
    </view>

    <view v-if="loading" class="empty">
      <text>加载中...</text>
    </view>

    <view v-else-if="calendarDays.length === 0" class="empty">
      <text>未来 {{ days }} 天暂无官方活动</text>
    </view>

    <view v-else class="day-list">
      <view v-for="day in calendarDays" :key="day.dayKey" class="day-card">
        <view class="day-head">
          <text class="day-title">{{ day.displayDate }}</text>
          <text class="day-count">{{ day.count }} 场</text>
        </view>

        <view v-for="item in day.items" :key="`${day.dayKey}-${item.source}-${item._id}`" class="event-item">
          <view class="event-main">
            <text class="event-time">{{ item.startText }} - {{ item.endText }}</text>
            <text class="event-title">{{ item.title }}</text>
            <text class="event-meta">{{ item.categoryLabel || '其他' }} · {{ item.location?.address || '地点待定' }}</text>
            <text class="event-meta">主理：{{ item.organizer || '官方运营' }}</text>
            <text v-if="item.quota" class="event-meta">
              名额：{{ item.joined != null ? `${item.joined}/${item.quota}` : `${item.quota}` }}
            </text>
          </view>
          <button
            v-if="item.activityId"
            class="detail-btn"
            size="mini"
            @tap="goDetail(item.activityId)"
          >查看</button>
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
      loading: false,
      dayOptions: ['7天', '14天', '30天'],
      dayValues: [7, 14, 30],
      dayIndex: 1,
      days: 14,
      calendarDays: [],
    }
  },

  onShow() {
    this.loadCalendar()
  },

  methods: {
    onDayRangeChange(e) {
      const idx = Number(e?.detail?.value || 0)
      this.dayIndex = Number.isFinite(idx) ? idx : 1
      this.days = this.dayValues[this.dayIndex] || 14
      this.loadCalendar()
    },
    async loadCalendar() {
      this.loading = true
      try {
        const res = await callCloud('getOfficialCalendar', { days: this.days, cityId: 'dali' })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '加载失败', icon: 'none' })
          this.calendarDays = []
          return
        }
        this.calendarDays = Array.isArray(res.calendarDays) ? res.calendarDays : []
      } catch (e) {
        uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
        this.calendarDays = []
      } finally {
        this.loading = false
      }
    },
    goDetail(activityId) {
      if (!activityId) return
      uni.navigateTo({ url: `/pages/detail/index?id=${activityId}` })
    },
  },
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f7fb;
  padding: 20rpx;
}
.hero {
  background: linear-gradient(135deg, #1A3C5E, #335E84);
  border-radius: 18rpx;
  padding: 28rpx;
  color: #fff;
}
.hero-title {
  font-size: 36rpx;
  font-weight: 700;
  display: block;
}
.hero-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.9;
}
.toolbar {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker {
  background: #fff;
  border-radius: 26rpx;
  padding: 12rpx 20rpx;
  font-size: 24rpx;
  color: #344054;
}
.arrow { color: #98A2B3; margin-left: 8rpx; }
.refresh-btn {
  border: none;
  background: #E8EFF8;
  color: #1A3C5E;
}
.refresh-btn::after { border: none; }

.empty {
  margin-top: 30rpx;
  background: #fff;
  border-radius: 14rpx;
  padding: 40rpx 24rpx;
  text-align: center;
  color: #667085;
}
.day-list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.day-card {
  background: #fff;
  border-radius: 14rpx;
  padding: 18rpx;
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}
.day-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1D2939;
}
.day-count {
  font-size: 22rpx;
  color: #667085;
}
.event-item {
  border-top: 1rpx solid #F2F4F7;
  padding: 14rpx 0;
  display: flex;
  gap: 12rpx;
}
.event-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.event-time {
  font-size: 22rpx;
  color: #3F6C96;
}
.event-title {
  font-size: 28rpx;
  color: #101828;
}
.event-meta {
  font-size: 22rpx;
  color: #667085;
}
.detail-btn {
  margin: 0;
  height: 54rpx;
  line-height: 54rpx;
  border-radius: 27rpx;
  border: none;
  background: #EEF4FB;
  color: #1A3C5E;
  font-size: 22rpx;
}
.detail-btn::after { border: none; }
</style>
