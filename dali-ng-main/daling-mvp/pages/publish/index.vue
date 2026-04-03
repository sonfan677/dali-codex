<template>
  <view class="page">
    <scroll-view scroll-y class="scroll" :scroll-top="scrollTop">
      <view class="form">

        <!-- 标题 -->
        <view class="field">
          <text class="label">活动标题 *</text>
          <input
            class="input"
            v-model="form.title"
            placeholder="一句话说明这是什么活动（最多30字）"
            maxlength="30"
          />
          <text class="char-count">{{ form.title.length }}/30</text>
        </view>

        <!-- 描述 -->
        <view class="field">
          <text class="label">活动描述</text>
          <textarea
            class="textarea"
            v-model="form.description"
            placeholder="活动详情、集合方式、注意事项等（选填）"
            maxlength="200"
          />
        </view>

        <!-- 分类 -->
        <view class="field">
          <text class="label">活动分类 *</text>
          <picker
            mode="selector"
            :range="categoryPickerRange"
            :value="categoryIndex"
            @change="onCategoryChange"
          >
            <view class="picker-row">
              <text class="picker-value">{{ categoryPickerRange[categoryIndex] }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 地点 -->
        <view class="field" @tap="chooseLocation">
          <text class="label">活动地点 *</text>
          <view class="location-row">
            <text v-if="form.address" class="location-chosen">📍 {{ form.address }}</text>
            <text v-else class="location-placeholder">点击选择地点</text>
            <text class="arrow">›</text>
          </view>
        </view>

        <!-- 开始时间 -->
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

        <!-- 时长 -->
        <view class="field">
          <text class="label">活动时长</text>
          <picker
            mode="selector"
            :range="durationOptions"
            :value="durationIndex"
            @change="onDurationChange"
          >
            <view class="picker-row">
              <text class="picker-value">{{ durationOptions[durationIndex] }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 最大人数 -->
        <view class="field">
          <text class="label">最大人数（留空表示不限）</text>
          <input
            class="input"
            :value="form.maxParticipants || ''"
            type="number"
            placeholder="不填表示不限人数"
            :cursor-spacing="120"
            @input="e => form.maxParticipants = e.detail.value ? parseInt(e.detail.value) : null"
          />
        </view>

        <!-- 成团活动开关 -->
        <view class="field field-switch">
          <view>
            <text class="label mb0">成团活动</text>
            <text class="hint">需达到最低人数才算成功</text>
          </view>
          <switch
            :checked="form.isGroupFormation"
            color="#1A3C5E"
            @change="onFormationToggle"
          />
        </view>

        <!-- 成团最低人数（仅成团活动显示） -->
        <view v-if="form.isGroupFormation" class="field">
          <text class="label">最低成团人数 *</text>
          <input
            class="input"
            :value="minParticipantsDisplay"
            type="number"
            placeholder="至少2人"
            :adjust-position="true"
            :cursor-spacing="120"
            @input="e => minParticipantsDisplay = e.detail.value"
            @blur="onMinParticipantsBlur"
          />
          <text class="hint">未成团会通知你决定是否继续</text>
        </view>

        <view v-if="form.isGroupFormation" class="field">
          <text class="label">成团时间窗口 *</text>
          <picker
            mode="selector"
            :range="formationWindowOptions"
            :value="formationWindowIndex"
            @change="onFormationWindowChange"
          >
            <view class="picker-row">
              <text class="picker-value">{{ formationWindowOptions[formationWindowIndex] }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
          <text class="hint">{{ formationWindowHint }}</text>
        </view>

      </view>
    </scroll-view>

    <!-- 底部发布按钮 -->
    <view class="bottom-bar">
      <button class="submit-btn" @tap="submit" :loading="submitting">
        发布活动
      </button>
    </view>

  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'
import { useUserStore } from '@/stores/user.js'
import { PUBLISH_CATEGORY_OPTIONS } from '@/utils/activityMeta.js'

function buildTimeRange() {
  const dates = []
  const hours = []
  const minutes = ['00', '15', '30', '45']
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const weekMap = ['周日','周一','周二','周三','周四','周五','周六']
    const week = i === 0 ? '今天' : i === 1 ? '明天' : weekMap[d.getDay()]
    dates.push(`${m}月${day}日 ${week}`)
  }
  for (let h = 0; h < 24; h++) {
    hours.push(h.toString().padStart(2, '0') + ' 时')
  }
  return { dates, hours, minutes }
}

export default {
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },

  data() {
    const { dates, hours, minutes } = buildTimeRange()
    const now = new Date()
    const defaultHour = now.getHours() + 1 >= 24 ? 0 : now.getHours() + 1
    return {
      submitting: false,
	  scrollTop: 0,
      minParticipantsDisplay: '',
      form: {
        title: '',
        description: '',
        lat: 0,
        lng: 0,
        address: '',
        startTimeStr: '',
        startTimeMs: 0,
        categoryId: PUBLISH_CATEGORY_OPTIONS[0].id,
        categoryLabel: PUBLISH_CATEGORY_OPTIONS[0].label,
        maxParticipants: null,
        isGroupFormation: false,
        minParticipants: 2,
      },
      categoryOptions: PUBLISH_CATEGORY_OPTIONS,
      categoryIndex: 0,
      timeRangeData: { dates, hours, minutes },
      timeRange: [dates, hours, ['00', '15', '30', '45']],
      timeIndex: [0, defaultHour, 0],
      durationOptions: ['1小时', '2小时', '3小时', '4小时', '6小时', '8小时'],
      durationIndex: 1,
      formationWindowOptions: ['15分钟（极速成团）', '30分钟（标准成团）', '60分钟（预约成团）'],
      formationWindowValues: [15, 30, 60],
      formationWindowIndex: 1,
    }
  },

  computed: {
    categoryPickerRange() {
      return this.categoryOptions.map((item) => item.label)
    },

    formationWindowHint() {
      const mins = this.formationWindowValues[this.formationWindowIndex]
      return `发布后${mins}分钟内未成团，会通知你决定是否继续`
    }
  },

  methods: {
    // 成团开关切换时重置输入
    onFormationToggle(e) {
      this.form.isGroupFormation = e.detail.value
      this.minParticipantsDisplay = ''
      this.form.minParticipants = 2
      this.formationWindowIndex = 1
      // 打开成团开关时自动滚动到底部
      if (e.detail.value) {
        setTimeout(() => {
          this.scrollTop = 99999
        }, 100)
      }
    },

    onFormationWindowChange(e) {
      this.formationWindowIndex = Number(e.detail.value || 0)
    },

    onCategoryChange(e) {
      const idx = Number(e.detail.value || 0)
      this.categoryIndex = idx
      const selected = this.categoryOptions[idx] || this.categoryOptions[0]
      this.form.categoryId = selected.id
      this.form.categoryLabel = selected.label
    },

    // 失焦时校验并格式化
    onMinParticipantsBlur() {
      const val = parseInt(this.minParticipantsDisplay)
      if (!val || val < 2) {
        this.form.minParticipants = 2
        this.minParticipantsDisplay = '2'
      } else {
        this.form.minParticipants = val
        this.minParticipantsDisplay = String(val)
      }
    },

chooseLocation() {
  // #ifdef MP-WEIXIN
  wx.getSetting({
    success: (settingRes) => {
      // 先检查隐私授权再调用
      wx.getPrivacySetting({
        success: (privacyRes) => {
          if (privacyRes.needAuthorization) {
            wx.requirePrivacyAuthorize({
              success: () => this._doChooseLocation(),
              fail: () => uni.showToast({ title: '需要授权才能选择地点', icon: 'none' }),
            })
          } else {
            this._doChooseLocation()
          }
        }
      })
    }
  })
  // #endif
},

_doChooseLocation() {
  wx.chooseLocation({
    success: (res) => {
      this.form.lat     = res.latitude
      this.form.lng     = res.longitude
      this.form.address = res.name || res.address
    },
    fail: (err) => {
      console.error('chooseLocation fail:', JSON.stringify(err))
      if (err.errMsg && err.errMsg.includes('auth deny')) {
        uni.showToast({ title: '请在设置中开启位置权限', icon: 'none' })
      }
    }
  })
},

    onColumnChange(e) {
      const { column, value } = e.detail
      this.timeIndex[column] = value
      this.timeIndex = [...this.timeIndex]
    },

    onTimeChange(e) {
      this.timeIndex = e.detail.value
      this._updateStartTime()
    },

    _updateStartTime() {
      const [di, hi, mi] = this.timeIndex
      const { dates, hours, minutes } = this.timeRangeData
      const now = new Date()
      const targetDate = new Date(now)
      targetDate.setDate(now.getDate() + di)
      targetDate.setHours(parseInt(hours[hi]), parseInt(minutes[mi]), 0, 0)
      this.form.startTimeMs = targetDate.getTime()
      const m   = targetDate.getMonth() + 1
      const d   = targetDate.getDate()
      const h   = targetDate.getHours().toString().padStart(2, '0')
      const min = targetDate.getMinutes().toString().padStart(2, '0')
      this.form.startTimeStr = `${m}月${d}日 ${h}:${min}`
    },

    onDurationChange(e) {
      this.durationIndex = e.detail.value
    },

    _getEndTimeMs() {
      const hours = [1, 2, 3, 4, 6, 8]
      return this.form.startTimeMs + hours[this.durationIndex] * 60 * 60 * 1000
    },

    identityReasonText(codes = []) {
      const map = {
        REPORTED_USER: '账号被举报后需补充核验',
        HIGH_FREQ_ORGANIZER: '近期高频发布触发补充核验',
      }
      const list = (Array.isArray(codes) ? codes : [])
        .map((code) => map[String(code)] || String(code))
        .filter(Boolean)
      return list.length ? list.join('；') : '当前账号需补充身份核验'
    },

    async submit() {
      const gd = getApp().globalData || {}
      const isVerified = gd.isVerified || this.userStore.isVerified
      if (!isVerified) {
        uni.showModal({
          title: '需要实名认证',
          content: '发布活动需要先完成实名认证',
          confirmText: '去认证',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/verify/index' })
          }
        })
        return
      }
      const identityCheckRequired = !!(gd.identityCheckRequired ?? this.userStore.identityCheckRequired)
      const identityCheckStatus = gd.identityCheckStatus || this.userStore.identityCheckStatus || 'none'
      if (identityCheckRequired && identityCheckStatus !== 'approved') {
        const reasonText = this.identityReasonText(gd.identityCheckReasons || this.userStore.identityCheckReasons || [])
        uni.showModal({
          title: '需补充身份核验',
          content: `${reasonText}，完成后可继续发布活动。`,
          confirmText: '去核验',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/verify/index' })
          }
        })
        return
      }
      if (!this.form.title.trim()) {
        uni.showToast({ title: '请填写活动标题', icon: 'none' })
        return
      }
      if (!this.form.lat || !this.form.lng) {
        uni.showToast({ title: '请选择活动地点', icon: 'none' })
        return
      }
      if (!this.form.startTimeMs) {
        uni.showToast({ title: '请选择开始时间', icon: 'none' })
        return
      }
      if (this.form.startTimeMs <= Date.now()) {
        uni.showToast({ title: '开始时间不能早于现在', icon: 'none' })
        return
      }
      if (this.form.isGroupFormation && this.form.minParticipants < 2) {
        uni.showToast({ title: '成团最低人数至少2人', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const res = await callCloud('publishActivity', {
          title:            this.form.title.trim(),
          description:      this.form.description.trim(),
          categoryId:       this.form.categoryId,
          categoryLabel:    this.form.categoryLabel,
          lat:              this.form.lat,
          lng:              this.form.lng,
          address:          this.form.address,
          startTime:        new Date(this.form.startTimeMs).toISOString(),
          endTime:          new Date(this._getEndTimeMs()).toISOString(),
          maxParticipants:  this.form.maxParticipants || 999,
          isGroupFormation: this.form.isGroupFormation,
          minParticipants:  this.form.isGroupFormation ? this.form.minParticipants : 0,
          formationWindow:  this.form.isGroupFormation ? this.formationWindowValues[this.formationWindowIndex] : 30,
          cityId:           'dali',
        })
        if (res.success) {
          uni.showToast({ title: '发布成功！', icon: 'success' })
          setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 1500)
        } else {
          if (res.error === 'IDENTITY_CHECK_REQUIRED') {
            const reasonText = this.identityReasonText(res.identityCheckReasons || [])
            uni.showModal({
              title: '需补充身份核验',
              content: `${reasonText}，完成后可继续发布活动。`,
              confirmText: '去核验',
              success: (r) => {
                if (r.confirm) uni.navigateTo({ url: '/pages/verify/index' })
              }
            })
            return
          }
          const msgs = {
            NOT_VERIFIED:  '请先完成实名认证',
            IDENTITY_CHECK_REQUIRED: '当前账号需补充身份核验',
            INVALID_TITLE: '标题格式有误',
            INVALID_CATEGORY: '请选择有效活动分类',
            START_PASSED:  '开始时间不能早于现在',
            INVALID_MIN:   '成团人数至少2人',
            INVALID_WINDOW:'成团时间窗口不合法',
          }
          uni.showToast({ title: msgs[res.error] || res.message || '发布失败', icon: 'none' })
        }
      } catch(e) {
        console.error('发布失败', e)
        uni.showToast({ title: '发布失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
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
.field-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.mb0 { margin-bottom: 4rpx; }
.hint { font-size: 22rpx; color: #bbb; display: block; margin-top: 8rpx; }
.input {
  font-size: 30rpx;
  color: #333;
  width: 100%;
}
.textarea {
  font-size: 30rpx;
  color: #333;
  width: 100%;
  min-height: 140rpx;
}
.char-count {
  font-size: 22rpx;
  color: #ccc;
  display: block;
  text-align: right;
  margin-top: 8rpx;
}
.location-row, .picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.location-chosen    { font-size: 30rpx; color: #333; flex: 1; }
.location-placeholder { font-size: 30rpx; color: #ccc; flex: 1; }
.picker-value       { font-size: 30rpx; color: #333; flex: 1; }
.picker-placeholder { font-size: 30rpx; color: #ccc; flex: 1; }
.arrow { font-size: 36rpx; color: #ccc; }

.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
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
</style>
