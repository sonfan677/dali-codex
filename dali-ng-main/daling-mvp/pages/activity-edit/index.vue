<template>
  <view class="page">
    <scroll-view scroll-y class="scroll">
      <view class="form">
        <view class="field">
          <text class="label">活动标题</text>
          <text class="readonly">{{ form.title || '--' }}</text>
        </view>

        <view class="field">
          <text class="label">当前报名人数</text>
          <text class="readonly">{{ form.currentParticipants }} 人</text>
        </view>

        <view class="field" @tap="chooseLocation">
          <text class="label">活动地点 *</text>
          <view class="picker-row">
            <text v-if="form.address" class="picker-value">📍 {{ form.address }}</text>
            <text v-else class="picker-placeholder">点击选择地点</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <view class="field">
          <text class="label">开始时间 *</text>
          <picker
            mode="multiSelector"
            :range="timeRange"
            :value="timeIndex"
            @change="onTimeChange"
            @columnchange="onColumnChange"
          >
            <view class="picker-row">
              <text v-if="form.startTimeStr" class="picker-value">{{ form.startTimeStr }}</text>
              <text v-else class="picker-placeholder">点击选择时间</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="field">
          <text class="label">活动时长</text>
          <picker mode="selector" :range="durationOptions" :value="durationIndex" @change="onDurationChange">
            <view class="picker-row">
              <text class="picker-value">{{ durationOptions[durationIndex] }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="field">
          <text class="label">最大人数（留空表示不限）</text>
          <input
            class="input"
            type="number"
            :value="maxParticipantsInput"
            placeholder="不填表示不限人数"
            :cursor-spacing="120"
            @input="onMaxInput"
          />
          <text class="hint">人数上限不能小于当前报名人数（{{ form.currentParticipants }}）</text>
        </view>
      </view>
    </scroll-view>

    <view class="bottom-bar">
      <button class="submit-btn" @tap="submit" :loading="submitting">保存修改</button>
    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'

function buildTimeRange(days = 14) {
  const dates = []
  const hours = []
  const minutes = ['00', '15', '30', '45']
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const week = i === 0 ? '今天' : i === 1 ? '明天' : weekMap[d.getDay()]
    dates.push(`${m}月${day}日 ${week}`)
  }
  for (let h = 0; h < 24; h++) {
    hours.push(h.toString().padStart(2, '0') + ' 时')
  }
  return { dates, hours, minutes }
}

