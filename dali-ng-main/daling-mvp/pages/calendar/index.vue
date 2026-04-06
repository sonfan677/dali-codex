<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">官方活动日历</text>
      <text class="hero-sub">{{ monthTitle }} · 官方主办 / 官方推荐 / 官方预告 + 固定集市</text>
    </view>

    <view class="market-board">
      <text class="market-board-title">固定集市（公开免费）</text>
      <view v-if="marketRules.length === 0" class="market-board-empty">暂无固定集市配置</view>
      <view v-else class="market-mini-wrap">
        <view class="market-chip-row">
          <view
            v-for="rule in marketRules"
            :key="rule.id"
            class="market-chip"
            :class="{ 'market-chip--active': selectedMarketId === rule.id }"
            @tap="toggleMarketFocus(rule.id)"
          >
            {{ marketShortName(rule) }}
          </view>
        </view>
        <view v-if="activeMarketRule" class="market-expand-card">
          <view class="market-expand-head">
            <text class="market-expand-title">{{ activeMarketRule.title }}</text>
            <text class="market-expand-state">已高亮月历</text>
          </view>
          <text class="market-expand-line">频次：{{ activeMarketRule.scheduleText }}</text>
          <text class="market-expand-line">地点：{{ activeMarketRule.location?.address || '地点待定' }}</text>
          <text class="market-expand-line">说明：{{ activeMarketRule.note || '无需报名，可直接前往。' }}</text>
        </view>
        <text class="market-mini-tip">点击集市名称可展开更多信息，并联动高亮月历中的对应标签</text>
      </view>
    </view>

    <view class="calendar-card" @touchstart="onCalendarTouchStart" @touchend="onCalendarTouchEnd">
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
            <view class="day-head">
              <text class="day-num">{{ cell.day }}</text>
              <text v-if="cell.count > 0" class="day-count">{{ cell.count }}</text>
            </view>
            <view class="day-labels">
              <view
                v-for="tag in cell.previewTags"
                :key="`${cell.dayKey}_${tag.key}`"
                class="cell-tag"
                :class="cellTagClass(tag)"
              >
                {{ tag.text }}
              </view>
              <text v-if="cell.moreCount > 0" class="day-more">+{{ cell.moreCount }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="legend-row">
        <view class="legend-item"><text class="legend-pill legend-pill--official">官方主办</text></view>
        <view class="legend-item"><text class="legend-pill legend-pill--recommended">官方推荐</text></view>
        <view class="legend-item"><text class="legend-pill legend-pill--preview">官方预告</text></view>
        <view class="legend-item"><text class="legend-pill legend-pill--market">固定集市</text></view>
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
            <view class="detail-badges">
              <text class="detail-badge" :class="badgeClass(item.source)">{{ sourceLabel(item.source) }}</text>
              <text
                v-if="item.isRecommended && item.source !== 'official_recommended'"
                class="detail-badge detail-badge--recommend-extra"
              >官方推荐</text>
            </view>
            <text class="detail-item-title">{{ item.title }}</text>
            <text class="detail-meta">{{ detailTimeText(item) }} · {{ item.categoryLabel || '其他' }}</text>
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
const MARKET_SHORT_DICT = {
  sanyuejie_market: '三月街',
  chuangdanchang_market: '床单厂',
  yinqiao_market: '银桥',
}
const TAG_SHORT_DICT = {
  大理三月街集市: '三月街',
  床单厂周末市集: '床单厂',
  银桥集市: '银桥',
  官方活动: '官主办',
  官方推荐活动: '官推荐',
  官方预告: '官预告',
}

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
  for (let offset = 0; offset <= 2; offset += 1) {
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
      selectedMarketId: '',
      serverTimestamp: Date.now(),
      weekLabels: WEEK_LABELS,
      touchStartX: 0,
      touchStartY: 0,
    }
  },

  computed: {
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
        const dayData = this.dayMap[dayKey] || {
          count: 0,
          sourceCount: { market: 0, officialActivity: 0, officialRecommended: 0, officialPreview: 0 },
          items: [],
        }
        const previewTags = this.buildCellPreviewTags(dayData.items || [])
        cells.push({
          key: dayKey,
          isPlaceholder: false,
          day,
          dayKey,
          count: Number(dayData.count || 0),
          sourceCount: dayData.sourceCount || {
            market: 0,
            officialActivity: 0,
            officialRecommended: 0,
            officialPreview: 0,
          },
          previewTags,
          moreCount: Math.max(0, Number(dayData.count || 0) - previewTags.length),
          isToday: dayKey === todayKey,
        })
      }
      while (cells.length % 7 !== 0) {
        cells.push({ key: `tail_empty_${cells.length}`, isPlaceholder: true })
      }
      while (cells.length < 42) {
        cells.push({ key: `full_empty_${cells.length}`, isPlaceholder: true })
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

    activeMarketRule() {
      if (!this.selectedMarketId) return null
      return this.marketRules.find((rule) => rule.id === this.selectedMarketId) || null
    },
  },

  onShow() {
    this.loadCalendar()
  },

  methods: {
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
      const sourceCount = { market: 0, officialActivity: 0, officialRecommended: 0, officialPreview: 0 }
      items.forEach((item) => {
        if (item.source === 'market') sourceCount.market += 1
        else if (item.source === 'official_activity') sourceCount.officialActivity += 1
        else if (item.source === 'official_recommended') sourceCount.officialRecommended += 1
        else if (item.source === 'official_preview') sourceCount.officialPreview += 1
      })
      return sourceCount
    },

    compactTitle(text = '', max = 5) {
      const value = String(text || '').trim()
      if (!value) return '活动'
      if (value.length <= max) return value
      if (max <= 1) return '…'
      return `${value.slice(0, max - 1)}…`
    },

    marketShortName(rule = {}) {
      const id = String(rule.id || '')
      const title = String(rule.title || '')
      const direct = MARKET_SHORT_DICT[id]
      if (direct) return direct
      const dict = TAG_SHORT_DICT[title]
      if (dict) return dict
      return this.compactTitle(title.replace(/(大理|集市|市集)/g, ''), 5)
    },

    shortTagText(item = {}) {
      const source = String(item.source || '')
      if (source === 'market') {
        const m = MARKET_SHORT_DICT[String(item.marketId || '')]
        if (m) return this.compactTitle(m, 5)
      }
      if (source === 'official_recommended') return '官推荐'
      if (source === 'official_activity') return '官主办'
      if (source === 'official_preview') return '官预告'
      const title = String(item.title || '')
      const hit = TAG_SHORT_DICT[title]
      if (hit) return this.compactTitle(hit, 5)
      return this.compactTitle(title, 5)
    },

    buildCellPreviewTags(items = []) {
      const safe = Array.isArray(items) ? items : []
      const picked = safe.slice(0, 3)
      if (this.selectedMarketId) {
        const focused = safe.find((item) => item.source === 'market' && item.marketId === this.selectedMarketId)
        if (focused) {
          const exists = picked.some((item) => item._id === focused._id)
          if (!exists) {
            if (picked.length >= 3) picked[picked.length - 1] = focused
            else picked.push(focused)
          }
        }
      }
      return picked.map((item, idx) => ({
        key: `${item.source || 'x'}_${item._id || idx}_${idx}`,
        source: item.source || '',
        isRecommended: !!item.isRecommended,
        marketId: item.marketId || '',
        text: this.shortTagText(item),
      }))
    },

    rebuildDayMap() {
      const map = {}
      ;(this.calendarDays || []).forEach((day) => {
        const safeItems = Array.isArray(day.items) ? [...day.items] : []
        safeItems.sort((a, b) => {
          const wa = Number(a?.sortWeight || 99)
          const wb = Number(b?.sortWeight || 99)
          if (wa !== wb) return wa - wb
          return new Date(a?.startTime || 0).getTime() - new Date(b?.startTime || 0).getTime()
        })
        map[day.dayKey] = {
          ...day,
          sourceCount: day.sourceCount || this.summarizeDayItems(safeItems),
          items: safeItems,
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
      if (source === 'official_recommended') return '官方推荐'
      if (source === 'official_activity') return '官方主办'
      return '官方预告'
    },

    badgeClass(source = '') {
      if (source === 'market') return 'detail-badge--market'
      if (source === 'official_recommended') return 'detail-badge--recommended'
      if (source === 'official_activity') return 'detail-badge--official'
      return 'detail-badge--preview'
    },

    cellTagClass(tag = {}) {
      const classes = []
      if (tag.isRecommended) classes.push('cell-tag--recommended')
      else if (tag.source === 'market') classes.push('cell-tag--market')
      else if (tag.source === 'official_activity') classes.push('cell-tag--official')
      else if (tag.source === 'official_preview') classes.push('cell-tag--preview')
      else classes.push('cell-tag--official')

      if (this.selectedMarketId && tag.source === 'market') {
        if (String(tag.marketId || '') === this.selectedMarketId) classes.push('cell-tag--market-focus')
        else classes.push('cell-tag--market-dim')
      }
      return classes.join(' ')
    },

    toggleMarketFocus(ruleId = '') {
      const next = String(ruleId || '')
      if (!next) return
      this.selectedMarketId = this.selectedMarketId === next ? '' : next
    },

    detailTimeText(item = {}) {
      if (item.source === 'market') return '全天'
      const startText = String(item.startText || '--:--')
      const endText = String(item.endText || '--:--')
      return `${startText} - ${endText}`
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
.month-tabs {
  display: flex;
  gap: 10rpx;
  margin-bottom: 12rpx;
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
  margin-top: 12rpx;
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
.market-mini-wrap {
  margin-top: 10rpx;
}
.market-chip-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.market-chip {
  font-size: 21rpx;
  color: #1D4F7A;
  background: #EAF2FB;
  border: 1rpx solid #D6E5F6;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}
.market-chip--active {
  color: #fff;
  background: #1D4F7A;
  border-color: #1D4F7A;
}
.market-expand-card {
  margin-top: 10rpx;
  background: #F8FAFC;
  border-radius: 12rpx;
  padding: 12rpx;
}
.market-expand-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.market-expand-title {
  font-size: 23rpx;
  color: #101828;
  font-weight: 700;
}
.market-expand-state {
  font-size: 20rpx;
  color: #0369A1;
  background: #E0F2FE;
  border-radius: 999rpx;
  padding: 2rpx 10rpx;
}
.market-expand-line {
  margin-top: 4rpx;
  display: block;
  font-size: 20rpx;
  color: #667085;
}
.market-mini-tip {
  margin-top: 8rpx;
  display: block;
  font-size: 20rpx;
  color: #98A2B3;
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
  grid-template-rows: repeat(6, 168rpx);
  grid-auto-rows: 168rpx;
  gap: 0;
  border-top: 1rpx solid #EEF2F6;
  border-left: 1rpx solid #EEF2F6;
}
.grid-cell {
  height: 168rpx;
}
.day-placeholder {
  height: 100%;
  border-right: 1rpx solid #EEF2F6;
  border-bottom: 1rpx solid #EEF2F6;
}
.day-cell {
  height: 100%;
  background: #fff;
  border-radius: 0;
  padding: 8rpx 6rpx 8rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  position: relative;
  border-right: 1rpx solid #EEF2F6;
  border-bottom: 1rpx solid #EEF2F6;
}
.day-cell--active {
  background: #EEF6FF;
}
.day-cell--today .day-num {
  color: #1A3C5E;
  font-weight: 700;
}
.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.day-num {
  font-size: 22rpx;
  color: #344054;
}
.day-count {
  font-size: 18rpx;
  color: #667085;
}
.day-labels {
  min-height: 120rpx;
  max-height: 120rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  overflow: hidden;
}
.cell-tag {
  font-size: 18rpx;
  color: #fff;
  border-radius: 8rpx;
  padding: 2rpx 8rpx;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-tag--market {
  background: #F59E0B;
}
.cell-tag--recommended {
  background: #E11D48;
}
.cell-tag--official {
  background: #3B82F6;
}
.cell-tag--preview {
  background: #8B5CF6;
}
.cell-tag--market-focus {
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, 0.9), 0 0 0 2rpx rgba(146, 64, 14, 0.35);
  transform: translateZ(0);
}
.cell-tag--market-dim {
  opacity: 0.6;
}
.day-more {
  font-size: 18rpx;
  color: #667085;
  line-height: 1.4;
}
.legend-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}
.legend-item {
  display: flex;
  align-items: center;
}
.legend-pill {
  font-size: 19rpx;
  border-radius: 999rpx;
  padding: 3rpx 12rpx;
  color: #fff;
}
.legend-pill--official {
  background: #3B82F6;
}
.legend-pill--recommended {
  background: #E11D48;
}
.legend-pill--preview {
  background: #8B5CF6;
}
.legend-pill--market {
  background: #F59E0B;
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
.detail-badges {
  display: flex;
  align-items: center;
  gap: 8rpx;
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
.detail-badge--official {
  color: #1E40AF;
  background: #DBEAFE;
}
.detail-badge--recommended {
  color: #9F1239;
  background: #FFE4E6;
}
.detail-badge--preview {
  color: #5B21B6;
  background: #EDE9FE;
}
.detail-badge--recommend-extra {
  color: #9F1239;
  background: #FFE4E6;
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
