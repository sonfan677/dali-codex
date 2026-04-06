<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">官方活动日历</text>
      <text class="hero-sub">{{ monthTitle }} · 官方推荐 + 固定集市（免报名）</text>
    </view>

    <view class="toolbar">
      <picker mode="selector" :range="monthPickerRange" :value="monthIndex" @change="onMonthChange">
        <view class="picker">月份：{{ monthPickerRange[monthIndex] || monthTitle }} <text class="arrow">›</text></view>
      </picker>
      <button class="refresh-btn" size="mini" :loading="loading" @tap="loadCalendar">刷新</button>
    </view>

    <view class="month-tabs">
      <view
        v-for="(item, idx) in monthOptions"
        :key="item.key"
        class="month-tab"
        :class="{ 'month-tab--active': idx === monthIndex }"
        @tap="switchMonth(idx)"
      >
        {{ item.shortLabel }}
      </view>
    </view>

    <view class="market-board">
      <text class="market-board-title">固定集市（公开免费）</text>
      <view v-if="marketRules.length === 0" class="market-board-empty">暂无固定集市配置</view>
      <view v-else class="market-rule-list">
        <view v-for="rule in marketRules" :key="rule.id" class="market-rule-item">
          <view class="market-rule-main">
            <text class="market-rule-name">{{ rule.title }}</text>
            <text class="market-rule-time">{{ rule.scheduleText }}</text>
          </view>
          <text class="market-rule-meta">{{ rule.location?.address || '地点待定' }}</text>
        </view>
      </view>
    </view>

    <view class="calendar-card" @touchstart="onCalendarTouchStart" @touchend="onCalendarTouchEnd">
      <view class="week-head">
        <text v-for="wk in weekLabels" :key="wk" class="week-item">{{ wk }}</text>
      </view>
      <view class="month-grid">
        <view v-for="cell in monthGrid" :key="cell.key" class="grid-cell">
          <view v-if="cell.isPlaceholder" class="day-placeholder" />
          <view
            v-else
            class="day-cell"
            :class="{ 'day-cell--active': cell.dayKey === selectedDayKey, 'day-cell--today': cell.isToday }"
            @tap="selectDay(cell.dayKey)"
          >
            <text class="day-num">{{ cell.day }}</text>
            <view class="day-dots">
              <text v-if="cell.sourceCount.market > 0" class="dot dot-market" />
              <text v-if="cell.sourceCount.activity > 0" class="dot dot-activity" />
              <text v-if="cell.sourceCount.calendarEvent > 0" class="dot dot-plan" />
            </view>
            <text v-if="cell.count > 0" class="day-count">{{ cell.count }}</text>
          </view>
        </view>
      </view>
      <view class="legend-row">
        <view class="legend-item"><text class="dot dot-market" />集市</view>
        <view class="legend-item"><text class="dot dot-activity" />官方活动</view>
        <view class="legend-item"><text class="dot dot-plan" />官方排期</view>
      </view>
    </view>

    <view class="detail-panel">
      <view class="detail-head">
        <text class="detail-title">{{ selectedDayDisplay }}</text>
        <text class="detail-sub">共 {{ selectedDayItems.length }} 条</text>
      </view>

      <view v-if="loading" class="empty"><text>加载中...</text></view>
      <view v-else-if="selectedDayItems.length === 0" class="empty"><text>当天暂无条目</text></view>
      <view v-else class="detail-list">
        <view v-for="item in selectedDayItems" :key="`${item.source}-${item._id}`" class="detail-item">
          <view class="detail-main">
            <text class="detail-badge" :class="badgeClass(item.source)">{{ sourceLabel(item.source) }}</text>
            <text class="detail-item-title">{{ item.title }}</text>
            <text class="detail-meta">{{ item.startText }} - {{ item.endText }} · {{ item.categoryLabel || '其他' }}</text>
            <text class="detail-meta">地点：{{ item.location?.address || '地点待定' }}</text>
            <text class="detail-meta">主理：{{ item.organizer || '官方运营' }}</text>
            <text v-if="item.source === 'market'" class="detail-note">无需报名，可直接前往；如要结伴，可发起同行活动。</text>
          </view>
          <view class="detail-actions">
            <button
              v-if="item.source === 'market'"
              class="action-btn action-btn--launch"
              size="mini"
              @tap="launchWithMarket(item)"
            >发起同行</button>
            <button
              v-if="item.activityId"
              class="action-btn"
              size="mini"
              @tap="goDetail(item.activityId)"
            >查看活动</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function toChinaParts(input = Date.now()) {
  const ms = new Date(input).getTime()
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms + 8 * 60 * 60 * 1000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

function chinaDateToMs(year, month, day, hh = 0, mm = 0) {
  return Date.UTC(year, month - 1, day, hh - 8, mm, 0, 0)
}

function toDayKey(year, month, day) {
  return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
}

function toChinaDayKey(input = Date.now()) {
  const parts = toChinaParts(input)
  if (!parts) return ''
  return toDayKey(parts.year, parts.month, parts.day)
}

function formatMonthTitle(year, month) {
  return `${year}年${`${month}`.padStart(2, '0')}月`
}

function getChinaMonthDays(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function buildMonthOptions() {
  const now = toChinaParts(Date.now())
  const list = []
  for (let offset = -1; offset <= 2; offset += 1) {
    const monthBase = now.month + offset
    const year = now.year + Math.floor((monthBase - 1) / 12)
    const month = ((monthBase - 1) % 12) + 1
    list.push({
      key: `${year}-${`${month}`.padStart(2, '0')}`,
      year,
      month,
      label: formatMonthTitle(year, month),
      shortLabel: `${month}月`,
    })
  }
  return list
}

export default {
  data() {
    const options = buildMonthOptions()
    const now = toChinaParts(Date.now())
    const currentKey = `${now.year}-${`${now.month}`.padStart(2, '0')}`
    const currentIndex = Math.max(0, options.findIndex((item) => item.key === currentKey))
    const current = options[currentIndex] || options[0] || { year: 0, month: 0, key: '' }
    return {
      loading: false,
      monthOptions: options,
      monthIndex: currentIndex,
      monthYear: current.year,
      month: current.month,
      monthKey: current.key,
      calendarDays: [],
      dayMap: {},
      selectedDayKey: '',
      marketRules: [],
      serverTimestamp: Date.now(),
      weekLabels: WEEK_LABELS,
      touchStartX: 0,
      touchStartY: 0,
    }
  },

  computed: {
    monthPickerRange() {
      return this.monthOptions.map((item) => item.label)
    },

    monthTitle() {
      if (this.monthYear && this.month) return formatMonthTitle(this.monthYear, this.month)
      return '当月'
    },

    monthGrid() {
      if (!this.monthYear || !this.month) return []
      const totalDays = getChinaMonthDays(this.monthYear, this.month)
      const firstWeekday = new Date(chinaDateToMs(this.monthYear, this.month, 1, 0, 0)).getUTCDay()
      const cells = []
      for (let i = 0; i < firstWeekday; i += 1) {
        cells.push({ key: `empty_${i}`, isPlaceholder: true })
      }
      const todayKey = toChinaDayKey(this.serverTimestamp || Date.now())
      for (let day = 1; day <= totalDays; day += 1) {
        const dayKey = toDayKey(this.monthYear, this.month, day)
        const dayData = this.dayMap[dayKey] || { count: 0, sourceCount: { market: 0, activity: 0, calendarEvent: 0 } }
        cells.push({
          key: dayKey,
          isPlaceholder: false,
          day,
          dayKey,
          count: Number(dayData.count || 0),
          sourceCount: dayData.sourceCount || { market: 0, activity: 0, calendarEvent: 0 },
          isToday: dayKey === todayKey,
        })
      }
      return cells
    },

    selectedDayDisplay() {
      if (!this.selectedDayKey) return '选择日期查看详情'
      const day = this.dayMap[this.selectedDayKey]
      return day?.displayDate || this.selectedDayKey
    },

    selectedDayItems() {
      if (!this.selectedDayKey) return []
      const day = this.dayMap[this.selectedDayKey]
      return Array.isArray(day?.items) ? day.items : []
    },
  },

  onShow() {
    this.loadCalendar()
  },

  methods: {
    onMonthChange(e) {
      const idx = Number(e?.detail?.value || 0)
      this.monthIndex = Number.isFinite(idx) ? idx : 0
      const selected = this.monthOptions[this.monthIndex] || this.monthOptions[0]
      if (!selected) return
      this.monthYear = selected.year
      this.month = selected.month
      this.monthKey = selected.key
      this.loadCalendar()
    },

    switchMonth(idx) {
      const target = Number(idx)
      if (!Number.isInteger(target) || target < 0 || target >= this.monthOptions.length) return
      if (target === this.monthIndex) return
      this.monthIndex = target
      const selected = this.monthOptions[this.monthIndex]
      if (!selected) return
      this.monthYear = selected.year
      this.month = selected.month
      this.monthKey = selected.key
      this.loadCalendar()
    },

    onCalendarTouchStart(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0]
      if (!touch) return
      this.touchStartX = Number(touch.clientX || 0)
      this.touchStartY = Number(touch.clientY || 0)
    },

    onCalendarTouchEnd(e) {
      const touch = e?.changedTouches?.[0] || e?.touches?.[0]
      if (!touch) return
      const endX = Number(touch.clientX || 0)
      const endY = Number(touch.clientY || 0)
      const dx = endX - this.touchStartX
      const dy = endY - this.touchStartY
      if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) return
      if (dx < 0) this.switchMonth(this.monthIndex + 1)
      else this.switchMonth(this.monthIndex - 1)
    },

    summarizeDayItems(items = []) {
      const sourceCount = { market: 0, activity: 0, calendarEvent: 0 }
      items.forEach((item) => {
        if (item.source === 'market') sourceCount.market += 1
        else if (item.source === 'activity') sourceCount.activity += 1
        else sourceCount.calendarEvent += 1
      })
      return sourceCount
    },

    rebuildDayMap() {
      const map = {}
      ;(this.calendarDays || []).forEach((day) => {
        map[day.dayKey] = {
          ...day,
          sourceCount: day.sourceCount || this.summarizeDayItems(day.items || []),
          items: Array.isArray(day.items) ? day.items : [],
        }
      })
      this.dayMap = map
    },

    syncSelectedDay() {
      if (this.selectedDayKey && this.dayMap[this.selectedDayKey]) return
      const todayKey = toChinaDayKey(this.serverTimestamp || Date.now())
      if (String(todayKey || '').startsWith(`${this.monthYear}-${`${this.month}`.padStart(2, '0')}`)) {
        this.selectedDayKey = todayKey
        return
      }
      const keys = Object.keys(this.dayMap || {}).sort()
      if (keys.length > 0) {
        this.selectedDayKey = keys[0]
        return
      }
      this.selectedDayKey = toDayKey(this.monthYear, this.month, 1)
    },

    selectDay(dayKey = '') {
      if (!dayKey) return
      this.selectedDayKey = dayKey
    },

    async loadCalendar() {
      this.loading = true
      try {
        const res = await callCloud('getOfficialCalendar', {
          mode: 'month',
          cityId: 'dali',
          year: this.monthYear,
          month: this.month,
        })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '加载失败', icon: 'none' })
          this.calendarDays = []
          this.dayMap = {}
          this.marketRules = []
          return
        }
        this.serverTimestamp = Number(res?.serverTimestamp || Date.now())
        this.calendarDays = Array.isArray(res.calendarDays) ? res.calendarDays : []
        this.marketRules = Array.isArray(res.marketRules) ? res.marketRules : []
        const cloudMonthMeta = res?.monthMeta || {}
        if (Number.isFinite(Number(cloudMonthMeta.year)) && Number.isFinite(Number(cloudMonthMeta.month))) {
          this.monthYear = Number(cloudMonthMeta.year)
          this.month = Number(cloudMonthMeta.month)
          this.monthKey = cloudMonthMeta.monthKey || `${this.monthYear}-${`${this.month}`.padStart(2, '0')}`
          const hitIndex = this.monthOptions.findIndex((item) => item.key === this.monthKey)
          if (hitIndex >= 0) this.monthIndex = hitIndex
        }
        this.rebuildDayMap()
        this.syncSelectedDay()
      } catch (e) {
        this.calendarDays = []
        this.dayMap = {}
        this.marketRules = []
        uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    sourceLabel(source = '') {
      if (source === 'market') return '固定集市'
      if (source === 'activity') return '官方活动'
      return '官方排期'
    },

    badgeClass(source = '') {
      if (source === 'market') return 'detail-badge--market'
      if (source === 'activity') return 'detail-badge--activity'
      return 'detail-badge--plan'
    },

    goDetail(activityId) {
      if (!activityId) return
      uni.navigateTo({ url: `/pages/detail/index?id=${activityId}` })
    },

    launchWithMarket(item = {}) {
      const title = `${item.title || '集市'} · 一起去`
      const description = `${item.note || '无需报名，可直接前往'}\n想一起去的小伙伴可以报名结伴。`
      const address = item.location?.address || ''
      const lat = Number(item.location?.lat)
      const lng = Number(item.location?.lng)
      const startIso = new Date(item.startTime).toISOString()
      const payload = {
        title,
        description,
        address,
        categoryId: item.categoryId || 'social',
        startTime: startIso,
        lat: Number.isFinite(lat) ? lat : '',
        lng: Number.isFinite(lng) ? lng : '',
      }
      uni.setStorageSync('dali_market_prefill_v1', payload)
      uni.switchTab({ url: '/pages/publish/index' })
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
  opacity: 0.92;
}
.toolbar {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
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

.month-tabs {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
}
.month-tab {
  flex: 1;
  text-align: center;
  background: #EEF3F8;
  color: #475467;
  border-radius: 18rpx;
  padding: 8rpx 0;
  font-size: 22rpx;
}
.month-tab--active {
  background: #1A3C5E;
  color: #fff;
  font-weight: 700;
}

.market-board {
  margin-top: 10rpx;
  background: #fff;
  border-radius: 14rpx;
  padding: 14rpx;
}
.market-board-title {
  display: block;
  font-size: 22rpx;
  color: #1A3C5E;
  font-weight: 700;
}
.market-board-empty {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #667085;
}
.market-rule-list {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.market-rule-item {
  background: #F8FAFC;
  border-radius: 10rpx;
  padding: 10rpx;
}
.market-rule-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}
.market-rule-name {
  font-size: 23rpx;
  color: #101828;
  font-weight: 600;
}
.market-rule-time {
  font-size: 20rpx;
  color: #1D4F7A;
  background: #E8F1FA;
  border-radius: 10rpx;
  padding: 4rpx 8rpx;
}
.market-rule-meta {
  margin-top: 2rpx;
  display: block;
  font-size: 20rpx;
  color: #667085;
}

.calendar-card {
  margin-top: 10rpx;
  background: #fff;
  border-radius: 14rpx;
  padding: 16rpx;
}
.week-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 10rpx;
}
.week-item {
  text-align: center;
  font-size: 22rpx;
  color: #667085;
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}
.grid-cell {
  min-height: 82rpx;
}
.day-placeholder {
  height: 82rpx;
}
.day-cell {
  height: 82rpx;
  background: #F8FAFC;
  border-radius: 10rpx;
  padding: 8rpx 6rpx 6rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
}
.day-cell--active {
  background: #E9F2FB;
  border: 1rpx solid #7FAED7;
}
.day-cell--today .day-num {
  color: #1A3C5E;
  font-weight: 700;
}
.day-num {
  font-size: 22rpx;
  color: #344054;
}
.day-dots {
  margin-top: 4rpx;
  min-height: 10rpx;
  display: flex;
  gap: 4rpx;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  display: inline-block;
  border: 1rpx solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1rpx rgba(16, 24, 40, 0.08);
}
.dot-market { background: #F59E0B; }
.dot-activity { background: #0EA5E9; }
.dot-plan { background: #10B981; }
.day-count {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #667085;
}
.legend-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.legend-item {
  font-size: 20rpx;
  color: #667085;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.detail-panel {
  margin-top: 14rpx;
  background: #fff;
  border-radius: 14rpx;
  padding: 18rpx;
}
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-title {
  font-size: 28rpx;
  color: #1D2939;
  font-weight: 700;
}
.detail-sub {
  font-size: 22rpx;
  color: #667085;
}
.detail-list {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.detail-item {
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 14rpx;
}
.detail-main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.detail-badge {
  align-self: flex-start;
  font-size: 20rpx;
  border-radius: 8rpx;
  padding: 4rpx 10rpx;
}
.detail-badge--market {
  color: #92400E;
  background: #FEF3C7;
}
.detail-badge--activity {
  color: #075985;
  background: #E0F2FE;
}
.detail-badge--plan {
  color: #065F46;
  background: #DCFCE7;
}
.detail-item-title {
  font-size: 28rpx;
  color: #101828;
}
.detail-meta {
  font-size: 22rpx;
  color: #667085;
}
.detail-note {
  margin-top: 2rpx;
  font-size: 22rpx;
  color: #B45309;
}
.detail-actions {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
}
.action-btn {
  margin: 0;
  height: 52rpx;
  line-height: 52rpx;
  border-radius: 26rpx;
  border: none;
  background: #EEF4FB;
  color: #1A3C5E;
  font-size: 22rpx;
}
.action-btn::after { border: none; }
.action-btn--launch {
  background: #1A3C5E;
  color: #fff;
}
.empty {
  margin-top: 12rpx;
  text-align: center;
  color: #667085;
  font-size: 24rpx;
}
</style>