function formatTimeText(d) {
  const mo = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${mo}月${day}日 ${h}:${m}`
}

export default {
  data() {
    const { dates, hours, minutes } = buildTimeRange(14)
    return {
      activityId: '',
      submitting: false,
      form: {
        title: '',
        address: '',
        lat: 0,
        lng: 0,
        startTimeMs: 0,
        startTimeStr: '',
        currentParticipants: 0,
      },
      maxParticipantsInput: '',
      durationHoursValues: [1, 2, 3, 4, 6, 8],
      durationOptions: ['1小时', '2小时', '3小时', '4小时', '6小时', '8小时'],
      durationIndex: 1,
      timeRangeData: { dates, hours, minutes },
      timeRange: [dates, hours, minutes],
      timeIndex: [0, 12, 0],
    }
  },

  onLoad(options) {
    this.activityId = options.id || ''
    this.loadForEdit()
  },

  methods: {
    async loadForEdit() {
      if (!this.activityId) {
        uni.showToast({ title: '缺少活动ID', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1000)
        return
      }
      try {
        const res = await callCloud('getActivityDetail', { activityId: this.activityId })
        if (!res?.success || !res?.activity) throw new Error(res?.message || '活动不存在')
        if (!res.isPublisher) {
          uni.showToast({ title: '仅发布者可编辑', icon: 'none' })
          setTimeout(() => uni.navigateBack(), 1200)
          return
        }

        const activity = res.activity
        if (['ENDED', 'CANCELLED'].includes(activity.status)) {
          uni.showToast({ title: '活动已结束或取消，无法编辑', icon: 'none' })
          setTimeout(() => uni.navigateBack(), 1200)
          return
        }

        const nowMs = Date.now()
        const startMs = new Date(activity.startTime).getTime()
        if (!Number.isFinite(startMs) || startMs <= nowMs) {
          uni.showToast({ title: '活动已开始，暂不支持编辑', icon: 'none' })
          setTimeout(() => uni.navigateBack(), 1200)
          return
        }

        const endMs = new Date(activity.endTime).getTime()
        const durationHours = Math.max(1, Math.round((endMs - startMs) / (60 * 60 * 1000)))
        const closestIdx = this.durationHoursValues.reduce((bestIdx, val, idx) => {
          const prev = this.durationHoursValues[bestIdx]
          return Math.abs(val - durationHours) < Math.abs(prev - durationHours) ? idx : bestIdx
        }, 0)

        this.form.title = activity.title || ''
        this.form.address = activity.location?.address || ''
        this.form.lat = Number(activity.location?.lat || 0)
        this.form.lng = Number(activity.location?.lng || 0)
        this.form.startTimeMs = startMs
        this.form.startTimeStr = formatTimeText(new Date(startMs))
        this.form.currentParticipants = Number(activity.currentParticipants || 0)
        this.durationIndex = closestIdx

        const max = Number(activity.maxParticipants || 999)
        this.maxParticipantsInput = max >= 999 ? '' : String(max)

        this.syncTimeIndexByStartMs(startMs)
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1200)
      }
    },

    syncTimeIndexByStartMs(startMs) {
      const d = new Date(startMs)
      const now = new Date()
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const dayDiff = Math.round((target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))

      const dayIdx = Math.max(0, Math.min(this.timeRangeData.dates.length - 1, dayDiff))
      const hourIdx = Math.max(0, Math.min(23, d.getHours()))
      const minuteOptions = this.timeRangeData.minutes.map((m) => Number(m))
      const targetMinute = d.getMinutes()
      const minuteIdx = minuteOptions.reduce((best, cur, idx) => {
        const prev = minuteOptions[best]
        return Math.abs(cur - targetMinute) < Math.abs(prev - targetMinute) ? idx : best
      }, 0)
      this.timeIndex = [dayIdx, hourIdx, minuteIdx]
      this.updateStartTimeByIndex()
    },

    onColumnChange(e) {
      const { column, value } = e.detail
      this.timeIndex[column] = value
      this.timeIndex = [...this.timeIndex]
    },

    onTimeChange(e) {
      this.timeIndex = e.detail.value
      this.updateStartTimeByIndex()
    },

    updateStartTimeByIndex() {
      const [di, hi, mi] = this.timeIndex
      const { hours, minutes } = this.timeRangeData
      const now = new Date()
      const targetDate = new Date(now)
      targetDate.setDate(now.getDate() + Number(di || 0))
      targetDate.setHours(parseInt(hours[hi], 10), parseInt(minutes[mi], 10), 0, 0)
      this.form.startTimeMs = targetDate.getTime()
      this.form.startTimeStr = formatTimeText(targetDate)
    },

    onDurationChange(e) {
      this.durationIndex = Number(e.detail.value || 0)
    },

    onMaxInput(e) {
      const val = String(e.detail.value || '').replace(/[^\d]/g, '')
      this.maxParticipantsInput = val
    },

    getEndTimeMs() {
      const hours = this.durationHoursValues[this.durationIndex] || 2
      return this.form.startTimeMs + hours * 60 * 60 * 1000
    },

    chooseLocation() {
      // #ifdef MP-WEIXIN
      wx.getSetting({
        success: () => {
          wx.getPrivacySetting({
            success: (privacyRes) => {
              if (privacyRes.needAuthorization) {
                wx.requirePrivacyAuthorize({
                  success: () => this.doChooseLocation(),
                  fail: () => uni.showToast({ title: '需要授权才能选择地点', icon: 'none' }),
                })
              } else {
                this.doChooseLocation()
              }
            }
          })
        }
      })
      // #endif
    },

    doChooseLocation() {
      // #ifdef MP-WEIXIN
      wx.chooseLocation({
        success: (res) => {
          this.form.lat = Number(res.latitude || 0)
          this.form.lng = Number(res.longitude || 0)
          this.form.address = res.name || res.address || ''
        },
        fail: (err) => {
          const msg = String(err?.errMsg || '')
          if (msg.includes('auth deny')) {
            uni.showToast({ title: '请在设置中开启位置权限', icon: 'none' })
          }
        }
      })
      // #endif
    },

    async submit() {
      if (!this.form.lat || !this.form.lng) {
        uni.showToast({ title: '请选择活动地点', icon: 'none' })
        return
      }
      if (!this.form.startTimeMs) {
        uni.showToast({ title: '请选择开始时间', icon: 'none' })
        return
      }
      const endMs = this.getEndTimeMs()
      if (endMs <= this.form.startTimeMs) {
        uni.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' })
        return
      }

      const maxVal = this.maxParticipantsInput ? Number(this.maxParticipantsInput) : 999
      if (maxVal < this.form.currentParticipants) {
        uni.showToast({
          title: `人数上限不能小于当前报名人数（${this.form.currentParticipants}）`,
          icon: 'none'
        })
        return
      }

      this.submitting = true
      try {
        const res = await callCloud('updateActivity', {
          activityId: this.activityId,
          lat: this.form.lat,
          lng: this.form.lng,
          address: this.form.address,
          startTime: new Date(this.form.startTimeMs).toISOString(),
          endTime: new Date(endMs).toISOString(),
          maxParticipants: maxVal,
        })

        if (res?.success) {
          uni.showToast({ title: '修改成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 900)
        } else {
          const msgMap = {
            NOT_EDITABLE: '活动状态不可编辑',
            ACTIVITY_STARTED: '活动已开始，暂不支持编辑',
            INVALID_MAX_CURRENT: `人数上限不能小于当前报名人数（${this.form.currentParticipants}）`,
            START_PASSED: '开始时间必须晚于现在',
            INVALID_LOCATION: '请重新选择活动地点',
          }
          uni.showToast({ title: msgMap[res?.error] || res?.message || '修改失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '修改失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  }
}
</script>

<style>
.page { background: #f5f5f5; min-height: 100vh; }
.scroll {
  height: calc(100vh - 120rpx);
  padding-bottom: 40rpx;
}
.form { padding: 24rpx 24rpx 40rpx; display: flex; flex-direction: column; gap: 16rpx; }

.field {
  background: white;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
}
.label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.readonly {
  font-size: 30rpx;
  color: #333;
  line-height: 1.5;
}
.hint {
  font-size: 22rpx;
  color: #bbb;
  display: block;
  margin-top: 8rpx;
}
.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-value {
  font-size: 30rpx;
  color: #333;
  flex: 1;
}
.picker-placeholder {
  font-size: 30rpx;
  color: #ccc;
  flex: 1;
}
.arrow { font-size: 36rpx; color: #ccc; }

.input {
  font-size: 30rpx;
  color: #333;
  width: 100%;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: white;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);
}
.submit-btn {
  width: 100%;
  height: 96rpx;
  background: #1A3C5E;
  color: white;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}
.submit-btn::after { border: none; }
</style>
