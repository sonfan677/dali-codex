<template>
  <view class="page">

    <view class="header">
      <text class="title">管理后台</text>
      <text class="subtitle">{{ adminRoleLabel }} · {{ cityIdLabel }}</text>
      <view class="mode-switch-row">
        <view
          class="chip chip--sort"
          :class="{ 'chip--active': adminUiMode === 'lite' }"
          @tap="setAdminUiMode('lite')"
        >精简模式</view>
        <view
          class="chip chip--sort"
          :class="{ 'chip--active': adminUiMode === 'pro' }"
          @tap="setAdminUiMode('pro')"
        >完整模式</view>
      </view>
    </view>

    <view v-if="hasAccess && !loading" class="summary-grid">
      <view v-for="item in adminSummaryCards" :key="item.key" class="summary-card">
        <text class="summary-value">{{ item.value }}</text>
        <text class="summary-label">{{ item.label }}</text>
        <text class="summary-sub">{{ item.sub }}</text>
      </view>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'todo' }"
        @tap="activeTab = 'todo'"
      >待办中心 {{ todoTotalCount > 0 ? '(' + todoTotalCount + ')' : '' }}</view>
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'verify' }"
        @tap="activeTab = 'verify'"
      >待审核认证 {{ pendingVerifyList.length > 0 ? '(' + pendingVerifyList.length + ')' : '' }}</view>
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'reports' }"
        @tap="activeTab = 'reports'"
      >举报记录 {{ reportList.length > 0 ? '(' + reportList.length + ')' : '' }}</view>
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'activities' }"
        @tap="activeTab = 'activities'"
      >活动管理</view>
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'logs' }"
        @tap="activeTab = 'logs'"
      >操作记录</view>
    </view>

    <view v-if="!hasAccess" class="empty">
      <text class="empty-text">无管理员权限</text>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="center-tip">
      <text>加载中...</text>
    </view>

    <view v-else class="content">

      <view class="toolbar">
        <input
          v-model="searchKeyword"
          class="search-input"
          :placeholder="searchPlaceholder"
          maxlength="30"
        />
      </view>

      <scroll-view
        v-if="filterOptions.length > 0"
        scroll-x
        class="chip-scroll"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in filterOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip--active': item.value === activeFilter }"
            @tap="activeFilter = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'reports'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in reportSortOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === reportSort }"
            @tap="reportSort = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logTimeOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logTimeRange }"
            @tap="logTimeRange = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <view
        v-if="activeTab === 'logs' && logTimeRange === 'custom'"
        class="date-range-panel"
      >
        <picker mode="date" :value="logCustomStartDate" @change="onPickLogStartDate">
          <view class="date-pill">开始日期：{{ logCustomStartDate || '--' }}</view>
        </picker>
        <picker mode="date" :value="logCustomEndDate" @change="onPickLogEndDate">
          <view class="date-pill">结束日期：{{ logCustomEndDate || '--' }}</view>
        </picker>
      </view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logViewOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logViewMode }"
            @tap="logViewMode = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logSortOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logSort }"
            @tap="logSort = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logOperatorOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logOperator }"
            @tap="logOperator = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logRoleOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logRole }"
            @tap="logRole = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <!-- 待办中心 -->
      <template v-if="activeTab === 'todo'">
        <view class="card">
          <view class="title-row">
            <text class="card-title">今日待办摘要</text>
            <text class="card-openid">{{ todoTodaySummary.dateLabel }}</text>
          </view>
          <view class="card-actions card-actions--single">
            <button class="action-btn action-btn--detail" @tap="copyTodoBrief">复制今日简报</button>
            <button class="action-btn action-btn--detail" @tap="copyLatestArchivedReport">复制最近归档</button>
          </view>
          <view class="todo-summary-grid">
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ todoTodaySummary.newReportsToday }}</text>
              <text class="logs-overview-label">今日新增举报</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ todoTodaySummary.closedToday }}</text>
              <text class="logs-overview-label">今日已闭环</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ todoTodaySummary.overdueUnhandled }}</text>
              <text class="logs-overview-label">超时未处理</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ todoTodaySummary.upcoming24h }}</text>
              <text class="logs-overview-label">24h即将开始</text>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">运营自动巡检（3.2）</text>
            <text class="status-pill" :class="opsPatrolLevelPillClass(opsPatrolSummary.level)">{{ opsPatrolLevelText(opsPatrolSummary.level) }}</text>
          </view>
          <view class="card-actions card-actions--single">
            <button
              class="action-btn action-btn--detail"
              :disabled="opsPatrolRunning"
              @tap="runOpsPatrolNow"
            >{{ opsPatrolRunning ? '巡检中...' : '立即巡检' }}</button>
          </view>
          <text class="card-openid">
            最近巡检：{{ opsPatrolSummary.checkedAt ? formatTime(opsPatrolSummary.checkedAt) : '--' }} · 城市 {{ opsPatrolSummary.cityId || cityId }}
          </text>
          <view class="logs-overview">
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ opsPatrolSummary.score || 0 }}</text>
              <text class="logs-overview-label">健康风险分</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ opsPatrolSummary.triggeredCount || 0 }}</text>
              <text class="logs-overview-label">触发项</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ opsPatrolSummary.alertCount24h || 0 }}</text>
              <text class="logs-overview-label">24h巡检告警</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ opsPatrolSummary.supplyAlertLevel || 'normal' }}</text>
              <text class="logs-overview-label">供给预警等级</text>
            </view>
          </view>
          <text class="card-openid">
            超时举报：{{ opsPatrolSummary.reportOverdueCount || 0 }} · 超时认证：{{ opsPatrolSummary.verifyOverdueCount || 0 }} · 实名失败(24h)：{{ opsPatrolSummary.officialVerifyFailedCount || 0 }}
          </text>
          <view v-if="opsPatrolAlertList.length" class="todo-item">
            <text class="card-sub">最近巡检告警</text>
            <text
              v-for="alert in opsPatrolAlertList"
              :key="`ops-alert-${alert._id}`"
              class="card-openid"
            >{{ formatTime(alert.createdAt) }} · {{ alert.reason || alert.result || '巡检发现风险' }}</text>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">官方实名审计看板</text>
            <text class="status-pill status-pill--log">待回调 {{ officialVerifyAuditSummary.pendingOfficialCount }}</text>
          </view>
          <view class="card-actions card-actions--single">
            <button
              class="action-btn action-btn--detail"
              :disabled="officialCsvExporting"
              @tap="exportOfficialVerifyCsv"
            >导出实名报表CSV</button>
          </view>
          <view class="logs-overview">
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.total }}</text>
              <text class="logs-overview-label">回调总数</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.success }}</text>
              <text class="logs-overview-label">成功</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.failed }}</text>
              <text class="logs-overview-label">失败</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.retriable }}</text>
              <text class="logs-overview-label">可重试</text>
            </view>
          </view>
          <view class="logs-overview">
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.passRate == null ? '--' : Math.round(officialVerifyAuditSummary.passRate * 100) + '%' }}</text>
              <text class="logs-overview-label">通过率</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.retryUserCount || 0 }}</text>
              <text class="logs-overview-label">重试用户</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.retryConversionRate == null ? '--' : Math.round(officialVerifyAuditSummary.retryConversionRate * 100) + '%' }}</text>
              <text class="logs-overview-label">重试转化率</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ officialVerifyAuditSummary.immediateAlertCount24h || 0 }}</text>
              <text class="logs-overview-label">24h即时告警</text>
            </view>
          </view>
          <view class="todo-item">
            <text class="card-openid">
              阈值告警（24h）：{{ officialVerifyAuditSummary.thresholdAlertCount24h || 0 }} · 重放拦截：{{ officialVerifyAuditSummary.replayBlocked || 0 }} · 签名失败：{{ officialVerifyAuditSummary.signatureFailed || 0 }}
            </text>
          </view>
          <view v-if="officialVerifyAuditSummary.topFailReasons && officialVerifyAuditSummary.topFailReasons.length" class="todo-item">
            <text class="card-sub">失败原因 Top</text>
            <text
              v-for="item in officialVerifyAuditSummary.topFailReasons"
              :key="`fail-top-${item.reason}`"
              class="card-openid"
            >{{ item.reason }} · {{ item.count }}次</text>
          </view>
          <view v-if="officialVerifyAlertList.length" class="todo-item">
            <text class="card-sub">最近告警</text>
            <text
              v-for="alert in officialVerifyAlertList"
              :key="`alert-${alert._id}`"
              class="card-openid"
            >{{ formatTime(alert.createdAt) }} · {{ alert.action === 'official_verify_alert_immediate' ? '[即时]' : '[阈值]' }} {{ alert.reason || alert.result || '官方实名异常告警' }}</text>
          </view>
          <view v-if="officialVerifyRecentList.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无官方实名回调记录</text>
          </view>
          <view v-for="item in officialVerifyRecentList" :key="`ova-${item._id}`" class="todo-item">
            <view class="title-row">
              <text class="card-sub">{{ officialAuditStatusText(item) }}</text>
              <text class="card-openid">{{ formatTime(item.updatedAt || item.createdAt) }}</text>
            </view>
            <text class="card-openid">
              用户：{{ shortOpenid(item.userOpenid || item.openid) }} · 结果：{{ item.result || '--' }}
            </text>
            <text class="card-openid">重试次数：{{ item.retryCount || 0 }} · 键：{{ (item.idempotencyKey || '').slice(0, 24) }}</text>
            <view class="card-actions card-actions--single">
              <button
                v-if="item.retriable"
                class="action-btn action-btn--detail"
                :disabled="isOfficialRetrying(item.userOpenid || item.openid)"
                @tap="retryOfficialVerifyFromAudit(item)"
              >重试失败项</button>
            </view>
          </view>
        </view>

        <view v-if="isLiteMode" class="todo-batch-toolbar">
          <button class="mini-btn mini-btn--ghost" @tap="toggleTodoAdvanced">
            {{ showTodoAdvanced ? '收起高级区' : '展开高级区（日报归档/SLA细分）' }}
          </button>
        </view>

        <view v-if="!isLiteMode || showTodoAdvanced" class="card">
          <view class="title-row">
            <text class="card-title">运营日报自动归档（近7天）</text>
            <text class="status-pill status-pill--log">{{ dailyReportHistoryPreview.length }}</text>
          </view>
          <view class="todo-filter-row">
            <view class="todo-filter-copy">
              <text class="todo-filter-title">自动归档开关</text>
              <text class="todo-filter-sub">{{ dailyReportAutoEnabled ? '已开启：每天首次进入后台自动归档一条' : '已关闭自动归档' }}</text>
            </view>
            <switch
              class="todo-filter-switch"
              :checked="dailyReportAutoEnabled"
              color="#1A3C5E"
              @change="onDailyReportAutoSwitchChange"
            />
          </view>
          <view v-if="dailyReportHistoryPreview.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无日报归档</text>
          </view>
          <view v-for="item in dailyReportHistoryPreview" :key="item.dateKey" class="todo-item">
            <view class="title-row">
              <text class="card-sub">{{ item.dateLabel }}</text>
              <text class="card-openid">风险 {{ item.overdueTotal }} · 闭环率 {{ item.withinSlaRate }}</text>
            </view>
            <text class="card-openid">新增举报 {{ item.newReportsToday }} · 已闭环 {{ item.closedToday }} · 24h活动 {{ item.upcoming24h }}</text>
            <view class="card-actions card-actions--single">
              <button class="action-btn action-btn--detail" @tap="copyArchivedReport(item.dateKey)">复制该日简报</button>
            </view>
          </view>
        </view>

        <view class="todo-filter-row">
          <view class="todo-filter-copy">
            <text class="todo-filter-title">只看超时/紧急</text>
            <text class="todo-filter-sub">{{ todoOnlyOverdue ? `当前仅展示风险项（${todoViewTotalCount}）` : '关闭时展示全部待办' }}</text>
          </view>
          <switch
            class="todo-filter-switch"
            :checked="todoOnlyOverdue"
            color="#1A3C5E"
            @change="onTodoOverdueSwitchChange"
          />
        </view>
        <view class="todo-filter-row">
          <view class="todo-filter-copy">
            <text class="todo-filter-title">自动风险提醒</text>
            <text class="todo-filter-sub">{{ todoAutoRemindEnabled ? '开启后每天首次进入后台自动提醒风险待办' : '已关闭自动提醒' }}</text>
          </view>
          <switch
            class="todo-filter-switch"
            :checked="todoAutoRemindEnabled"
            color="#1A3C5E"
            @change="onTodoAutoRemindSwitchChange"
          />
        </view>
        <view class="todo-filter-row">
          <view class="todo-filter-copy">
            <text class="todo-filter-title">处理后通知（可选）</text>
            <text class="todo-filter-sub">{{ todoNotifyAfterActionEnabled ? '开启：处理后会尝试触发取消通知（失败不影响处理）' : '关闭：仅更新状态与记录操作日志' }}</text>
          </view>
          <switch
            class="todo-filter-switch"
            :checked="todoNotifyAfterActionEnabled"
            color="#1A3C5E"
            @change="onTodoNotifySwitchChange"
          />
        </view>
        <view class="todo-sla-row">
          <text class="todo-filter-sub">SLA 阈值</text>
          <view class="chip-row">
            <view
              v-for="item in todoSlaHourOptions"
              :key="`sla_${item}`"
              class="chip chip--sort"
              :class="{ 'chip--active': todoSlaHours === item }"
              @tap="onPickTodoSla(item)"
            >{{ item }}h</view>
          </view>
        </view>

        <view class="logs-overview">
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ todoViewTotalCount }}</text>
            <text class="logs-overview-label">{{ todoOnlyOverdue ? '当前风险待办' : '待办总数' }}</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ overdueTodoCount }}</text>
            <text class="logs-overview-label">超时/紧急</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ displayUpcomingActivityTodoList.length }}</text>
            <text class="logs-overview-label">{{ todoOnlyOverdue ? '2h内紧急活动' : '24h即将开始' }}</text>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">优先处理队列 Top8</text>
            <text class="status-pill status-pill--pending">风险 {{ todoPriorityRiskCount }}</text>
          </view>
          <view v-if="todoPriorityQueue.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无可处理待办</text>
          </view>
          <view v-for="item in todoPriorityQueue" :key="item.queueId" class="todo-item">
            <view class="title-row">
              <view class="inline-badges">
                <text class="mini-pill mini-pill--log">{{ item.typeLabel }}</text>
                <text v-if="item.isRisk" class="mini-pill mini-pill--risk">风险项</text>
              </view>
              <text class="card-openid">{{ item.urgencyText }}</text>
            </view>
            <text class="card-sub">{{ item.title }}</text>
            <text class="card-openid">{{ item.subTitle }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--detail" @tap="goPriorityQueueDetail(item)">定位</button>
              <button
                v-if="item.type === 'report'"
                class="action-btn action-btn--approve"
                :disabled="isHandlingReport(item.raw._id)"
                @tap="handleReportQuick(item.raw)"
              >一键下架</button>
              <button
                v-if="item.type === 'report'"
                class="action-btn action-btn--reject"
                :disabled="isHandlingReport(item.raw._id)"
                @tap="ignoreReportQuick(item.raw)"
              >一键忽略</button>
              <button
                v-if="item.type === 'verify'"
                class="action-btn action-btn--approve"
                @tap="verifyUserQuick(item.raw._openid, 'verify')"
              >一键通过</button>
              <button
                v-if="item.type === 'verify'"
                class="action-btn action-btn--reject"
                @tap="verifyUserQuick(item.raw._openid, 'reject_verify')"
              >一键驳回</button>
              <button
                v-if="item.type === 'activity' && !item.raw.isRecommended"
                class="action-btn action-btn--recommend"
                @tap="recommendActivity(item.raw._id, 'recommend')"
              >推荐</button>
              <button
                v-if="item.type === 'activity' && item.raw.isRecommended"
                class="action-btn action-btn--unrecommend"
                @tap="recommendActivity(item.raw._id, 'unrecommend')"
              >取消推荐</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">待处理举报</text>
            <text class="status-pill status-pill--pending">{{ displayPendingReportTodoList.length }}</text>
          </view>
          <view class="todo-batch-toolbar">
            <button class="mini-btn" @tap="toggleReportBatchMode">{{ reportBatchMode ? '退出批量' : '开启批量' }}</button>
            <view v-if="reportBatchMode" class="todo-batch-actions">
              <button class="mini-btn mini-btn--ghost" @tap="selectAllVisibleReportTodos">全选当前</button>
              <button class="mini-btn mini-btn--ghost" @tap="clearSelectedReportTodos">清空</button>
              <button
                class="mini-btn"
                :disabled="batchSelectedReportCount === 0 || reportBatchProcessing"
                @tap="batchHandleReports('resolve_report_hide')"
              >批量下架({{ batchSelectedReportCount }})</button>
              <button
                class="mini-btn mini-btn--ghost"
                :disabled="batchSelectedReportCount === 0 || reportBatchProcessing"
                @tap="batchHandleReports('resolve_report_ignore')"
              >批量忽略({{ batchSelectedReportCount }})</button>
            </view>
          </view>
          <view v-if="reportBatchMode" class="card-openid">批量模式已开启：已选 {{ batchSelectedReportCount }} 条</view>
          <view v-if="displayPendingReportTodoList.length === 0" class="empty empty--inline">
            <text class="empty-text">{{ todoOnlyOverdue ? '暂无超时举报待办' : '暂无待处理举报' }}</text>
          </view>
          <view
            v-for="item in displayPendingReportTodoList"
            :key="item._id"
            class="todo-item"
            :class="{ 'todo-item--overdue': item.isOverSla }"
          >
            <view class="title-row">
              <view class="todo-report-head">
                <text class="card-sub">{{ item.reason || '举报待处理' }}</text>
                <view class="inline-badges">
                  <text class="mini-pill" :class="reportSeverityPillClass(item.severityLevel)">
                    {{ item.severityLabel }}
                  </text>
                  <text v-if="item.isStartSoon" class="mini-pill mini-pill--risk">即将开始</text>
                </view>
              </view>
              <view class="todo-title-actions">
                <text class="card-openid">已等待 {{ item.waitHoursText }}</text>
                <button
                  v-if="reportBatchMode"
                  class="mini-btn mini-btn--ghost mini-btn--pick"
                  :disabled="reportBatchProcessing"
                  @tap="toggleReportSelection(item._id)"
                >{{ isReportSelected(item._id) ? '已选' : '选择' }}</button>
              </view>
            </view>
            <text class="card-openid">活动：{{ item.targetActivity?.title || item.targetId }}{{ item.startInText ? ` · 距开始 ${item.startInText}` : '' }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--detail" @tap="goActivityDetail(item.targetId)">查看</button>
              <button class="action-btn action-btn--approve" :disabled="isHandlingReport(item._id)" @tap="handleReportQuick(item)">一键下架</button>
              <button class="action-btn action-btn--reject" :disabled="isHandlingReport(item._id)" @tap="ignoreReportQuick(item)">一键忽略</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">待审核认证</text>
            <text class="status-pill status-pill--pending">{{ displayPendingVerifyTodoList.length }}</text>
          </view>
          <view class="todo-batch-toolbar">
            <button class="mini-btn" @tap="toggleVerifyBatchMode">{{ verifyBatchMode ? '退出批量' : '开启批量' }}</button>
            <view v-if="verifyBatchMode" class="todo-batch-actions">
              <button class="mini-btn mini-btn--ghost" @tap="selectAllVisibleVerifyTodos">全选当前</button>
              <button class="mini-btn mini-btn--ghost" @tap="clearSelectedVerifyTodos">清空</button>
              <button
                class="mini-btn"
                :disabled="batchSelectedVerifyCount === 0 || verifyBatchProcessing"
                @tap="batchHandleVerify('verify')"
              >批量通过({{ batchSelectedVerifyCount }})</button>
              <button
                class="mini-btn mini-btn--ghost"
                :disabled="batchSelectedVerifyCount === 0 || verifyBatchProcessing"
                @tap="batchHandleVerify('reject_verify')"
              >批量拒绝({{ batchSelectedVerifyCount }})</button>
            </view>
          </view>
          <view v-if="verifyBatchMode" class="card-openid">批量模式已开启：已选 {{ batchSelectedVerifyCount }} 条</view>
          <view v-if="displayPendingVerifyTodoList.length === 0" class="empty empty--inline">
            <text class="empty-text">{{ todoOnlyOverdue ? '暂无超时认证待办' : '暂无待审核认证' }}</text>
          </view>
          <view
            v-for="item in displayPendingVerifyTodoList"
            :key="item._id"
            class="todo-item"
            :class="{ 'todo-item--overdue': item.isOverSla }"
          >
            <view class="title-row">
              <text class="card-sub">{{ item.nickname || shortOpenid(item._openid) }}</text>
              <view class="todo-title-actions">
                <text class="card-openid">已等待 {{ item.waitHoursText }}</text>
                <button
                  v-if="verifyBatchMode"
                  class="mini-btn mini-btn--ghost mini-btn--pick"
                  :disabled="verifyBatchProcessing"
                  @tap="toggleVerifySelection(item._openid)"
                >{{ isVerifySelected(item._openid) ? '已选' : '选择' }}</button>
              </view>
            </view>
            <text class="card-openid">{{ item._openid ? item._openid.slice(0, 20) + '...' : '--' }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--approve" @tap="verifyUserQuick(item._openid, 'verify')">一键通过</button>
              <button class="action-btn action-btn--reject" @tap="verifyUserQuick(item._openid, 'reject_verify')">一键驳回</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">批量执行结果</text>
            <text class="card-openid">{{ batchLastRun ? batchLastRun.timeText : '--' }}</text>
          </view>
          <view v-if="!batchLastRun" class="empty empty--inline">
            <text class="empty-text">暂无批量执行记录</text>
          </view>
          <template v-else>
            <view class="inline-badges">
              <text class="mini-pill mini-pill--log">{{ batchLastRun.scopeLabel }}</text>
              <text class="mini-pill mini-pill--report">总计 {{ batchLastRun.total }}</text>
              <text class="mini-pill mini-pill--handled">成功 {{ batchLastRun.successCount }}</text>
              <text class="mini-pill mini-pill--risk">失败 {{ batchLastRun.failCount }}</text>
            </view>
            <view class="todo-batch-toolbar">
              <button
                class="mini-btn"
                :disabled="batchLastRun.failCount === 0 || retryBatchProcessing"
                @tap="retryFailedBatch"
              >重试失败项({{ batchLastRun.failCount }})</button>
              <button class="mini-btn mini-btn--ghost" @tap="copyBatchResult">复制结果</button>
            </view>
            <view v-if="batchLastRun.items.length === 0" class="empty empty--inline">
              <text class="empty-text">本次批量暂无明细</text>
            </view>
            <view v-for="item in batchLastRun.items.slice(0, 8)" :key="item.resultId" class="todo-item">
              <view class="title-row">
                <text class="card-sub">{{ item.label }}</text>
                <text class="status-pill" :class="item.success ? 'status-pill--handled' : 'status-pill--ignored'">
                  {{ item.success ? '成功' : '失败' }}
                </text>
              </view>
              <text class="card-openid">{{ item.message }}</text>
            </view>
          </template>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">即将开始活动（24h）</text>
            <text class="status-pill status-pill--open">{{ displayUpcomingActivityTodoList.length }}</text>
          </view>
          <view v-if="displayUpcomingActivityTodoList.length === 0" class="empty empty--inline">
            <text class="empty-text">{{ todoOnlyOverdue ? '暂无2小时内紧急活动' : '暂无24小时内开始的活动' }}</text>
          </view>
          <view
            v-for="item in displayUpcomingActivityTodoList"
            :key="item._id"
            class="todo-item"
            :class="{ 'todo-item--urgent': item.isUrgent }"
          >
            <view class="title-row">
              <text class="card-sub">{{ item.title }}</text>
              <text class="card-openid">距开始 {{ item.startInText }}</text>
            </view>
            <text class="card-openid">分类：{{ item.categoryLabel || '其他' }} · 地点：{{ item.location?.address || '--' }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--detail" @tap="goActivityDetail(item._id)">查看详情</button>
              <button v-if="!item.isRecommended" class="action-btn action-btn--recommend" @tap="recommendActivity(item._id, 'recommend')">推荐</button>
              <button v-else class="action-btn action-btn--unrecommend" @tap="recommendActivity(item._id, 'unrecommend')">取消推荐</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">闭环追踪（举报处理 SLA）</text>
            <text class="status-pill status-pill--handled">{{ closureStats.withinSlaRate }}</text>
          </view>
          <view class="logs-overview">
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ closureStats.closedCount }}</text>
              <text class="logs-overview-label">已闭环举报</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ closureStats.avgHandleHours }}</text>
              <text class="logs-overview-label">平均处理时长(h)</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ closureStats.withinSlaCount }}</text>
              <text class="logs-overview-label">24h内闭环</text>
            </view>
          </view>
          <view v-if="!isLiteMode || showTodoAdvanced" class="sla-board">
            <view class="title-row">
              <text class="card-sub">SLA 细分看板</text>
              <text class="card-openid">阈值 {{ todoSlaHours }}h</text>
            </view>
            <view class="sla-board-grid">
              <view v-for="group in slaSegmentBoard.groups" :key="group.key" class="sla-board-card">
                <view class="title-row">
                  <text class="card-openid">{{ group.label }}</text>
                  <text class="card-openid">总计 {{ group.total }}</text>
                </view>
                <view class="trend-mini-bars">
                  <view v-for="bucket in group.buckets" :key="`${group.key}_${bucket.key}`" class="trend-mini-row">
                    <text class="trend-mini-label">{{ bucket.label }}</text>
                    <view class="trend-mini-track">
                      <view
                        class="trend-mini-fill trend-mini-fill--reading"
                        :style="{ width: slaBucketWidth(bucket.count) }"
                      />
                    </view>
                    <text class="trend-mini-value">{{ bucket.count }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <template v-if="!isLiteMode || showTodoAdvanced">
            <view v-if="recentClosureList.length === 0" class="empty empty--inline">
              <text class="empty-text">暂无闭环记录</text>
            </view>
            <view v-for="item in recentClosureList" :key="item._id" class="todo-item">
              <view class="title-row">
                <text class="card-sub">{{ item.targetActivity?.title || item.targetId }}</text>
                <text class="card-openid">耗时 {{ item.handleHoursText }}</text>
              </view>
              <text class="card-openid">结果：{{ reportStatusText(item.reportStatus) }} · {{ formatTime(item.handledAt) }}</text>
            </view>
            <view class="closure-trend-panel">
              <view class="title-row">
                <text class="card-sub">近7天处理趋势</text>
                <text class="card-openid">新增举报 vs 闭环数</text>
              </view>
              <view class="trend-legend">
                <text class="trend-legend-item trend-legend-item--report">新增举报</text>
                <text class="trend-legend-item trend-legend-item--action">闭环处理</text>
              </view>
              <view class="trend-list">
                <view v-for="item in closureTrend7Days" :key="item.key" class="trend-row">
                  <view class="title-row">
                    <text class="card-sub">{{ item.label }}</text>
                    <text class="card-openid">
                      新增{{ item.newReportCount }} · 闭环{{ item.closedCount }} · 24h内{{ item.withinSlaRate }}
                    </text>
                  </view>
                  <view class="trend-bar-wrap">
                    <view class="trend-bar-track">
                      <view
                        class="trend-bar-fill trend-bar-fill--report"
                        :style="{ width: closureTrendBarWidth(item.newReportCount) }"
                      />
                    </view>
                    <view class="trend-bar-track">
                      <view
                        class="trend-bar-fill trend-bar-fill--action"
                        :style="{ width: closureTrendBarWidth(item.closedCount) }"
                      />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
      </template>

      <!-- 待审核认证 -->
      <template v-else-if="activeTab === 'verify'">
        <view v-if="filteredPendingVerifyList.length === 0" class="empty">
          <text class="empty-text">暂无待审核认证</text>
        </view>
        <view
          v-for="item in filteredPendingVerifyList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <image class="mini-avatar" :src="item.avatarUrl || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="card-text">
              <text class="card-title">{{ item.nickname || '未知用户' }}</text>
              <text class="card-sub">申请实名认证</text>
              <text class="card-openid">
                通道：{{ item.verifyProvider === 'wechat_official' ? '微信官方' : '人工审核' }}
                {{ item.officialVerifyStatus ? ` · 状态:${item.officialVerifyStatus}` : '' }}
              </text>
              <text class="card-openid">{{ item._openid ? item._openid.slice(0,12) + '...' : '' }}</text>
            </view>
          </view>
          <view class="card-actions">
            <button class="action-btn action-btn--approve" @tap="verifyUser(item._openid, 'verify')">通过</button>
            <button class="action-btn action-btn--reject"  @tap="verifyUser(item._openid, 'reject_verify')">拒绝</button>
            <button
              v-if="item.verifyProvider === 'wechat_official'"
              class="action-btn action-btn--detail"
              :disabled="isOfficialRetrying(item._openid)"
              @tap="retryOfficialVerifyFromAudit({ userOpenid: item._openid, openid: item._openid, retriable: true })"
            >重试官方</button>
          </view>
        </view>
      </template>

      <!-- 举报记录 -->
      <template v-else-if="activeTab === 'reports'">
        <view v-if="filteredReportList.length === 0" class="empty">
          <text class="empty-text">暂无举报记录</text>
        </view>
        <view
          v-for="item in filteredReportList"
          :key="item._id"
          class="card"
          :class="{
            'card--flash-handled': isRecentHandled(item._id, 'HANDLED'),
            'card--flash-ignored': isRecentHandled(item._id, 'IGNORED'),
          }"
        >
          <view class="card-info">
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">活动举报</text>
                <text class="status-pill" :class="reportStatusClass(item.reportStatus)">{{ reportStatusText(item.reportStatus) }}</text>
              </view>
              <text class="card-sub">原因：{{ item.reason }}</text>
              <text v-if="item.reporterNickname || item.reporterOpenid" class="card-sub">
                举报人：{{ item.reporterNickname || shortOpenid(item.reporterOpenid) }}
              </text>
              <text class="card-openid">活动ID: {{ item.targetId ? item.targetId.slice(0,12) + '...' : '' }}</text>
              <text v-if="item.reportStatus !== 'PENDING'" class="card-openid">
                处理结果：{{ handleActionText(item.handleAction) }}{{ item.handleNote ? '（' + item.handleNote + '）' : '' }}
              </text>
              <text v-if="item.handledAt" class="card-openid">处理时间：{{ formatTime(item.handledAt) }}</text>
              <text class="card-openid">提交时间：{{ formatTime(item.createdAt) }}</text>
              <text
                v-if="isHandlingReport(item._id)"
                class="card-openid card-openid--processing"
              >处理中，请稍候...</text>
            </view>
          </view>
          <view v-if="item.targetActivity" class="activity-preview">
            <view class="title-row">
              <text class="preview-title">{{ item.targetActivity.title || '未命名活动' }}</text>
              <text class="status-pill" :class="activityStatusClass(item.targetActivity.status)">{{ statusText(item.targetActivity.status) }}</text>
            </view>
            <text v-if="item.targetActivity.location && item.targetActivity.location.address" class="preview-sub">
              地点：{{ item.targetActivity.location.address }}
            </text>
            <text class="preview-sub">
              参与人数：{{ item.targetActivity.currentParticipants || 0 }}{{ item.targetActivity.isRecommended ? ' · 官方推荐' : '' }}
            </text>
          </view>
          <view v-else class="activity-preview activity-preview--missing">
            <text class="preview-sub">关联活动不存在或已超出当前查询范围</text>
          </view>
          <view v-if="item.reportStatus === 'PENDING'" class="card-actions">
            <button
              class="action-btn action-btn--detail"
              :disabled="isHandlingReport(item._id)"
              @tap="goActivityDetail(item.targetId)"
            >查看详情</button>
            <button
              class="action-btn action-btn--approve"
              :loading="isHandlingReport(item._id, 'resolve_report_hide')"
              :disabled="isHandlingReport(item._id)"
              @tap="handleReport(item)"
            >下架并处理</button>
            <button
              class="action-btn action-btn--reject"
              :loading="isHandlingReport(item._id, 'resolve_report_ignore')"
              :disabled="isHandlingReport(item._id)"
              @tap="ignoreReport(item)"
            >忽略并处理</button>
          </view>
          <view v-else class="card-actions">
            <button
              class="action-btn action-btn--detail"
              :disabled="isHandlingReport(item._id)"
              @tap="goActivityDetail(item.targetId)"
            >查看详情</button>
          </view>
        </view>
      </template>

      <!-- 活动管理 -->
      <template v-else-if="activeTab === 'activities'">
        <view v-if="filteredActivityList.length === 0" class="empty">
          <text class="empty-text">暂无活动</text>
        </view>
        <view
          v-for="item in filteredActivityList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">{{ item.title }}</text>
                <text class="status-pill" :class="activityStatusClass(item.status)">{{ statusText(item.status) }}</text>
              </view>
              <view v-if="item.reportMeta && item.reportMeta.total > 0" class="inline-badges">
                <text class="mini-pill mini-pill--report">累计举报 {{ item.reportMeta.total }}</text>
                <text v-if="item.reportMeta.pending > 0" class="mini-pill mini-pill--pending">待处理 {{ item.reportMeta.pending }}</text>
              </view>
              <text class="card-sub">{{ item.currentParticipants }}人参与{{ item.isRecommended ? ' · 官方推荐' : '' }}</text>
              <text v-if="item.publisherNickname" class="card-sub">发布者：{{ item.publisherNickname }}</text>
              <text class="card-openid">{{ item.location && item.location.address }}</text>
              <text v-if="item.reportMeta && item.reportMeta.latestReason" class="card-openid">
                最近举报：{{ item.reportMeta.latestReason }}
              </text>
              <text class="card-openid">活动ID: {{ item._id ? item._id.slice(0,12) + '...' : '' }}</text>
            </view>
          </view>
          <view class="card-actions">
            <button
              class="action-btn action-btn--detail"
              @tap="goActivityDetail(item._id)"
            >查看详情</button>
            <button
              v-if="!item.isRecommended"
              class="action-btn action-btn--recommend"
              @tap="recommendActivity(item._id, 'recommend')"
            >推荐</button>
            <button
              v-else
              class="action-btn action-btn--unrecommend"
              @tap="recommendActivity(item._id, 'unrecommend')"
            >取消推荐</button>
            <button
              v-if="item.status !== 'CANCELLED'"
              class="action-btn action-btn--reject"
              @tap="hideActivity(item._id)"
            >下架</button>
          </view>
        </view>
      </template>

      <!-- 操作记录 -->
      <template v-else>
        <view v-if="isLiteMode" class="todo-batch-toolbar">
          <button class="mini-btn mini-btn--ghost" @tap="toggleLogAdvanced">
            {{ showLogAdvanced ? '收起高级分析' : '展开高级分析（导出/趋势看板）' }}
          </button>
        </view>

        <view v-if="!isLiteMode || showLogAdvanced" class="export-toolbar">
          <view class="export-main-actions">
            <button
              class="action-btn action-btn--export"
              :loading="csvExporting"
              :disabled="csvExportingV2 || trendCsvExporting"
              @tap="exportStatsCsv"
            >导出基础报表 CSV</button>
            <button
              class="action-btn action-btn--export action-btn--export-v2"
              :loading="csvExportingV2"
              :disabled="csvExporting || trendCsvExporting"
              @tap="exportStatsCsvV2"
            >导出报表二期 CSV（双表）</button>
            <button
              class="action-btn action-btn--export action-btn--export-trend"
              :loading="trendCsvExporting"
              :disabled="csvExporting || csvExportingV2"
              @tap="exportTrendCsv"
            >导出周/月趋势 CSV</button>
          </view>
          <text class="export-tip">导出总览统计 + 操作记录明细（当前筛选 + 当前时间范围）</text>
          <view class="export-config">
            <view class="title-row">
              <text class="export-config-title">明细字段筛选</text>
              <text class="export-config-tip">已选 {{ exportSelectedFields.length }}/{{ exportFieldOptions.length }}</text>
            </view>
            <view class="export-actions">
              <button class="mini-btn" @tap="selectAllExportFields">全选</button>
              <button class="mini-btn mini-btn--ghost" @tap="resetExportFields">重置默认</button>
            </view>
            <view class="chip-row export-chip-wrap">
              <view
                v-for="item in exportFieldOptions"
                :key="item.key"
                class="chip chip--sort"
                :class="{ 'chip--active': exportSelectedFields.includes(item.key) }"
                @tap="toggleExportField(item.key)"
              >{{ item.label }}</view>
            </view>
          </view>
          <view class="export-config">
            <view class="title-row">
              <text class="export-config-title">趋势窗口（运营看板口径）</text>
              <text class="export-config-tip">周 {{ trendWeekWindow }} / 月 {{ trendMonthWindow }}</text>
            </view>
            <view class="export-actions export-actions--trend">
              <text class="export-tip">周窗口</text>
              <view class="chip-row">
                <view
                  v-for="item in trendWeekOptions"
                  :key="'week_' + item"
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendWeekWindow === item }"
                  @tap="trendWeekWindow = item"
                >近{{ item }}周</view>
              </view>
            </view>
            <view class="export-actions export-actions--trend">
              <text class="export-tip">月窗口</text>
              <view class="chip-row">
                <view
                  v-for="item in trendMonthOptions"
                  :key="'month_' + item"
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendMonthWindow === item }"
                  @tap="trendMonthWindow = item"
                >近{{ item }}月</view>
              </view>
            </view>
          </view>

          <view class="trend-dashboard">
            <view class="title-row">
              <text class="export-config-title">运营趋势看板预览</text>
              <view class="chip-row">
                <view
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendDashboardMode === 'week' }"
                  @tap="trendDashboardMode = 'week'"
                >周趋势</view>
                <view
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendDashboardMode === 'month' }"
                  @tap="trendDashboardMode = 'month'"
                >月趋势</view>
              </view>
            </view>

            <view class="trend-kpi-grid">
              <view
                v-for="card in trendSummaryCards"
                :key="card.key"
                class="trend-kpi-card"
              >
                <text class="trend-kpi-label">{{ card.label }}</text>
                <text class="trend-kpi-value">{{ card.value }}</text>
                <text class="trend-kpi-sub">{{ card.sub }}</text>
              </view>
            </view>

            <view class="trend-legend">
              <text class="trend-legend-item trend-legend-item--activity">活动</text>
              <text class="trend-legend-item trend-legend-item--report">举报</text>
              <text class="trend-legend-item trend-legend-item--action">管理动作</text>
            </view>

            <view v-if="trendDashboardRows.length === 0" class="empty">
              <text class="empty-text">暂无趋势数据，可先导入趋势测试数据</text>
            </view>
            <view v-else class="trend-list">
              <view
                v-for="row in trendDashboardRows"
                :key="row.key"
                class="trend-row"
              >
                <view class="title-row">
                  <text class="card-sub">{{ row.label }}</text>
                  <text class="card-openid">活动{{ row.publishedActivityCount }} · 举报{{ row.newReportCount }} · 动作{{ row.adminActionCount }}</text>
                </view>

                <view class="trend-bar-wrap">
                  <view class="trend-bar-track">
                    <view
                      class="trend-bar-fill trend-bar-fill--activity"
                      :style="{ width: trendMetricBarWidth(row.publishedActivityCount) }"
                    />
                  </view>
                  <view class="trend-bar-track">
                    <view
                      class="trend-bar-fill trend-bar-fill--report"
                      :style="{ width: trendMetricBarWidth(row.newReportCount) }"
                    />
                  </view>
                  <view class="trend-bar-track">
                    <view
                      class="trend-bar-fill trend-bar-fill--action"
                      :style="{ width: trendMetricBarWidth(row.adminActionCount) }"
                    />
                  </view>
                </view>
              </view>
            </view>

            <view v-if="trendDashboardRows.length > 0" class="trend-category-panel">
              <text class="export-config-title">分类小图表（活动发布）</text>
              <view class="trend-category-grid">
                <view
                  v-for="card in trendCategoryCards"
                  :key="card.key"
                  class="trend-category-card"
                >
                  <view class="title-row">
                    <text class="card-sub">{{ card.label }}</text>
                    <text class="card-openid">本期 {{ card.latestCount }} · 环比 {{ card.latestRate }}</text>
                  </view>
                  <view class="trend-mini-bars">
                    <view
                      v-for="point in card.points"
                      :key="`${card.key}_${point.key}`"
                      class="trend-mini-row"
                    >
                      <text class="trend-mini-label">{{ point.shortLabel }}</text>
                      <view class="trend-mini-track">
                        <view
                          class="trend-mini-fill"
                          :class="card.fillClass"
                          :style="{ width: point.width }"
                        />
                      </view>
                      <text class="trend-mini-value">{{ point.count }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="export-actions">
              <button class="mini-btn mini-btn--ghost" @tap="copyTrendInsight">复制看板解读</button>
            </view>
          </view>
        </view>

        <view v-if="logViewMode === 'flat' && filteredActionLogList.length > 0" class="logs-overview">
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ logOverview.total }}</text>
            <text class="logs-overview-label">筛选后总数</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ logOverview.highRisk }}</text>
            <text class="logs-overview-label">高风险操作</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ logOverview.reportRelated }}</text>
            <text class="logs-overview-label">举报处理相关</text>
          </view>
        </view>

        <template v-if="logViewMode === 'flat'">
          <view v-if="filteredActionLogList.length === 0" class="empty">
            <text class="empty-text">暂无操作记录</text>
          </view>
          <view
            v-for="item in filteredActionLogList"
            :key="item._id"
            class="card"
          >
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">{{ actionText(item.action) }}</text>
                <text class="status-pill status-pill--log">{{ targetTypeText(item.targetType) }}</text>
              </view>
              <view class="result-row">
                <text class="card-sub">结果：</text>
                <text class="status-pill" :class="resultToneClass(item.action)">{{ item.result || '已执行' }}</text>
              </view>
              <text class="card-sub">原因：{{ item.reason || '--' }}</text>
              <text class="card-openid">
                来源：{{ actionSourceText(item.actionSource) }}{{ item.manualOverride ? ' · 人工干预' : '' }}{{ item.canAutoExecute ? ' · 允许自动' : '' }}
              </text>
              <text v-if="item.notifyAfterAction" class="card-openid">通知：{{ notifySummaryText(item.notifySummary) }}</text>
              <text class="card-openid">对象ID: {{ item.targetId ? item.targetId.slice(0,12) + '...' : '--' }}</text>
              <text v-if="item.linkedActivityId" class="card-openid">
                关联活动ID: {{ item.linkedActivityId.slice(0,12) + '...' }}
              </text>
              <text v-if="item.linkedActivity && item.linkedActivity.title" class="card-sub">
                关联活动：{{ item.linkedActivity.title }}
              </text>
              <text class="card-openid">操作者: {{ item.adminRole || 'admin' }} · {{ shortOpenid(item.adminOpenid) }}</text>
              <text class="card-openid">时间：{{ formatTime(item.createdAt) }}</text>
            </view>
            <view v-if="item.linkedActivityId" class="card-actions card-actions--single">
              <button
                class="action-btn action-btn--detail"
                @tap="goActivityDetail(item.linkedActivityId)"
              >查看关联活动</button>
            </view>
          </view>
        </template>

        <template v-else>
          <view v-if="logActivityAggregateList.length === 0" class="empty">
            <text class="empty-text">暂无可聚合链路</text>
          </view>
          <view
            v-for="group in logActivityAggregateList"
            :key="group.activityId"
            class="card"
          >
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">{{ group.title || '未命名活动' }}</text>
                <text class="status-pill" :class="activityStatusClass(group.status)">{{ statusText(group.status) }}</text>
              </view>
              <view class="inline-badges">
                <text class="mini-pill mini-pill--report">举报 {{ group.reportTotal }}</text>
                <text v-if="group.pendingReports > 0" class="mini-pill mini-pill--pending">待处理 {{ group.pendingReports }}</text>
                <text class="mini-pill mini-pill--log">管理动作 {{ group.actionCount }}</text>
                <text v-if="group.highRiskCount > 0" class="mini-pill mini-pill--risk">高风险 {{ group.highRiskCount }}</text>
              </view>
              <text class="card-openid">活动ID: {{ group.activityId.slice(0,12) + '...' }}</text>
              <text class="card-openid">最近事件：{{ formatTime(group.latestAt) }}</text>
            </view>

            <view class="timeline">
              <view
                v-for="item in group.timeline"
                :key="item.eventKey"
                class="timeline-item"
              >
                <view class="timeline-dot" :class="item.eventType === 'REPORT' ? 'timeline-dot--report' : 'timeline-dot--action'" />
                <view class="timeline-content">
                  <view class="title-row">
                    <text class="card-sub">{{ item.title }}</text>
                    <text class="card-openid">{{ formatTime(item.at) }}</text>
                  </view>
                  <text class="card-openid">{{ item.desc }}</text>
                </view>
              </view>
            </view>

            <text
              v-if="group.totalTimelineCount > group.timeline.length"
              class="card-openid"
            >仅显示最近 {{ group.timeline.length }} 条，共 {{ group.totalTimelineCount }} 条</text>

            <view class="card-actions card-actions--single">
              <button
                class="action-btn action-btn--detail"
                @tap="goActivityDetail(group.activityId)"
              >查看活动详情</button>
            </view>
          </view>
        </template>
      </template>

    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'

export default {
  data() {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = `${now.getMonth() + 1}`.padStart(2, '0')
    const dd = `${now.getDate()}`.padStart(2, '0')
    const today = `${yyyy}-${mm}-${dd}`

    return {
      activeTab: 'todo',
      activeFilter: 'all',
      searchKeyword: '',
      adminUiMode: 'lite',
      showTodoAdvanced: false,
      showLogAdvanced: false,
      todoSlaHours: 24,
      todoOnlyOverdue: false,
      todoAutoRemindEnabled: true,
      todoNotifyAfterActionEnabled: false,
      todoLastRemindDate: '',
      dailyReportAutoEnabled: true,
      dailyReportHistory: [],
      todoPrefReady: false,
      reportBatchMode: false,
      reportBatchProcessing: false,
      selectedReportTodoIds: [],
      verifyBatchMode: false,
      verifyBatchProcessing: false,
      selectedVerifyOpenids: [],
      retryBatchProcessing: false,
      batchLastRun: null,
      reportSort: 'created_desc',
      logTimeRange: 'all',
      logCustomStartDate: today,
      logCustomEndDate: today,
      logSort: 'created_desc',
      logViewMode: 'flat',
      logOperator: 'all',
      logRole: 'all',
      reportHandlingId: '',
      reportHandlingAction: '',
      lastHandledReportId: '',
      lastHandledReportStatus: '',
      reportHighlightTimer: null,
      csvExporting: false,
      officialCsvExporting: false,
      csvExportingV2: false,
      trendCsvExporting: false,
      trendWeekWindow: 12,
      trendMonthWindow: 6,
      trendDashboardMode: 'week',
      loading: false,
      hasAccess: true,
      currentAdminOpenid: '',
      adminRole: '',
      cityId: '',
      pendingVerifyList: [],
      officialVerifyAudit: {
        summary: {
          total: 0,
          success: 0,
          failed: 0,
          processing: 0,
          retriable: 0,
          pendingOfficialCount: 0,
          passRate: null,
          retryUserCount: 0,
          retryConvertedCount: 0,
          retryConversionRate: null,
          topFailReasons: [],
          alertCount24h: 0,
          immediateAlertCount24h: 0,
          thresholdAlertCount24h: 0,
          replayBlocked: 0,
          signatureFailed: 0,
          unauthorizedFailed: 0,
          ipDenied: 0,
        },
        recent: [],
        alerts: [],
      },
      officialRetryingOpenids: [],
      opsPatrolRunning: false,
      opsPatrol: {
        summary: {
          level: 'normal',
          score: 0,
          triggeredCount: 0,
          cityId: '',
          checkedAt: null,
          reportOverdueCount: 0,
          verifyOverdueCount: 0,
          officialVerifyFailedCount: 0,
          supplyAlertLevel: 'normal',
          supplyAlertFlags: [],
          source: '',
          alertCount24h: 0,
          hasRecentRun: false,
        },
        latestChecks: [],
        alerts: [],
        runs: [],
      },
      reportList: [],
      activityList: [],
      actionLogList: [],
      exportSelectedFields: [
        'createdAt',
        'actionText',
        'action',
        'actionSource',
        'result',
        'targetType',
        'targetId',
        'linkedActivityId',
        'adminRole',
        'adminOpenid',
        'reason',
      ],
    }
  },

  computed: {
    isLiteMode() {
      return this.adminUiMode !== 'pro'
    },

    todayHandledActionCount() {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
      return this.actionLogList.filter((item) => {
        const ts = this.toTimestamp(item.createdAt)
        return Number.isFinite(ts) && ts >= start && ts <= end
      }).length
    },

    criticalTodoCount() {
      const reportCritical = this.pendingReportTodoList.filter((item) => item.isOverSla && item.severityScore >= 3).length
      const verifyCritical = this.pendingVerifyTodoList.filter((item) => item.waitHours >= this.todoSlaHours * 2).length
      return reportCritical + verifyCritical
    },

    adminSummaryCards() {
      return [
        {
          key: 'todo',
          label: '今日待办',
          value: this.todoTotalCount,
          sub: `当前视图 ${this.todoViewTotalCount}`,
        },
        {
          key: 'risk',
          label: '超时风险',
          value: this.overdueTodoCount,
          sub: `严重异常 ${this.criticalTodoCount}`,
        },
        {
          key: 'handled',
          label: '今日已处理',
          value: this.todayHandledActionCount,
          sub: `闭环率 ${this.closureStats.withinSlaRate}`,
        },
        {
          key: 'notify',
          label: '通知联动',
          value: this.todoNotifyAfterActionEnabled ? 'ON' : 'OFF',
          sub: this.todoNotifyAfterActionEnabled ? '已启用可选通知' : '默认不触发通知',
        },
      ]
    },

    pendingReportCount() {
      return this.reportList.filter((item) => item.reportStatus === 'PENDING').length
    },

    activeActivityCount() {
      return this.activityList.filter((item) => ['OPEN', 'FULL'].includes(item.status)).length
    },

    adminRoleLabel() {
      return this.adminRole === 'cityAdmin' ? '城市管理员' : '超级管理员'
    },

    cityIdLabel() {
      return this.cityId ? `城市：${this.cityId}` : '城市：全部'
    },

    officialVerifyAuditSummary() {
      return this.officialVerifyAudit?.summary || {
        total: 0,
        success: 0,
        failed: 0,
        processing: 0,
        retriable: 0,
        pendingOfficialCount: 0,
        passRate: null,
        retryUserCount: 0,
        retryConvertedCount: 0,
        retryConversionRate: null,
        topFailReasons: [],
        alertCount24h: 0,
        immediateAlertCount24h: 0,
        thresholdAlertCount24h: 0,
        replayBlocked: 0,
        signatureFailed: 0,
        unauthorizedFailed: 0,
        ipDenied: 0,
      }
    },

    officialVerifyRecentList() {
      return Array.isArray(this.officialVerifyAudit?.recent)
        ? this.officialVerifyAudit.recent.slice(0, 8)
        : []
    },

    officialVerifyAlertList() {
      return Array.isArray(this.officialVerifyAudit?.alerts)
        ? this.officialVerifyAudit.alerts.slice(0, 3)
        : []
    },

    opsPatrolSummary() {
      return this.opsPatrol?.summary || {
        level: 'normal',
        score: 0,
        triggeredCount: 0,
        cityId: '',
        checkedAt: null,
        reportOverdueCount: 0,
        verifyOverdueCount: 0,
        officialVerifyFailedCount: 0,
        supplyAlertLevel: 'normal',
        supplyAlertFlags: [],
        source: '',
        alertCount24h: 0,
        hasRecentRun: false,
      }
    },

    opsPatrolAlertList() {
      return Array.isArray(this.opsPatrol?.alerts)
        ? this.opsPatrol.alerts.slice(0, 3)
        : []
    },

    searchPlaceholder() {
      const map = {
        todo: '搜索待办：用户/活动/原因',
        verify: '搜索昵称 / openid',
        reports: '搜索举报原因 / 举报人 / 活动ID',
        activities: '搜索标题 / 地址 / 发布者 / 活动ID',
        logs: '搜索原因 / 对象ID / 关联活动ID / 管理员',
      }
      return map[this.activeTab] || '搜索'
    },

    pendingReportTodoList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const nowTs = Date.now()
      const list = this.reportList
        .filter((item) => (item.reportStatus || 'PENDING') === 'PENDING')
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const waitHours = Number.isFinite(createdTs) ? Math.max(0, (nowTs - createdTs) / 3600000) : 0
          const startTs = this.toTimestamp(item.targetActivity?.startTime)
          const startInHours = Number.isFinite(startTs) ? (startTs - nowTs) / 3600000 : NaN
          const isStartSoon = Number.isFinite(startInHours) && startInHours >= 0 && startInHours <= 6
          const severity = this.getReportSeverity(item.reason)
          const title = item.targetActivity?.title || ''
          const priorityScore = (waitHours >= this.todoSlaHours ? 1000 : 500)
            + severity.score * 120
            + (isStartSoon ? Math.round(80 + (6 - startInHours) * 10) : 0)
            + Math.round(Math.min(waitHours, 120))
          return {
            ...item,
            waitHours,
            waitHoursText: this.formatHoursText(waitHours),
            isOverSla: waitHours >= this.todoSlaHours,
            startTs,
            startInHours,
            startInText: Number.isFinite(startInHours) && startInHours >= 0 ? this.formatHoursText(startInHours) : '',
            isStartSoon,
            severityScore: severity.score,
            severityLevel: severity.level,
            severityLabel: severity.label,
            priorityScore,
            _searchText: [item.reason, title, item.targetId, item.reporterNickname, item.reporterOpenid].join(' '),
          }
        })
        .filter((item) => !keyword || String(item._searchText || '').toLowerCase().includes(keyword))
        .sort((a, b) => {
          if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore
          return b.waitHours - a.waitHours
        })

      return list
    },

    displayPendingReportTodoList() {
      if (!this.todoOnlyOverdue) return this.pendingReportTodoList
      return this.pendingReportTodoList.filter((item) => item.isOverSla)
    },

    pendingVerifyTodoList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const nowTs = Date.now()
      return this.pendingVerifyList
        .map((item) => {
          const baseTs = this.toTimestamp(item.verifySubmittedAt || item.updatedAt || item.createdAt)
          const waitHours = Number.isFinite(baseTs) ? Math.max(0, (nowTs - baseTs) / 3600000) : 0
          return {
            ...item,
            waitHours,
            waitHoursText: this.formatHoursText(waitHours),
            isOverSla: waitHours >= this.todoSlaHours,
            _searchText: [item.nickname, item._openid].join(' '),
          }
        })
        .filter((item) => !keyword || String(item._searchText || '').toLowerCase().includes(keyword))
        .sort((a, b) => {
          if (a.isOverSla !== b.isOverSla) return a.isOverSla ? -1 : 1
          return b.waitHours - a.waitHours
        })
    },

    displayPendingVerifyTodoList() {
      if (!this.todoOnlyOverdue) return this.pendingVerifyTodoList
      return this.pendingVerifyTodoList.filter((item) => item.isOverSla)
    },

    upcomingActivityTodoList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const nowTs = Date.now()
      const maxTs = nowTs + 24 * 3600000

      return this.activityList
        .filter((item) => ['OPEN', 'FULL'].includes(item.status))
        .map((item) => {
          const startTs = this.toTimestamp(item.startTime)
          const startInHours = Number.isFinite(startTs) ? (startTs - nowTs) / 3600000 : NaN
          return {
            ...item,
            startTs,
            startInHours,
            startInText: this.formatHoursText(startInHours),
            isUrgent: Number.isFinite(startInHours) && startInHours <= 2,
            _searchText: [item.title, item.categoryLabel, item.location?.address].join(' '),
          }
        })
        .filter((item) => Number.isFinite(item.startTs) && item.startTs >= nowTs && item.startTs <= maxTs)
        .filter((item) => !keyword || String(item._searchText || '').toLowerCase().includes(keyword))
        .sort((a, b) => a.startTs - b.startTs)
    },

    displayUpcomingActivityTodoList() {
      if (!this.todoOnlyOverdue) return this.upcomingActivityTodoList
      return this.upcomingActivityTodoList.filter((item) => item.isUrgent)
    },

    todoTotalCount() {
      return this.pendingReportTodoList.length + this.pendingVerifyTodoList.length + this.upcomingActivityTodoList.length
    },

    todoViewTotalCount() {
      return this.displayPendingReportTodoList.length
        + this.displayPendingVerifyTodoList.length
        + this.displayUpcomingActivityTodoList.length
    },

    overdueTodoCount() {
      return this.pendingReportTodoList.filter((item) => item.isOverSla).length
        + this.pendingVerifyTodoList.filter((item) => item.isOverSla).length
        + this.upcomingActivityTodoList.filter((item) => item.isUrgent).length
    },

    todoSlaHourOptions() {
      return [12, 24, 48]
    },

    todoTodaySummary() {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime()
      const isInToday = (ts) => Number.isFinite(ts) && ts >= start && ts <= end

      const newReportsToday = this.reportList.filter((item) => isInToday(this.toTimestamp(item.createdAt))).length
      const closedToday = this.reportList
        .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus))
        .filter((item) => isInToday(this.toTimestamp(item.handledAt)))
        .length

      return {
        dateLabel: `今天 ${this.formatMd(now)}`,
        newReportsToday,
        closedToday,
        overdueUnhandled: this.pendingReportTodoList.filter((item) => item.isOverSla).length
          + this.pendingVerifyTodoList.filter((item) => item.isOverSla).length,
        upcoming24h: this.upcomingActivityTodoList.length,
      }
    },

    todoPriorityQueue() {
      const reportRows = this.displayPendingReportTodoList.map((item) => ({
        queueId: `report_${item._id}`,
        type: 'report',
        typeLabel: '举报待办',
        isRisk: item.isOverSla,
        urgencyText: `${item.severityLabel} · 已等待 ${item.waitHoursText}${item.startInText ? ` · 距开始${item.startInText}` : ''}`,
        priorityScore: Number(item.priorityScore || 0),
        title: item.targetActivity?.title || item.targetId || '举报活动',
        subTitle: `原因：${item.reason || '待补充'}${item.reporterNickname ? ` · 举报人：${item.reporterNickname}` : ''}`,
        raw: item,
      }))

      const verifyRows = this.displayPendingVerifyTodoList.map((item) => ({
        queueId: `verify_${item._id}`,
        type: 'verify',
        typeLabel: '认证待办',
        isRisk: item.isOverSla,
        urgencyText: `已等待 ${item.waitHoursText}`,
        priorityScore: (item.isOverSla ? 260 : 150) + Math.round(Number(item.waitHours || 0)),
        title: item.nickname || this.shortOpenid(item._openid) || '待审核用户',
        subTitle: `OPENID：${item._openid ? `${item._openid.slice(0, 20)}...` : '--'}`,
        raw: item,
      }))

      const activityRows = this.displayUpcomingActivityTodoList.map((item) => {
        const startInHours = Number(item.startInHours)
        const safeStart = Number.isFinite(startInHours) ? Math.max(0, startInHours) : 24
        return {
          queueId: `activity_${item._id}`,
          type: 'activity',
          typeLabel: '活动开场',
          isRisk: item.isUrgent,
          urgencyText: `距开始 ${item.startInText}`,
          priorityScore: (item.isUrgent ? 220 : 120) + Math.round(24 - Math.min(24, safeStart)),
          title: item.title || '未命名活动',
          subTitle: `地点：${item.location?.address || '--'} · 分类：${item.categoryLabel || '其他'}`,
          raw: item,
        }
      })

      return [...reportRows, ...verifyRows, ...activityRows]
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 8)
    },

    todoPriorityRiskCount() {
      return this.todoPriorityQueue.filter((item) => item.isRisk).length
    },

    overdueReportTodoCount() {
      return this.pendingReportTodoList.filter((item) => item.isOverSla).length
    },

    overdueVerifyTodoCount() {
      return this.pendingVerifyTodoList.filter((item) => item.isOverSla).length
    },

    urgentActivityTodoCount() {
      return this.upcomingActivityTodoList.filter((item) => item.isUrgent).length
    },

    batchSelectedReportCount() {
      return this.selectedReportTodoIds.length
    },

    batchSelectedVerifyCount() {
      return this.selectedVerifyOpenids.length
    },

    dailyReportHistoryPreview() {
      return [...(this.dailyReportHistory || [])]
        .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
        .slice(0, 7)
    },

    slaSegmentBoard() {
      const buildBuckets = (values = []) => {
        const ranges = [
          { key: 'lt6', label: '<6h', min: 0, max: 6 },
          { key: 'lt12', label: '6-12h', min: 6, max: 12 },
          { key: 'lt24', label: '12-24h', min: 12, max: 24 },
          { key: 'gte24', label: '>=24h', min: 24, max: Infinity },
        ]
        return ranges.map((range) => {
          const count = values.filter((value) => {
            const safe = Number(value)
            if (!Number.isFinite(safe) || safe < 0) return false
            if (range.max === Infinity) return safe >= range.min
            return safe >= range.min && safe < range.max
          }).length
          return { ...range, count }
        })
      }

      const reportBuckets = buildBuckets(this.pendingReportTodoList.map((item) => Number(item.waitHours || 0)))
      const verifyBuckets = buildBuckets(this.pendingVerifyTodoList.map((item) => Number(item.waitHours || 0)))
      const closedHours = this.reportList
        .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus) && item.handledAt)
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const handledTs = this.toTimestamp(item.handledAt)
          if (!Number.isFinite(createdTs) || !Number.isFinite(handledTs) || handledTs < createdTs) return 0
          return (handledTs - createdTs) / 3600000
        })
      const closedBuckets = buildBuckets(closedHours)

      const groups = [
        {
          key: 'report_pending',
          label: '举报待办等待时长',
          total: this.pendingReportTodoList.length,
          buckets: reportBuckets,
        },
        {
          key: 'verify_pending',
          label: '认证待办等待时长',
          total: this.pendingVerifyTodoList.length,
          buckets: verifyBuckets,
        },
        {
          key: 'closed_handle',
          label: '已闭环处理时长',
          total: closedHours.length,
          buckets: closedBuckets,
        },
      ]

      const maxBucketCount = groups.reduce((max, group) => {
        const groupMax = group.buckets.reduce((localMax, item) => (item.count > localMax ? item.count : localMax), 0)
        return groupMax > max ? groupMax : max
      }, 1)

      return {
        groups,
        maxBucketCount: maxBucketCount > 0 ? maxBucketCount : 1,
      }
    },

    recentClosureList() {
      return this.reportList
        .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus) && item.handledAt)
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const handledTs = this.toTimestamp(item.handledAt)
          const handleHours = (Number.isFinite(createdTs) && Number.isFinite(handledTs) && handledTs >= createdTs)
            ? (handledTs - createdTs) / 3600000
            : 0
          return {
            ...item,
            handleHours,
            handleHoursText: this.formatHoursText(handleHours),
          }
        })
        .sort((a, b) => this.toTimestamp(b.handledAt) - this.toTimestamp(a.handledAt))
        .slice(0, 8)
    },

    closureStats() {
      const allClosed = this.reportList
        .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus) && item.handledAt)
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const handledTs = this.toTimestamp(item.handledAt)
          const hours = (Number.isFinite(createdTs) && Number.isFinite(handledTs) && handledTs >= createdTs)
            ? (handledTs - createdTs) / 3600000
            : 0
          return { ...item, handleHours: hours }
        })

      if (allClosed.length === 0) {
        return {
          closedCount: 0,
          avgHandleHours: '0.0',
          withinSlaCount: 0,
          withinSlaRate: '0.0%',
        }
      }

      const totalHours = allClosed.reduce((sum, item) => sum + (item.handleHours || 0), 0)
      const withinSlaCount = allClosed.filter((item) => (item.handleHours || 0) <= this.todoSlaHours).length
      return {
        closedCount: allClosed.length,
        avgHandleHours: (totalHours / allClosed.length).toFixed(1),
        withinSlaCount,
        withinSlaRate: `${((withinSlaCount / allClosed.length) * 100).toFixed(1)}%`,
      }
    },

    closureTrend7Days() {
      const dayMs = 24 * 60 * 60 * 1000
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime()
      const rows = []

      for (let i = 6; i >= 0; i -= 1) {
        const startTs = todayStart - i * dayMs
        const endTs = startTs + dayMs - 1
        const label = this.formatMd(startTs)
        const newReportCount = this.reportList.filter((item) => {
          const ts = this.toTimestamp(item.createdAt)
          return Number.isFinite(ts) && ts >= startTs && ts <= endTs
        }).length

        const closedItems = this.reportList
          .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus))
          .filter((item) => {
            const handledTs = this.toTimestamp(item.handledAt)
            return Number.isFinite(handledTs) && handledTs >= startTs && handledTs <= endTs
          })
          .map((item) => {
            const createdTs = this.toTimestamp(item.createdAt)
            const handledTs = this.toTimestamp(item.handledAt)
            const handleHours = (Number.isFinite(createdTs) && Number.isFinite(handledTs) && handledTs >= createdTs)
              ? (handledTs - createdTs) / 3600000
              : 0
            return { ...item, handleHours }
          })

        const closedCount = closedItems.length
        const withinSlaCount = closedItems.filter((item) => item.handleHours <= this.todoSlaHours).length
        rows.push({
          key: `${startTs}`,
          label,
          newReportCount,
          closedCount,
          withinSlaRate: closedCount > 0 ? `${((withinSlaCount / closedCount) * 100).toFixed(0)}%` : '-',
        })
      }
      return rows
    },

    closureTrendScaleMax() {
      return this.closureTrend7Days.reduce((max, row) => {
        const rowMax = Math.max(Number(row.newReportCount) || 0, Number(row.closedCount) || 0)
        return rowMax > max ? rowMax : max
      }, 1)
    },

    filterOptions() {
      if (this.activeTab === 'reports') {
        return [
          { label: '全部', value: 'all' },
          { label: '待处理', value: 'PENDING' },
          { label: '已处理', value: 'HANDLED' },
          { label: '已忽略', value: 'IGNORED' },
        ]
      }
      if (this.activeTab === 'activities') {
        return [
          { label: '全部', value: 'all' },
          { label: '招募中', value: 'OPEN' },
          { label: '已满员', value: 'FULL' },
          { label: '已结束', value: 'ENDED' },
          { label: '已取消', value: 'CANCELLED' },
          { label: '官方推荐', value: 'recommended' },
          { label: '被举报', value: 'reported' },
        ]
      }
      if (this.activeTab === 'logs') {
        return [
          { label: '全部', value: 'all' },
          { label: '设为推荐', value: 'recommend' },
          { label: '取消推荐', value: 'unrecommend' },
          { label: '手动下架', value: 'hide' },
          { label: '通过认证', value: 'verify' },
          { label: '拒绝认证', value: 'reject_verify' },
          { label: '举报下架', value: 'resolve_report_hide' },
          { label: '举报忽略', value: 'resolve_report_ignore' },
          { label: '巡检执行', value: 'ops_patrol_run' },
          { label: '巡检告警', value: 'ops_patrol_alert' },
        ]
      }
      return []
    },

    reportSortOptions() {
      return [
        { label: '按提交时间(新->旧)', value: 'created_desc' },
        { label: '按提交时间(旧->新)', value: 'created_asc' },
        { label: '按处理时间(新->旧)', value: 'handled_desc' },
      ]
    },

    logTimeOptions() {
      return [
        { label: '时间：全部', value: 'all' },
        { label: '时间：今日', value: 'today' },
        { label: '时间：近7天', value: 'last7' },
        { label: '时间：自定义', value: 'custom' },
      ]
    },

    logSortOptions() {
      return [
        { label: '排序：新->旧', value: 'created_desc' },
        { label: '排序：旧->新', value: 'created_asc' },
      ]
    },

    logViewOptions() {
      return [
        { label: '视图：明细', value: 'flat' },
        { label: '视图：按活动聚合', value: 'by_activity' },
      ]
    },

    logOperatorOptions() {
      const total = this.actionLogList.length
      const meCount = this.currentAdminOpenid
        ? this.actionLogList.filter((item) => item.adminOpenid === this.currentAdminOpenid).length
        : 0
      const otherCount = Math.max(total - meCount, 0)

      const options = [{ label: `操作者：全部(${total})`, value: 'all' }]
      if (this.currentAdminOpenid) {
        options.push({ label: `操作者：我自己(${meCount})`, value: 'me' })
        if (otherCount > 0) {
          options.push({ label: `操作者：其他(${otherCount})`, value: 'others' })
        }
      }
      return options
    },

    logRoleOptions() {
      const roleCountMap = this.actionLogList.reduce((acc, item) => {
        const role = item.adminRole || 'superAdmin'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {})

      const options = [{ label: `角色：全部(${this.actionLogList.length})`, value: 'all' }]
      if (roleCountMap.superAdmin) {
        options.push({ label: `角色：超管(${roleCountMap.superAdmin})`, value: 'superAdmin' })
      }
      if (roleCountMap.cityAdmin) {
        options.push({ label: `角色：城市管理员(${roleCountMap.cityAdmin})`, value: 'cityAdmin' })
      }
      return options
    },

    logOverview() {
      const list = this.filteredActionLogList
      const highRiskActions = ['hide', 'ban', 'resolve_report_hide', 'reject_verify', 'official_verify_alert', 'official_verify_alert_immediate', 'ops_patrol_alert']
      const reportRelatedActions = ['resolve_report_hide', 'resolve_report_ignore']
      return {
        total: list.length,
        highRisk: list.filter((item) => highRiskActions.includes(item.action)).length,
        reportRelated: list.filter((item) => reportRelatedActions.includes(item.action)).length,
      }
    },

    exportFieldOptions() {
      return [
        { key: 'createdAt', label: '时间' },
        { key: 'actionText', label: '动作中文' },
        { key: 'action', label: '动作编码' },
        { key: 'actionSource', label: '执行来源' },
        { key: 'result', label: '结果' },
        { key: 'targetType', label: '对象类型' },
        { key: 'targetId', label: '对象ID' },
        { key: 'linkedActivityId', label: '关联活动ID' },
        { key: 'adminRole', label: '操作者角色' },
        { key: 'adminOpenid', label: '操作者OPENID' },
        { key: 'reason', label: '原因' },
      ]
    },

    trendWeekOptions() {
      return [8, 12, 16, 24]
    },

    trendMonthOptions() {
      return [3, 6, 12]
    },

    trendWeekRows() {
      return this.buildTrendRows(this.buildWeekPeriods(this.trendWeekWindow))
    },

    trendMonthRows() {
      return this.buildTrendRows(this.buildMonthPeriods(this.trendMonthWindow))
    },

    trendDashboardRows() {
      return this.trendDashboardMode === 'month' ? this.trendMonthRows : this.trendWeekRows
    },

    trendDashboardScaleMax() {
      return this.trendDashboardRows.reduce((max, row) => {
        return Math.max(max, row.publishedActivityCount || 0, row.newReportCount || 0, row.adminActionCount || 0)
      }, 1)
    },

    trendSummaryCards() {
      const rows = this.trendDashboardRows
      const latest = rows[rows.length - 1]
      if (!latest) {
        return [
          { key: 'activity', label: '新发布活动', value: 0, sub: '环比 -' },
          { key: 'report', label: '新增举报', value: 0, sub: '环比 -' },
          { key: 'action', label: '管理动作', value: 0, sub: '环比 -' },
        ]
      }

      return [
        {
          key: 'activity',
          label: '新发布活动',
          value: latest.publishedActivityCount || 0,
          sub: `环比 ${latest.activityGrowthRate || '-'}`,
        },
        {
          key: 'report',
          label: '新增举报',
          value: latest.newReportCount || 0,
          sub: `环比 ${latest.reportGrowthRate || '-'}`,
        },
        {
          key: 'action',
          label: '管理动作',
          value: latest.adminActionCount || 0,
          sub: `环比 ${latest.actionGrowthRate || '-'}`,
        },
      ]
    },

    trendCategoryCards() {
      const rows = this.trendDashboardRows
      const categories = [
        { key: 'sport', label: '运动', fillClass: 'trend-mini-fill--sport' },
        { key: 'music', label: '音乐', fillClass: 'trend-mini-fill--music' },
        { key: 'reading', label: '读书', fillClass: 'trend-mini-fill--reading' },
      ]

      if (rows.length === 0) {
        return categories.map((item) => ({
          ...item,
          latestCount: 0,
          latestRate: '-',
          points: [],
        }))
      }

      const scaleMax = rows.reduce((max, row) => {
        const map = row.categoryPublishedMap || {}
        return Math.max(max, map.sport || 0, map.music || 0, map.reading || 0)
      }, 1)

      const buildShortLabel = (label = '', key = '') => {
        if (this.trendDashboardMode === 'month') return key.slice(5) || label
        const idx = label.indexOf('-')
        if (idx > 0) return label.slice(0, idx)
        return label
      }

      return categories.map((item) => {
        const points = rows.map((row) => {
          const count = Number(row.categoryPublishedMap?.[item.key] || 0)
          return {
            key: row.key,
            shortLabel: buildShortLabel(row.label, row.key),
            count,
            width: this.calcMiniBarWidth(count, scaleMax),
          }
        })
        const latest = points[points.length - 1]
        const prev = points[points.length - 2]
        return {
          ...item,
          latestCount: latest?.count || 0,
          latestRate: prev ? this.formatRate(latest?.count || 0, prev?.count || 0) : '-',
          points,
        }
      })
    },

    logActivityAggregateList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const activityMap = this.activityList.reduce((acc, item) => {
        acc[item._id] = item
        return acc
      }, {})
      const groups = {}
      const highRiskActions = ['hide', 'ban', 'resolve_report_hide', 'reject_verify', 'official_verify_alert', 'official_verify_alert_immediate', 'ops_patrol_alert']

      const toTs = (value) => {
        const ms = new Date(value).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      const ensureGroup = (activityId, fallback = {}) => {
        if (!activityId) return null
        if (!groups[activityId]) {
          const base = activityMap[activityId] || fallback || {}
          groups[activityId] = {
            activityId,
            title: base.title || '活动',
            status: base.status || 'OPEN',
            reportTotal: 0,
            pendingReports: 0,
            handledReports: 0,
            ignoredReports: 0,
            actionCount: 0,
            highRiskCount: 0,
            latestAt: null,
            timeline: [],
            totalTimelineCount: 0,
          }
        }
        return groups[activityId]
      }

      this.filteredActionLogList.forEach((item) => {
        const activityId = item.linkedActivityId || (item.targetType === 'activity' ? item.targetId : '')
        if (!activityId) return
        const group = ensureGroup(activityId, item.linkedActivity || {})
        if (!group) return

        group.actionCount += 1
        if (highRiskActions.includes(item.action)) group.highRiskCount += 1
        const currentTs = toTs(item.createdAt)
        if (!group.latestAt || currentTs > toTs(group.latestAt)) group.latestAt = item.createdAt

        group.timeline.push({
          eventKey: `action_${item._id}`,
          eventType: 'ACTION',
          at: item.createdAt,
          ts: currentTs,
          title: `${this.actionText(item.action)} · ${item.result || '已执行'}`,
          desc: `操作者：${item.adminRole || 'admin'} · ${this.shortOpenid(item.adminOpenid)} · 原因：${item.reason || '--'}`,
        })
      })

      const canIncludeReportOnly = this.activeFilter === 'all' && this.logOperator === 'all' && this.logRole === 'all'
      this.reportList.forEach((item) => {
        if (!item.targetId) return
        if (!this.isLogInTimeRange(item.createdAt)) return
        if (keyword && !this.matchAny(keyword, [
          item.reason,
          item.targetId,
          item.reporterNickname,
          item.reporterOpenid,
          item.targetActivity?.title,
          item.targetActivity?.location?.address,
        ])) {
          return
        }
        if (!canIncludeReportOnly && !groups[item.targetId]) return

        const group = ensureGroup(item.targetId, item.targetActivity || {})
        if (!group) return

        group.reportTotal += 1
        if (item.reportStatus === 'HANDLED') group.handledReports += 1
        else if (item.reportStatus === 'IGNORED') group.ignoredReports += 1
        else group.pendingReports += 1

        const currentTs = toTs(item.createdAt)
        if (!group.latestAt || currentTs > toTs(group.latestAt)) group.latestAt = item.createdAt
        group.timeline.push({
          eventKey: `report_${item._id}`,
          eventType: 'REPORT',
          at: item.createdAt,
          ts: currentTs,
          title: `用户举报 · ${this.reportStatusText(item.reportStatus)}`,
          desc: `举报人：${item.reporterNickname || this.shortOpenid(item.reporterOpenid)} · 原因：${item.reason || '--'}`,
        })
      })

      const list = Object.values(groups).map((group) => {
        const sorted = [...group.timeline].sort((a, b) => b.ts - a.ts)
        return {
          ...group,
          timeline: sorted.slice(0, 6),
          totalTimelineCount: sorted.length,
        }
      })

      list.sort((a, b) => toTs(b.latestAt) - toTs(a.latestAt))
      return list
    },

    filteredPendingVerifyList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      if (!keyword) return this.pendingVerifyList
      return this.pendingVerifyList.filter((item) => this.matchAny(keyword, [
        item.nickname,
        item._openid,
      ]))
    },

    filteredReportList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const filtered = this.reportList.filter((item) => {
        const statusMatch = this.activeFilter === 'all' || (item.reportStatus || 'PENDING') === this.activeFilter
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.reason,
          item.reporterNickname,
          item.reporterOpenid,
          item.targetId,
          item.handleNote,
          item.targetActivity?.title,
          item.targetActivity?.location?.address,
        ])
        return statusMatch && keywordMatch
      })

      const toTs = (t) => {
        const ms = new Date(t).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      const sorted = [...filtered]
      sorted.sort((a, b) => {
        if (this.reportSort === 'created_asc') {
          return toTs(a.createdAt) - toTs(b.createdAt)
        }
        if (this.reportSort === 'handled_desc') {
          const deltaHandled = toTs(b.handledAt) - toTs(a.handledAt)
          if (deltaHandled !== 0) return deltaHandled
          return toTs(b.createdAt) - toTs(a.createdAt)
        }
        return toTs(b.createdAt) - toTs(a.createdAt)
      })
      return sorted
    },

    filteredActivityList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      return this.activityList.filter((item) => {
        const statusMatch = this.activeFilter === 'all'
          || (this.activeFilter === 'recommended'
            ? !!item.isRecommended
            : this.activeFilter === 'reported'
              ? Number(item.reportMeta?.total || 0) > 0
              : item.status === this.activeFilter)
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.title,
          item.location?.address,
          item.publisherNickname,
          item._id,
          item.reportMeta?.latestReason,
        ])
        return statusMatch && keywordMatch
      })
    },

    filteredActionLogList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const filtered = this.actionLogList.filter((item) => {
        const targetMatch = this.activeFilter === 'all' || item.action === this.activeFilter
        const timeMatch = this.isLogInTimeRange(item.createdAt)
        const role = item.adminRole || 'superAdmin'
        const roleMatch = this.logRole === 'all' || role === this.logRole
        const operatorMatch = this.logOperator === 'all'
          || (this.logOperator === 'me' && item.adminOpenid === this.currentAdminOpenid)
          || (this.logOperator === 'others' && item.adminOpenid !== this.currentAdminOpenid)
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.reason,
          item.result,
          item.targetId,
          item.linkedActivityId,
          item.linkedActivity?.title,
          item.adminOpenid,
          item.adminRole,
        ])
        return targetMatch && timeMatch && roleMatch && operatorMatch && keywordMatch
      })

      const toTs = (t) => {
        const ms = new Date(t).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      const sorted = [...filtered]
      sorted.sort((a, b) => (
        this.logSort === 'created_asc'
          ? toTs(a.createdAt) - toTs(b.createdAt)
          : toTs(b.createdAt) - toTs(a.createdAt)
      ))

      return sorted
    },
  },

  async onShow() {
    if (!this.todoPrefReady) {
      this.initTodoPreferences()
      this.initDailyReportHistory()
      this.todoPrefReady = true
    }
    await this.loadData()
    this.maybeAutoRemindRiskTodos()
  },

  watch: {
    activeTab() {
      this.activeFilter = 'all'
      this.searchKeyword = ''
      this.todoOnlyOverdue = false
      this.reportSort = 'created_desc'
      this.logTimeRange = 'all'
      this.logCustomStartDate = this.getTodayDateToken()
      this.logCustomEndDate = this.getTodayDateToken()
      this.logSort = 'created_desc'
      this.logViewMode = 'flat'
      this.logOperator = 'all'
      this.logRole = 'all'
      this.showTodoAdvanced = false
      this.showLogAdvanced = false
      this.reportBatchMode = false
      this.selectedReportTodoIds = []
      this.verifyBatchMode = false
      this.selectedVerifyOpenids = []
    },
  },

  onUnload() {
    if (this.reportHighlightTimer) {
      clearTimeout(this.reportHighlightTimer)
      this.reportHighlightTimer = null
    }
  },

  methods: {
    getTodayDateToken() {
      const now = new Date()
      const y = now.getFullYear()
      const mo = `${now.getMonth() + 1}`.padStart(2, '0')
      const day = `${now.getDate()}`.padStart(2, '0')
      return `${y}-${mo}-${day}`
    },

    getRangeDateBoundary(dateToken, endOfDay = false) {
      if (!dateToken || !/^\d{4}-\d{2}-\d{2}$/.test(dateToken)) return NaN
      const [y, m, d] = dateToken.split('-').map((n) => Number(n))
      const date = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
      const ts = date.getTime()
      return Number.isFinite(ts) ? ts : NaN
    },

    onPickLogStartDate(e) {
      const value = e?.detail?.value || ''
      if (!value) return
      if (this.logCustomEndDate && value > this.logCustomEndDate) {
        this.logCustomEndDate = value
      }
      this.logCustomStartDate = value
    },

    onPickLogEndDate(e) {
      const value = e?.detail?.value || ''
      if (!value) return
      if (this.logCustomStartDate && value < this.logCustomStartDate) {
        this.logCustomStartDate = value
      }
      this.logCustomEndDate = value
    },

    setAdminUiMode(mode = 'lite') {
      this.adminUiMode = mode === 'pro' ? 'pro' : 'lite'
      if (this.isLiteMode) {
        this.showTodoAdvanced = false
        this.showLogAdvanced = false
      }
      this.saveTodoPreferences()
    },

    toggleTodoAdvanced() {
      this.showTodoAdvanced = !this.showTodoAdvanced
    },

    toggleLogAdvanced() {
      this.showLogAdvanced = !this.showLogAdvanced
    },

    onTodoOverdueSwitchChange(e) {
      this.todoOnlyOverdue = Boolean(e?.detail?.value)
    },

    onTodoAutoRemindSwitchChange(e) {
      this.todoAutoRemindEnabled = Boolean(e?.detail?.value)
      this.saveTodoPreferences()
      uni.showToast({ title: this.todoAutoRemindEnabled ? '已开启自动提醒' : '已关闭自动提醒', icon: 'none' })
    },

    onTodoNotifySwitchChange(e) {
      this.todoNotifyAfterActionEnabled = Boolean(e?.detail?.value)
      this.saveTodoPreferences()
      uni.showToast({ title: this.todoNotifyAfterActionEnabled ? '处理后将尝试通知' : '已关闭处理后通知', icon: 'none' })
    },

    onDailyReportAutoSwitchChange(e) {
      this.dailyReportAutoEnabled = Boolean(e?.detail?.value)
      this.saveTodoPreferences()
      uni.showToast({ title: this.dailyReportAutoEnabled ? '已开启自动归档' : '已关闭自动归档', icon: 'none' })
      if (this.dailyReportAutoEnabled) {
        this.autoArchiveDailyReport()
      }
    },

    onPickTodoSla(hours) {
      const next = Number(hours) || 24
      this.todoSlaHours = next
      this.saveTodoPreferences()
    },

    toggleReportBatchMode() {
      this.reportBatchMode = !this.reportBatchMode
      if (!this.reportBatchMode) {
        this.selectedReportTodoIds = []
      }
    },

    toggleVerifyBatchMode() {
      this.verifyBatchMode = !this.verifyBatchMode
      if (!this.verifyBatchMode) {
        this.selectedVerifyOpenids = []
      }
    },

    isReportSelected(reportId) {
      return this.selectedReportTodoIds.includes(reportId)
    },

    isVerifySelected(openid) {
      return this.selectedVerifyOpenids.includes(openid)
    },

    toggleReportSelection(reportId) {
      if (!reportId) return
      if (this.isReportSelected(reportId)) {
        this.selectedReportTodoIds = this.selectedReportTodoIds.filter((id) => id !== reportId)
        return
      }
      this.selectedReportTodoIds = [...this.selectedReportTodoIds, reportId]
    },

    toggleVerifySelection(openid) {
      if (!openid) return
      if (this.isVerifySelected(openid)) {
        this.selectedVerifyOpenids = this.selectedVerifyOpenids.filter((id) => id !== openid)
        return
      }
      this.selectedVerifyOpenids = [...this.selectedVerifyOpenids, openid]
    },

    selectAllVisibleReportTodos() {
      const ids = this.displayPendingReportTodoList.map((item) => item._id)
      this.selectedReportTodoIds = [...new Set(ids)]
    },

    selectAllVisibleVerifyTodos() {
      const ids = this.displayPendingVerifyTodoList.map((item) => item._openid).filter(Boolean)
      this.selectedVerifyOpenids = [...new Set(ids)]
    },

    clearSelectedReportTodos() {
      this.selectedReportTodoIds = []
    },

    clearSelectedVerifyTodos() {
      this.selectedVerifyOpenids = []
    },

    formatBatchScopeLabel(scope) {
      const map = {
        report: '举报批量处理',
        verify: '认证批量处理',
        retry: '失败项重试',
      }
      return map[scope] || '批量处理'
    },

    formatBatchActionLabel(action) {
      const map = {
        resolve_report_hide: '批量下架举报',
        resolve_report_ignore: '批量忽略举报',
        verify: '批量通过认证',
        reject_verify: '批量拒绝认证',
      }
      return map[action] || action
    },

    createBatchResultId() {
      return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    },

    async executeBatchActions({
      scope = 'report',
      action = '',
      rows = [],
      reason = '',
      payloadBuilder = () => ({}),
      labelBuilder = () => '待处理项',
      successToast = '批量处理完成',
    }) {
      let successCount = 0
      let failCount = 0
      const items = []

      for (const row of rows) {
        const payload = payloadBuilder(row)
        const finalPayload = { ...payload }
        if (typeof finalPayload.notifyAfterAction !== 'boolean') {
          finalPayload.notifyAfterAction = this.todoNotifyAfterActionEnabled
        }
        let success = false
        let message = ''
        try {
          const result = await callCloud('adminAction', finalPayload)
          success = !!result?.success
          message = result?.message || (success ? '操作成功' : (result?.error || '操作失败'))
        } catch (e) {
          success = false
          message = e?.message || e?.errMsg || '请求异常'
        }
        if (success) successCount += 1
        else failCount += 1
        items.push({
          resultId: this.createBatchResultId(),
          success,
          label: labelBuilder(row),
          message,
          retryPayload: payload,
        })
      }

      this.batchLastRun = {
        scope,
        scopeLabel: this.formatBatchScopeLabel(scope),
        action,
        actionLabel: this.formatBatchActionLabel(action),
        reason,
        total: rows.length,
        successCount,
        failCount,
        timeText: this.formatExportTime(new Date()),
        items,
      }

      await this.loadData()
      uni.showModal({
        title: successToast,
        content: `成功 ${successCount} 条，失败 ${failCount} 条`,
        showCancel: false,
      })
    },

    async batchHandleReports(action) {
      if (this.reportBatchProcessing) return
      const selectedIdSet = new Set(this.selectedReportTodoIds)
      const selectedRows = this.displayPendingReportTodoList.filter((item) => selectedIdSet.has(item._id))
      if (selectedRows.length === 0) {
        uni.showToast({ title: '请先选择举报记录', icon: 'none' })
        return
      }

      const reason = await this.pickReasonTemplate(action)
      if (!reason) return
      const actionText = action === 'resolve_report_hide' ? '批量下架并处理' : '批量忽略并处理'
      uni.showModal({
        title: `确认${actionText}？`,
        content: `将处理 ${selectedRows.length} 条举报，原因：${reason}`,
        success: async (res) => {
          if (!res.confirm) return
          this.reportBatchProcessing = true
          try {
            await this.executeBatchActions({
              scope: 'report',
              action,
              rows: selectedRows,
              reason,
              payloadBuilder: (item) => ({
                action,
                reportId: item._id,
                targetId: item.targetId,
                targetType: 'report',
                reason,
              }),
              labelBuilder: (item) => item.targetActivity?.title || item.targetId || '举报活动',
              successToast: '举报批量处理完成',
            })
            this.selectedReportTodoIds = []
          } finally {
            this.reportBatchProcessing = false
          }
        },
      })
    },

    async batchHandleVerify(action) {
      if (this.verifyBatchProcessing) return
      const selectedIdSet = new Set(this.selectedVerifyOpenids)
      const selectedRows = this.displayPendingVerifyTodoList.filter((item) => selectedIdSet.has(item._openid))
      if (selectedRows.length === 0) {
        uni.showToast({ title: '请先选择认证用户', icon: 'none' })
        return
      }

      const reason = await this.pickReasonTemplate(action)
      if (!reason) return
      const actionText = action === 'verify' ? '批量通过认证' : '批量拒绝认证'
      uni.showModal({
        title: `确认${actionText}？`,
        content: `将处理 ${selectedRows.length} 位用户，原因：${reason}`,
        success: async (res) => {
          if (!res.confirm) return
          this.verifyBatchProcessing = true
          try {
            await this.executeBatchActions({
              scope: 'verify',
              action,
              rows: selectedRows,
              reason,
              payloadBuilder: (item) => ({
                action,
                targetId: item._openid,
                targetType: 'user',
                reason,
              }),
              labelBuilder: (item) => item.nickname || this.shortOpenid(item._openid) || '待审核用户',
              successToast: '认证批量处理完成',
            })
            this.selectedVerifyOpenids = []
          } finally {
            this.verifyBatchProcessing = false
          }
        },
      })
    },

    async retryFailedBatch() {
      if (!this.batchLastRun || this.retryBatchProcessing) return
      const failedItems = (this.batchLastRun.items || []).filter((item) => !item.success && item.retryPayload)
      if (failedItems.length === 0) {
        uni.showToast({ title: '暂无失败项可重试', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认重试失败项？',
        content: `将重试 ${failedItems.length} 条失败记录`,
        success: async (res) => {
          if (!res.confirm) return
          this.retryBatchProcessing = true
          try {
            await this.executeBatchActions({
              scope: 'retry',
              action: this.batchLastRun.action || '',
              rows: failedItems,
              reason: this.batchLastRun.reason || '',
              payloadBuilder: (item) => item.retryPayload,
              labelBuilder: (item) => item.label || '失败项',
              successToast: '失败项重试完成',
            })
          } finally {
            this.retryBatchProcessing = false
          }
        },
      })
    },

    buildBatchResultText() {
      if (!this.batchLastRun) return '暂无批量执行结果'
      const run = this.batchLastRun
      const lines = [
        '【搭里批量执行结果】',
        `时间：${run.timeText}`,
        `范围：${run.scopeLabel}`,
        `动作：${run.actionLabel}`,
        `原因：${run.reason || '-'}`,
        `总计：${run.total}，成功：${run.successCount}，失败：${run.failCount}`,
        '',
      ]
      ;(run.items || []).forEach((item, index) => {
        lines.push(`${index + 1}. [${item.success ? '成功' : '失败'}] ${item.label}｜${item.message}`)
      })
      return lines.join('\n')
    },

    async copyBatchResult() {
      if (!this.batchLastRun) {
        uni.showToast({ title: '暂无批量结果可复制', icon: 'none' })
        return
      }
      try {
        const text = this.buildBatchResultText()
        await this.saveCsvToClipboard(text)
        uni.showToast({ title: '批量结果已复制', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      }
    },

    goPriorityQueueDetail(item) {
      if (!item || !item.type) return
      if (item.type === 'report') {
        this.goActivityDetail(item.raw?.targetId)
        return
      }
      if (item.type === 'activity') {
        this.goActivityDetail(item.raw?._id)
        return
      }
      if (item.type === 'verify') {
        const openid = item.raw?._openid || ''
        this.activeTab = 'verify'
        this.$nextTick(() => {
          this.searchKeyword = openid
        })
      }
    },

    toggleExportField(fieldKey) {
      if (!fieldKey) return
      const exists = this.exportSelectedFields.includes(fieldKey)
      if (exists) {
        if (this.exportSelectedFields.length === 1) {
          uni.showToast({ title: '至少保留1个字段', icon: 'none' })
          return
        }
        this.exportSelectedFields = this.exportSelectedFields.filter((key) => key !== fieldKey)
        return
      }
      this.exportSelectedFields = [...this.exportSelectedFields, fieldKey]
    },

    selectAllExportFields() {
      this.exportSelectedFields = this.exportFieldOptions.map((item) => item.key)
    },

    resetExportFields() {
      this.exportSelectedFields = [
        'createdAt',
        'actionText',
        'action',
        'actionSource',
        'result',
        'targetType',
        'targetId',
        'linkedActivityId',
        'adminRole',
        'adminOpenid',
        'reason',
      ]
    },

    getExportDetailFieldDefs() {
      const valueResolver = {
        createdAt: (item) => this.formatExportTime(new Date(item.createdAt || Date.now())),
        actionText: (item) => this.actionText(item.action),
        action: (item) => item.action || '',
        actionSource: (item) => this.actionSourceText(item.actionSource),
        result: (item) => item.result || '',
        targetType: (item) => item.targetType || '',
        targetId: (item) => item.targetId || '',
        linkedActivityId: (item) => item.linkedActivityId || '',
        adminRole: (item) => item.adminRole || '',
        adminOpenid: (item) => item.adminOpenid || '',
        reason: (item) => item.reason || '',
      }
      const selectedKeys = this.exportFieldOptions
        .filter((item) => this.exportSelectedFields.includes(item.key))
        .map((item) => item.key)

      const finalKeys = selectedKeys.length > 0 ? selectedKeys : ['createdAt', 'actionText', 'action', 'targetId']
      return this.exportFieldOptions
        .filter((item) => finalKeys.includes(item.key))
        .map((item) => ({
          key: item.key,
          label: item.label,
          value: valueResolver[item.key],
        }))
    },

    getReportSeverity(reason = '') {
      const text = String(reason || '').toLowerCase()
      const highKeywords = ['骚扰', '诈骗', '欺诈', '危险', '暴力', '未成年人', '人身', '威胁', '违法', '涉黄']
      const mediumKeywords = ['辱骂', '广告', '引流', '虚假', '不实', '违规', '收费纠纷', '临时改地点']
      const hitHigh = highKeywords.some((item) => text.includes(item.toLowerCase()))
      const hitMedium = !hitHigh && mediumKeywords.some((item) => text.includes(item.toLowerCase()))
      if (hitHigh) return { score: 3, level: 'high', label: '高严重' }
      if (hitMedium) return { score: 2, level: 'medium', label: '中严重' }
      return { score: 1, level: 'low', label: '低严重' }
    },

    reportSeverityPillClass(level = 'low') {
      const map = {
        high: 'mini-pill--risk',
        medium: 'mini-pill--pending',
        low: 'mini-pill--log',
      }
      return map[level] || 'mini-pill--log'
    },

    formatHoursText(hours) {
      const safe = Number(hours)
      if (!Number.isFinite(safe) || safe <= 0) return '<1h'
      if (safe < 1) return '<1h'
      if (safe < 24) return `${Math.round(safe)}h`
      return `${(safe / 24).toFixed(1)}d`
    },

    getReasonTemplateOptions(scene) {
      const map = {
        verify: ['实名资料齐全，审核通过', '信息一致，允许发布活动'],
        reject_verify: ['资料不完整，请补充后重试', '信息不一致，暂不通过'],
        resolve_report_hide: ['举报成立，先下架复核', '内容违规，按规则下架处理'],
        resolve_report_ignore: ['举报不成立，已记录并忽略', '核查无异常，本次不处理'],
        recommend: ['活动质量高，进入推荐位', '符合运营主题，给予推荐'],
        unrecommend: ['活动热度下降，退出推荐位', '推荐策略调整，先取消推荐'],
      }
      return map[scene] || ['按平台规则处理']
    },

    pickReasonTemplate(scene) {
      const options = this.getReasonTemplateOptions(scene)
      return new Promise((resolve) => {
        uni.showActionSheet({
          itemList: options,
          success: (res) => {
            resolve(options[res.tapIndex] || '')
          },
          fail: () => resolve(''),
        })
      })
    },

    getDefaultReasonTemplate(scene) {
      const options = this.getReasonTemplateOptions(scene)
      return options[0] || '按平台规则处理'
    },

    initTodoPreferences() {
      try {
        const pref = uni.getStorageSync('dali_admin_todo_pref_v1')
        if (!pref || typeof pref !== 'object') return
        if ([12, 24, 48].includes(Number(pref.todoSlaHours))) {
          this.todoSlaHours = Number(pref.todoSlaHours)
        }
        if (pref.adminUiMode === 'lite' || pref.adminUiMode === 'pro') {
          this.adminUiMode = pref.adminUiMode
        }
        if (typeof pref.todoAutoRemindEnabled === 'boolean') {
          this.todoAutoRemindEnabled = pref.todoAutoRemindEnabled
        }
        if (typeof pref.todoNotifyAfterActionEnabled === 'boolean') {
          this.todoNotifyAfterActionEnabled = pref.todoNotifyAfterActionEnabled
        }
        if (typeof pref.dailyReportAutoEnabled === 'boolean') {
          this.dailyReportAutoEnabled = pref.dailyReportAutoEnabled
        }
        if (pref.todoLastRemindDate && /^\d{4}-\d{2}-\d{2}$/.test(pref.todoLastRemindDate)) {
          this.todoLastRemindDate = pref.todoLastRemindDate
        }
      } catch (e) {
        console.warn('读取待办偏好失败', e)
      }
    },

    saveTodoPreferences() {
      try {
        uni.setStorageSync('dali_admin_todo_pref_v1', {
          adminUiMode: this.adminUiMode,
          todoSlaHours: this.todoSlaHours,
          todoAutoRemindEnabled: this.todoAutoRemindEnabled,
          todoNotifyAfterActionEnabled: this.todoNotifyAfterActionEnabled,
          dailyReportAutoEnabled: this.dailyReportAutoEnabled,
          todoLastRemindDate: this.todoLastRemindDate,
        })
      } catch (e) {
        console.warn('保存待办偏好失败', e)
      }
    },

    initDailyReportHistory() {
      try {
        const list = uni.getStorageSync('dali_admin_daily_report_history_v1')
        if (!Array.isArray(list)) return
        this.dailyReportHistory = list
          .filter((item) => item && item.dateKey && typeof item.text === 'string')
          .slice(0, 30)
      } catch (e) {
        console.warn('读取日报归档失败', e)
      }
    },

    saveDailyReportHistory() {
      try {
        uni.setStorageSync('dali_admin_daily_report_history_v1', this.dailyReportHistory.slice(0, 30))
      } catch (e) {
        console.warn('保存日报归档失败', e)
      }
    },

    createDailyReportSnapshot() {
      const now = new Date()
      const dateKey = this.getTodayDateToken()
      const summary = this.todoTodaySummary
      const topRows = this.todoPriorityQueue
      const topText = topRows.length > 0
        ? topRows.map((item, index) => `${index + 1}. [${item.typeLabel}] ${item.title}｜${item.urgencyText}`).join('\n')
        : '暂无待办'
      const text = [
        '【搭里运营闭环日报】',
        `日期：${summary.dateLabel}`,
        `SLA阈值：${this.todoSlaHours}h`,
        `今日新增举报：${summary.newReportsToday}`,
        `今日已闭环：${summary.closedToday}`,
        `超时未处理：${summary.overdueUnhandled}`,
        `24h即将开始：${summary.upcoming24h}`,
        `当前风险待办：${this.overdueTodoCount}`,
        `24h内闭环率：${this.closureStats.withinSlaRate}`,
        '',
        '优先处理队列 Top8：',
        topText,
      ].join('\n')

      return {
        dateKey,
        dateLabel: summary.dateLabel,
        timeText: this.formatExportTime(now),
        newReportsToday: summary.newReportsToday,
        closedToday: summary.closedToday,
        overdueTotal: this.overdueTodoCount,
        upcoming24h: summary.upcoming24h,
        withinSlaRate: this.closureStats.withinSlaRate,
        text,
      }
    },

    autoArchiveDailyReport() {
      if (!this.dailyReportAutoEnabled || !this.hasAccess || this.loading) return
      const snapshot = this.createDailyReportSnapshot()
      const next = [...this.dailyReportHistory]
      const idx = next.findIndex((item) => item.dateKey === snapshot.dateKey)
      if (idx >= 0) next[idx] = snapshot
      else next.unshift(snapshot)
      this.dailyReportHistory = next
        .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
        .slice(0, 30)
      this.saveDailyReportHistory()
    },

    getArchivedReportByDate(dateKey = '') {
      return (this.dailyReportHistory || []).find((item) => item.dateKey === dateKey) || null
    },

    async copyArchivedReport(dateKey = '') {
      const report = this.getArchivedReportByDate(dateKey)
      if (!report) {
        uni.showToast({ title: '未找到该日归档', icon: 'none' })
        return
      }
      try {
        await this.saveCsvToClipboard(report.text || '')
        uni.showToast({ title: '日报已复制', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      }
    },

    async copyLatestArchivedReport() {
      const latest = this.dailyReportHistoryPreview[0]
      if (!latest) {
        uni.showToast({ title: '暂无归档日报', icon: 'none' })
        return
      }
      await this.copyArchivedReport(latest.dateKey)
    },

    maybeAutoRemindRiskTodos() {
      if (!this.hasAccess || !this.todoAutoRemindEnabled) return
      const totalRisk = this.overdueTodoCount
      if (totalRisk <= 0) return
      const today = this.getTodayDateToken()
      if (this.todoLastRemindDate === today) return
      this.todoLastRemindDate = today
      this.saveTodoPreferences()
      uni.showModal({
        title: '风险待办提醒',
        content: `当前有 ${this.overdueReportTodoCount} 条超时举报、${this.overdueVerifyTodoCount} 条超时认证、${this.urgentActivityTodoCount} 条紧急活动，请优先处理。`,
        confirmText: '去处理',
        cancelText: '稍后',
        success: (res) => {
          if (!res.confirm) return
          this.activeTab = 'todo'
          this.todoOnlyOverdue = true
        },
      })
    },

    async loadData() {
      this.loading = true
      try {
        const res = await callCloud('getAdminDashboard')
        if (!res || !res.success) {
          if (res && res.error === 'UNAUTHORIZED') {
            this.hasAccess = false
            uni.showToast({ title: '无管理员权限', icon: 'none' })
            setTimeout(() => uni.navigateBack(), 1200)
            return
          }
          throw new Error(res?.message || '加载失败')
        }
        this.hasAccess = true
        this.currentAdminOpenid = res.currentOpenid || ''
        this.adminRole = res.adminRole || 'superAdmin'
        this.cityId = res.cityId || 'dali'
        this.pendingVerifyList = res.pendingVerifyList || []
        this.officialVerifyAudit = res.officialVerifyAudit || {
          summary: {
            total: 0,
            success: 0,
            failed: 0,
            processing: 0,
            retriable: 0,
            pendingOfficialCount: 0,
            passRate: null,
            retryUserCount: 0,
            retryConvertedCount: 0,
            retryConversionRate: null,
            topFailReasons: [],
            alertCount24h: 0,
            immediateAlertCount24h: 0,
            thresholdAlertCount24h: 0,
            replayBlocked: 0,
            signatureFailed: 0,
            unauthorizedFailed: 0,
            ipDenied: 0,
          },
          recent: [],
          alerts: [],
        }
        this.opsPatrol = res.opsPatrol || {
          summary: {
            level: 'normal',
            score: 0,
            triggeredCount: 0,
            cityId: this.cityId || 'dali',
            checkedAt: null,
            reportOverdueCount: 0,
            verifyOverdueCount: 0,
            officialVerifyFailedCount: 0,
            supplyAlertLevel: 'normal',
            supplyAlertFlags: [],
            source: '',
            alertCount24h: 0,
            hasRecentRun: false,
          },
          latestChecks: [],
          alerts: [],
          runs: [],
        }
        this.reportList = res.reportList || []
        this.activityList = res.activityList || []
        this.actionLogList = res.actionLogList || []
        const pendingReportIdSet = new Set(
          this.reportList
            .filter((item) => (item.reportStatus || 'PENDING') === 'PENDING')
            .map((item) => item._id)
        )
        this.selectedReportTodoIds = this.selectedReportTodoIds.filter((id) => pendingReportIdSet.has(id))
        const pendingVerifyOpenidSet = new Set((this.pendingVerifyList || []).map((item) => item._openid).filter(Boolean))
        this.selectedVerifyOpenids = this.selectedVerifyOpenids.filter((id) => pendingVerifyOpenidSet.has(id))
        this.autoArchiveDailyReport()
      } catch(e) {
        console.error('加载管理数据失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    opsPatrolLevelText(level = '') {
      const map = {
        high: '高风险',
        medium: '中风险',
        normal: '正常',
      }
      return map[String(level || '').toLowerCase()] || '正常'
    },

    opsPatrolLevelPillClass(level = '') {
      const safe = String(level || '').toLowerCase()
      if (safe === 'high') return 'status-pill--result-risk'
      if (safe === 'medium') return 'status-pill--pending'
      return 'status-pill--handled'
    },

    async runOpsPatrolNow() {
      if (!this.hasAccess || this.opsPatrolRunning) return
      this.opsPatrolRunning = true
      try {
        const ret = await callCloud('runOpsPatrol', {
          source: 'admin_manual',
        })
        if (ret?.success) {
          uni.showToast({ title: `巡检完成：${this.opsPatrolLevelText(ret.level)}`, icon: 'success' })
          await this.loadData()
        } else {
          uni.showToast({ title: ret?.message || '巡检失败', icon: 'none' })
        }
      } catch (e) {
        console.error('手动巡检失败', e)
        uni.showToast({ title: '巡检失败，请稍后重试', icon: 'none' })
      } finally {
        this.opsPatrolRunning = false
      }
    },

    officialAuditStatusText(item = {}) {
      const status = String(item.status || '')
      const map = {
        SUCCESS: '成功',
        PROCESSING: '处理中',
        FAILED_UNAUTHORIZED: '失败:Token无效',
        FAILED_IP_DENIED: '失败:IP不在白名单',
        FAILED_SIGNATURE_MISMATCH: '失败:签名不匹配',
        FAILED_SIGNATURE_EXPIRED: '失败:签名过期',
        FAILED_INVALID_SIGNATURE_PARAMS: '失败:签名参数错误',
        FAILED_SIGN_CONFIG: '失败:签名配置缺失',
        FAILED_REPLAY_ATTACK: '失败:疑似重放攻击',
        FAILED_USER_NOT_FOUND: '失败:用户不存在',
        FAILED_INVALID_PARAMS: '失败:参数错误',
        FAILED_INVALID_RESULT: '失败:结果错误',
      }
      return map[status] || status || '--'
    },

    isOfficialRetrying(openid) {
      return this.officialRetryingOpenids.includes(openid)
    },

    async retryOfficialVerifyFromAudit(item = {}) {
      const targetOpenid = item.userOpenid || item.openid || ''
      if (!targetOpenid) {
        uni.showToast({ title: '缺少用户标识，无法重试', icon: 'none' })
        return
      }
      if (this.isOfficialRetrying(targetOpenid)) return

      uni.showModal({
        title: '确认重试官方认证？',
        content: `将为 ${this.shortOpenid(targetOpenid)} 重新发起官方认证票据`,
        success: async (res) => {
          if (!res.confirm) return
          this.officialRetryingOpenids = [...new Set([...this.officialRetryingOpenids, targetOpenid])]
          try {
            const ret = await callCloud('retryOfficialVerify', {
              targetOpenid,
              reason: '审计看板重试官方实名认证',
            })
            if (ret?.success) {
              uni.showToast({ title: '重试已发起', icon: 'success' })
              await this.loadData()
            } else {
              uni.showToast({ title: ret?.message || '重试失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '重试失败，请稍后重试', icon: 'none' })
          } finally {
            this.officialRetryingOpenids = this.officialRetryingOpenids.filter((id) => id !== targetOpenid)
          }
        },
      })
    },

    // 审核认证（支持快捷模板）
    async verifyUser(openid, action, presetReason = '') {
      const actionText = action === 'verify' ? '通过认证' : '拒绝认证'
      const execute = async (reasonText) => {
        try {
          const result = await callCloud('adminAction', {
            action,
            targetId: openid,
            targetType: 'user',
            reason: reasonText,
            notifyAfterAction: this.todoNotifyAfterActionEnabled,
          })
          if (result.success) {
            uni.showToast({ title: result.message, icon: 'success' })
            await this.loadData()
          } else {
            uni.showToast({ title: result.message || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.showToast({ title: '操作失败，请重试', icon: 'none' })
        }
      }

      if (presetReason) {
        uni.showModal({
          title: `确认${actionText}？`,
          content: `将使用模板原因：${presetReason}`,
          success: async (res) => {
            if (!res.confirm) return
            await execute(presetReason)
          },
        })
        return
      }

      uni.showModal({
        title: `确认${actionText}？`,
        editable: true,
        placeholderText: '填写操作原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因（至少2个字）', icon: 'none' })
            return
          }
          await execute(res.content.trim())
        },
      })
    },

    async verifyUserQuick(openid, action) {
      const reason = this.getDefaultReasonTemplate(action)
      if (!reason) return
      await this.verifyUser(openid, action, reason)
    },

    // 处理举报：下架活动（支持快捷模板）
    async handleReport(reportItem, presetReason = '') {
      const execute = async (reasonText) => {
        this.reportHandlingId = reportItem._id
        this.reportHandlingAction = 'resolve_report_hide'
        try {
          const result = await callCloud('adminAction', {
            action: 'resolve_report_hide',
            reportId: reportItem._id,
            targetId: reportItem.targetId,
            targetType: 'report',
            reason: reasonText,
            notifyAfterAction: this.todoNotifyAfterActionEnabled,
          })
          if (result.success) {
            if (this.activeFilter === 'PENDING') this.activeFilter = 'all'
            uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
            await this.loadData()
            this.markReportHandled(reportItem._id, 'HANDLED')
          } else {
            uni.showToast({ title: result.message || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        } finally {
          this.reportHandlingId = ''
          this.reportHandlingAction = ''
        }
      }

      if (presetReason) {
        uni.showModal({
          title: '确认下架并处理？',
          content: `将使用模板原因：${presetReason}`,
          success: async (res) => {
            if (!res.confirm) return
            await execute(presetReason)
          },
        })
        return
      }

      uni.showModal({
        title: '确认下架此活动？',
        editable: true,
        placeholderText: '填写下架原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          await execute(res.content.trim())
        },
      })
    },

    async handleReportQuick(reportItem) {
      const reason = this.getDefaultReasonTemplate('resolve_report_hide')
      if (!reason) return
      await this.handleReport(reportItem, reason)
    },

    // 忽略举报（支持快捷模板）
    async ignoreReport(reportItem, presetReason = '') {
      const execute = async (reasonText) => {
        this.reportHandlingId = reportItem._id
        this.reportHandlingAction = 'resolve_report_ignore'
        try {
          const result = await callCloud('adminAction', {
            action: 'resolve_report_ignore',
            reportId: reportItem._id,
            targetId: reportItem.targetId,
            targetType: 'report',
            reason: reasonText,
            notifyAfterAction: this.todoNotifyAfterActionEnabled,
          })
          if (result.success) {
            if (this.activeFilter === 'PENDING') this.activeFilter = 'all'
            uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
            await this.loadData()
            this.markReportHandled(reportItem._id, 'IGNORED')
          } else {
            uni.showToast({ title: result.message || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        } finally {
          this.reportHandlingId = ''
          this.reportHandlingAction = ''
        }
      }

      if (presetReason) {
        uni.showModal({
          title: '确认忽略并处理？',
          content: `将使用模板原因：${presetReason}`,
          success: async (res) => {
            if (!res.confirm) return
            await execute(presetReason)
          },
        })
        return
      }

      uni.showModal({
        title: '确认忽略该举报？',
        editable: true,
        placeholderText: '填写忽略原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          await execute(res.content.trim())
        },
      })
    },

    async ignoreReportQuick(reportItem) {
      const reason = this.getDefaultReasonTemplate('resolve_report_ignore')
      if (!reason) return
      await this.ignoreReport(reportItem, reason)
    },

    // 推荐/取消推荐活动
    async recommendActivity(activityId, action) {
      const actionText = action === 'recommend' ? '设为官方推荐' : '取消官方推荐'
      uni.showModal({
        title: `确认${actionText}？`,
        editable: true,
        placeholderText: '填写操作原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action,
              targetId: activityId,
              targetType: 'activity',
              reason: res.content,
              notifyAfterAction: this.todoNotifyAfterActionEnabled,
            })
            if (result.success) {
              uni.showToast({ title: result.message, icon: 'success' })
              await this.loadData()
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    // 下架活动
    async hideActivity(activityId) {
      uni.showModal({
        title: '确认下架此活动？',
        editable: true,
        placeholderText: '填写下架原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action: 'hide',
              targetId: activityId,
              targetType: 'activity',
              reason: res.content,
              notifyAfterAction: this.todoNotifyAfterActionEnabled,
            })
            if (result.success) {
              uni.showToast({ title: '活动已下架', icon: 'success' })
              await this.loadData()
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    goActivityDetail(activityId) {
      if (!activityId) {
        uni.showToast({ title: '缺少活动ID', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/detail/index?id=${activityId}`,
      })
    },

    statusText(status) {
      const map = { OPEN: '招募中', FULL: '已满员', ENDED: '已结束', CANCELLED: '已取消' }
      return map[status] || status
    },

    reportStatusText(status) {
      const map = {
        PENDING: '待处理',
        HANDLED: '已处理',
        IGNORED: '已忽略',
      }
      return map[status] || '待处理'
    },

    handleActionText(action) {
      const map = {
        HIDE_ACTIVITY: '已下架活动',
        IGNORE: '已忽略举报',
      }
      return map[action] || '已处理'
    },

    reportStatusClass(status) {
      const map = {
        PENDING: 'status-pill--pending',
        HANDLED: 'status-pill--handled',
        IGNORED: 'status-pill--ignored',
      }
      return map[status] || 'status-pill--pending'
    },

    isHandlingReport(reportId, action = '') {
      if (!reportId || this.reportHandlingId !== reportId) return false
      if (!action) return true
      return this.reportHandlingAction === action
    },

    markReportHandled(reportId, status) {
      this.lastHandledReportId = reportId
      this.lastHandledReportStatus = status
      if (this.reportHighlightTimer) clearTimeout(this.reportHighlightTimer)
      this.reportHighlightTimer = setTimeout(() => {
        this.lastHandledReportId = ''
        this.lastHandledReportStatus = ''
        this.reportHighlightTimer = null
      }, 8000)
    },

    isRecentHandled(reportId, status) {
      return this.lastHandledReportId === reportId && this.lastHandledReportStatus === status
    },

    activityStatusClass(status) {
      const map = {
        OPEN: 'status-pill--open',
        FULL: 'status-pill--full',
        ENDED: 'status-pill--ended',
        CANCELLED: 'status-pill--cancelled',
      }
      return map[status] || 'status-pill--open'
    },

    actionText(action) {
      const map = {
        recommend: '设为推荐',
        unrecommend: '取消推荐',
        hide: '手动下架活动',
        verify: '通过实名认证',
        reject_verify: '拒绝实名认证',
        official_verify_retry: '重试官方认证',
        official_verify_callback: '官方回调处理',
        official_verify_alert: '官方认证异常告警',
        official_verify_alert_immediate: '官方认证高危即时告警',
        ops_patrol_run: '运营自动巡检执行',
        ops_patrol_alert: '运营巡检风险告警',
        mark_attendance: '到场/爽约标记',
        ban: '封禁用户',
        resolve_report_hide: '举报处理并下架',
        resolve_report_ignore: '举报处理并忽略',
      }
      return map[action] || action
    },

    actionSourceText(source) {
      if (source === 'ai') return 'AI'
      return '人工'
    },

    notifySummaryText(summary) {
      if (!summary || typeof summary !== 'object') return '未返回通知结果'
      if (summary.skipped) {
        return summary.reason === 'NO_TARGET' ? '无可通知对象' : '未触发'
      }
      const attempted = Number(summary.attempted || 0)
      const success = Number(summary.success || 0)
      return `发送 ${success}/${attempted}`
    },

    targetTypeText(type) {
      const map = {
        activity: '活动',
        user: '用户',
        report: '举报',
      }
      return map[type] || '记录'
    },

    resultToneClass(action) {
      const map = {
        recommend: 'status-pill--result-positive',
        verify: 'status-pill--result-positive',
        official_verify_callback: 'status-pill--result-positive',
        unrecommend: 'status-pill--result-neutral',
        resolve_report_ignore: 'status-pill--result-neutral',
        official_verify_retry: 'status-pill--result-neutral',
        ops_patrol_run: 'status-pill--result-neutral',
        hide: 'status-pill--result-risk',
        ban: 'status-pill--result-risk',
        reject_verify: 'status-pill--result-risk',
        resolve_report_hide: 'status-pill--result-risk',
        official_verify_alert: 'status-pill--result-risk',
        official_verify_alert_immediate: 'status-pill--result-risk',
        ops_patrol_alert: 'status-pill--result-risk',
      }
      return map[action] || 'status-pill--result-default'
    },

    isLogInTimeRange(createdAt) {
      if (this.activeTab !== 'logs') return true
      if (this.logTimeRange === 'all') return true

      const ts = new Date(createdAt).getTime()
      if (!Number.isFinite(ts)) return false

      const now = new Date()
      if (this.logTimeRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        return ts >= start
      }

      if (this.logTimeRange === 'last7') {
        return ts >= (now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      if (this.logTimeRange === 'custom') {
        const start = this.getRangeDateBoundary(this.logCustomStartDate, false)
        const end = this.getRangeDateBoundary(this.logCustomEndDate, true)
        if (!Number.isFinite(start) || !Number.isFinite(end)) return true
        return ts >= start && ts <= end
      }

      return true
    },

    normalizeKeyword(text) {
      return String(text || '').trim().toLowerCase()
    },

    matchAny(keyword, values) {
      return values.some((item) => String(item || '').toLowerCase().includes(keyword))
    },

    shortOpenid(openid) {
      if (!openid) return ''
      return openid.slice(0, 6) + '...'
    },

    formatTime(t) {
      if (!t) return '--'
      const d = new Date(t)
      if (Number.isNaN(d.getTime())) return '--'
      const mo = d.getMonth() + 1
      const day = d.getDate()
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return `${mo}/${day} ${h}:${m}`
    },

    formatDateToken(d = new Date()) {
      const y = d.getFullYear()
      const mo = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      const s = d.getSeconds().toString().padStart(2, '0')
      return `${y}${mo}${day}_${h}${m}${s}`
    },

    formatExportTime(d = new Date()) {
      const y = d.getFullYear()
      const mo = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      const s = d.getSeconds().toString().padStart(2, '0')
      return `${y}-${mo}-${day} ${h}:${m}:${s}`
    },

    escapeCsvCell(value) {
      const text = value === null || value === undefined ? '' : String(value)
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    },

    buildCsvLine(values = []) {
      return values.map((item) => this.escapeCsvCell(item)).join(',')
    },

    toTimestamp(value) {
      const ts = new Date(value).getTime()
      return Number.isFinite(ts) ? ts : NaN
    },

    formatYmd(dateLike) {
      const date = new Date(dateLike)
      if (Number.isNaN(date.getTime())) return ''
      const y = date.getFullYear()
      const mo = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${y}-${mo}-${day}`
    },

    formatMd(dateLike) {
      const date = new Date(dateLike)
      if (Number.isNaN(date.getTime())) return '--'
      return `${date.getMonth() + 1}/${date.getDate()}`
    },

    getWeekStartDate(dateLike) {
      const date = new Date(dateLike)
      if (Number.isNaN(date.getTime())) return null
      const day = date.getDay()
      const diff = day === 0 ? 6 : day - 1
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff, 0, 0, 0, 0)
      return start
    },

    buildWeekPeriods(windowSize = 12) {
      const safeWindow = Math.min(Math.max(Number(windowSize) || 12, 4), 24)
      const currentWeekStart = this.getWeekStartDate(new Date())
      const periods = []
      if (!currentWeekStart) return periods

      for (let i = safeWindow - 1; i >= 0; i -= 1) {
        const start = new Date(currentWeekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
        end.setHours(23, 59, 59, 999)
        periods.push({
          key: this.formatYmd(start),
          label: `${this.formatMd(start)}-${this.formatMd(end)}`,
          startTs: start.getTime(),
          endTs: end.getTime(),
        })
      }
      return periods
    },

    buildMonthPeriods(windowSize = 6) {
      const safeWindow = Math.min(Math.max(Number(windowSize) || 6, 3), 18)
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const periods = []

      for (let i = safeWindow - 1; i >= 0; i -= 1) {
        const start = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1, 0, 0, 0, 0)
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
        const y = start.getFullYear()
        const mo = `${start.getMonth() + 1}`.padStart(2, '0')
        periods.push({
          key: `${y}-${mo}`,
          label: `${y}-${mo}`,
          startTs: start.getTime(),
          endTs: end.getTime(),
        })
      }
      return periods
    },

    resolveActionActivityId(item = {}) {
      if (item.linkedActivityId) return item.linkedActivityId
      if (item.targetType === 'activity' && item.targetId) return item.targetId
      return ''
    },

    isInPeriod(ts, period) {
      return Number.isFinite(ts) && ts >= period.startTs && ts <= period.endTs
    },

    formatRate(current, previous) {
      if (!Number.isFinite(current) || !Number.isFinite(previous)) return '-'
      if (previous === 0) {
        if (current === 0) return '0.0%'
        return '+∞'
      }
      const value = ((current - previous) / previous) * 100
      const sign = value > 0 ? '+' : ''
      return `${sign}${value.toFixed(1)}%`
    },

    normalizeTrendCategory(categoryId = '') {
      const safe = String(categoryId || '').trim().toLowerCase()
      if (['sport', 'music', 'reading', 'game', 'social', 'outdoor', 'other'].includes(safe)) {
        return safe
      }
      return 'other'
    },

    calcMiniBarWidth(value, max = 1) {
      const safeValue = Number(value) || 0
      if (safeValue <= 0) return '0%'
      const safeMax = Number(max) > 0 ? Number(max) : 1
      const pct = Math.max(10, Math.round((safeValue / safeMax) * 100))
      return `${Math.min(100, pct)}%`
    },

    buildTrendRows(periods = []) {
      const highRiskActionSet = new Set(['hide', 'ban', 'resolve_report_hide', 'reject_verify', 'official_verify_alert', 'official_verify_alert_immediate', 'ops_patrol_alert'])
      const reportHandledStatusSet = new Set(['HANDLED', 'IGNORED'])
      const reportHandleActionSet = new Set(['resolve_report_hide', 'resolve_report_ignore'])

      const rows = periods.map((period) => {
        const touchedActivities = new Set()
        const activeAdmins = new Set()
        const categoryPublishedMap = {
          sport: 0,
          music: 0,
          reading: 0,
          game: 0,
          social: 0,
          outdoor: 0,
          other: 0,
        }
        let publishedActivityCount = 0
        let publishedRecommendedCount = 0
        this.activityList.forEach((item) => {
          const ts = this.toTimestamp(item.createdAt)
          if (!this.isInPeriod(ts, period)) return
          publishedActivityCount += 1
          if (item.isRecommended) publishedRecommendedCount += 1
          const category = this.normalizeTrendCategory(item.categoryId)
          categoryPublishedMap[category] = (categoryPublishedMap[category] || 0) + 1
        })

        const newReportCount = this.reportList.reduce((count, item) => {
          const ts = this.toTimestamp(item.createdAt)
          return count + (this.isInPeriod(ts, period) ? 1 : 0)
        }, 0)

        const handledReportCount = this.reportList.reduce((count, item) => {
          if (!reportHandledStatusSet.has(item.reportStatus)) return count
          const ts = this.toTimestamp(item.handledAt)
          return count + (this.isInPeriod(ts, period) ? 1 : 0)
        }, 0)

        let adminActionCount = 0
        let highRiskActionCount = 0
        let reportHandleActionCount = 0
        this.actionLogList.forEach((item) => {
          const ts = this.toTimestamp(item.createdAt)
          if (!this.isInPeriod(ts, period)) return
          adminActionCount += 1
          if (highRiskActionSet.has(item.action)) highRiskActionCount += 1
          if (reportHandleActionSet.has(item.action)) reportHandleActionCount += 1
          const activityId = this.resolveActionActivityId(item)
          if (activityId) touchedActivities.add(activityId)
          if (item.adminOpenid) activeAdmins.add(item.adminOpenid)
        })

        return {
          ...period,
          publishedActivityCount,
          publishedRecommendedCount,
          categoryPublishedMap,
          newReportCount,
          handledReportCount,
          adminActionCount,
          highRiskActionCount,
          reportHandleActionCount,
          touchedActivityCount: touchedActivities.size,
          activeAdminCount: activeAdmins.size,
        }
      })

      return rows.map((row, index) => {
        const prev = rows[index - 1]
        return {
          ...row,
          activityGrowthRate: prev ? this.formatRate(row.publishedActivityCount, prev.publishedActivityCount) : '-',
          reportGrowthRate: prev ? this.formatRate(row.newReportCount, prev.newReportCount) : '-',
          actionGrowthRate: prev ? this.formatRate(row.adminActionCount, prev.adminActionCount) : '-',
        }
      })
    },

    trendMetricBarWidth(value) {
      const safeValue = Number(value) || 0
      if (safeValue <= 0) return '0%'
      const max = Number(this.trendDashboardScaleMax) || 1
      const pct = Math.max(8, Math.round((safeValue / max) * 100))
      return `${Math.min(100, pct)}%`
    },

    closureTrendBarWidth(value) {
      const safeValue = Number(value) || 0
      if (safeValue <= 0) return '0%'
      const max = Number(this.closureTrendScaleMax) || 1
      const pct = Math.max(8, Math.round((safeValue / max) * 100))
      return `${Math.min(100, pct)}%`
    },

    slaBucketWidth(value) {
      const safeValue = Number(value) || 0
      if (safeValue <= 0) return '0%'
      const max = Number(this.slaSegmentBoard.maxBucketCount) || 1
      const pct = Math.max(8, Math.round((safeValue / max) * 100))
      return `${Math.min(100, pct)}%`
    },

    buildTrendInsightText() {
      const modeText = this.trendDashboardMode === 'month'
        ? `月趋势（近${this.trendMonthWindow}月）`
        : `周趋势（近${this.trendWeekWindow}周）`
      const rows = this.trendDashboardRows
      const latest = rows[rows.length - 1]
      if (!latest) {
        return `【搭里运营看板解读】\n口径：${modeText}\n暂无可分析数据，可先导入趋势测试数据。`
      }

      const topActionRow = [...rows]
        .sort((a, b) => (b.adminActionCount || 0) - (a.adminActionCount || 0))[0]
      const topReportRow = [...rows]
        .sort((a, b) => (b.newReportCount || 0) - (a.newReportCount || 0))[0]
      const latestCategoryMap = latest.categoryPublishedMap || {}
      const categoryPairs = [
        ['运动', Number(latestCategoryMap.sport || 0)],
        ['音乐', Number(latestCategoryMap.music || 0)],
        ['读书', Number(latestCategoryMap.reading || 0)],
      ]
      const topCategory = categoryPairs.sort((a, b) => b[1] - a[1])[0]

      return [
        '【搭里运营看板解读】',
        `口径：${modeText}`,
        `当前周期：${latest.label}`,
        `新发布活动：${latest.publishedActivityCount}（环比 ${latest.activityGrowthRate}）`,
        `分类发布：运动 ${latestCategoryMap.sport || 0} / 音乐 ${latestCategoryMap.music || 0} / 读书 ${latestCategoryMap.reading || 0}`,
        `分类主力：${topCategory?.[0] || '-'}（${topCategory?.[1] || 0}）`,
        `新增举报：${latest.newReportCount}（环比 ${latest.reportGrowthRate}）`,
        `管理动作：${latest.adminActionCount}（环比 ${latest.actionGrowthRate}）`,
        `本周期已处理举报：${latest.handledReportCount}，高风险动作：${latest.highRiskActionCount}`,
        `管理最繁忙周期：${topActionRow?.label || '-'}（动作 ${topActionRow?.adminActionCount || 0}）`,
        `举报最高周期：${topReportRow?.label || '-'}（新增举报 ${topReportRow?.newReportCount || 0}）`,
      ].join('\n')
    },

    buildTodoBriefText() {
      const summary = this.todoTodaySummary
      const topRows = this.todoPriorityQueue
      const topText = topRows.length > 0
        ? topRows.map((item, index) => (
          `${index + 1}. [${item.typeLabel}] ${item.title}｜${item.urgencyText}`
        )).join('\n')
        : '暂无待办'
      const riskText = this.todoOnlyOverdue ? '只看风险项：开启' : '只看风险项：关闭'
      return [
        '【搭里运营闭环日报】',
        `日期：${summary.dateLabel}`,
        `SLA阈值：${this.todoSlaHours}h`,
        riskText,
        `今日新增举报：${summary.newReportsToday}`,
        `今日已闭环：${summary.closedToday}`,
        `超时未处理：${summary.overdueUnhandled}`,
        `24h即将开始：${summary.upcoming24h}`,
        `当前待办总数：${this.todoViewTotalCount}`,
        `风险待办：${this.overdueTodoCount}`,
        '',
        '优先处理队列 Top8：',
        topText,
      ].join('\n')
    },

    buildTrendCsv() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const weekPeriods = this.buildWeekPeriods(this.trendWeekWindow)
      const monthPeriods = this.buildMonthPeriods(this.trendMonthWindow)
      const weekRows = this.buildTrendRows(weekPeriods)
      const monthRows = this.buildTrendRows(monthPeriods)

      append(['搭里运营看板趋势报表（周/月）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['周窗口', `近${this.trendWeekWindow}周`])
      append(['月窗口', `近${this.trendMonthWindow}月`])
      append(['数据口径', 'activityList.createdAt / reportList.createdAt|handledAt / actionLogList.createdAt'])
      append([])

      append(['一、周趋势（运营看板口径）'])
      append([
        '周序',
        '周范围',
        '新发布活动',
        '运动发布',
        '音乐发布',
        '读书发布',
        '新发布推荐活动',
        '新增举报',
        '已处理举报',
        '管理动作',
        '高风险动作',
        '举报处理动作',
        '触达活动数',
        '活跃管理员数',
        '活动发布环比',
        '举报环比',
        '管理动作环比',
      ])
      if (weekRows.length === 0) {
        append(['-', '-', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '-', '-', '-'])
      } else {
        weekRows.forEach((row, index) => {
          const categoryMap = row.categoryPublishedMap || {}
          append([
            index + 1,
            row.label,
            row.publishedActivityCount,
            categoryMap.sport || 0,
            categoryMap.music || 0,
            categoryMap.reading || 0,
            row.publishedRecommendedCount,
            row.newReportCount,
            row.handledReportCount,
            row.adminActionCount,
            row.highRiskActionCount,
            row.reportHandleActionCount,
            row.touchedActivityCount,
            row.activeAdminCount,
            row.activityGrowthRate,
            row.reportGrowthRate,
            row.actionGrowthRate,
          ])
        })
      }
      append([])

      append(['二、月趋势（运营看板口径）'])
      append([
        '月序',
        '月份',
        '新发布活动',
        '运动发布',
        '音乐发布',
        '读书发布',
        '新发布推荐活动',
        '新增举报',
        '已处理举报',
        '管理动作',
        '高风险动作',
        '举报处理动作',
        '触达活动数',
        '活跃管理员数',
        '活动发布环比',
        '举报环比',
        '管理动作环比',
      ])
      if (monthRows.length === 0) {
        append(['-', '-', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '-', '-', '-'])
      } else {
        monthRows.forEach((row, index) => {
          const categoryMap = row.categoryPublishedMap || {}
          append([
            index + 1,
            row.label,
            row.publishedActivityCount,
            categoryMap.sport || 0,
            categoryMap.music || 0,
            categoryMap.reading || 0,
            row.publishedRecommendedCount,
            row.newReportCount,
            row.handledReportCount,
            row.adminActionCount,
            row.highRiskActionCount,
            row.reportHandleActionCount,
            row.touchedActivityCount,
            row.activeAdminCount,
            row.activityGrowthRate,
            row.reportGrowthRate,
            row.actionGrowthRate,
          ])
        })
      }

      return lines.join('\n')
    },

    async copyTodoBrief() {
      try {
        const text = this.buildTodoBriefText()
        await this.saveCsvToClipboard(text)
        uni.showToast({ title: '今日简报已复制', icon: 'success' })
      } catch (e) {
        console.error('复制今日简报失败', e)
        uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      }
    },

    async copyTrendInsight() {
      try {
        const text = this.buildTrendInsightText()
        await this.saveCsvToClipboard(text)
        uni.showToast({ title: '看板解读已复制', icon: 'success' })
      } catch (e) {
        console.error('复制看板解读失败', e)
        uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      }
    },

    getCurrentLogExportContext() {
      const exportLogList = this.filteredActionLogList
      const exportDetailFieldDefs = this.getExportDetailFieldDefs()
      const exportRangeText = this.logTimeRange === 'custom'
        ? `${this.logCustomStartDate || '--'} 至 ${this.logCustomEndDate || '--'}`
        : this.logTimeRange
      const selectedFieldText = exportDetailFieldDefs.map((item) => item.label).join(' / ')
      return {
        exportLogList,
        exportDetailFieldDefs,
        exportRangeText,
        selectedFieldText,
      }
    },

    buildStatsCsv() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const {
        exportLogList,
        exportDetailFieldDefs,
        exportRangeText,
        selectedFieldText,
      } = this.getCurrentLogExportContext()

      const now = new Date()
      const statusCounter = { OPEN: 0, FULL: 0, ENDED: 0, CANCELLED: 0 }
      this.activityList.forEach((item) => {
        const s = item.status || 'OPEN'
        statusCounter[s] = (statusCounter[s] || 0) + 1
      })

      const reportCounter = { PENDING: 0, HANDLED: 0, IGNORED: 0 }
      this.reportList.forEach((item) => {
        const s = item.reportStatus || 'PENDING'
        reportCounter[s] = (reportCounter[s] || 0) + 1
      })

      const actionCounter = {}
      exportLogList.forEach((item) => {
        const k = item.action || 'unknown'
        actionCounter[k] = (actionCounter[k] || 0) + 1
      })
      const sortedActionRows = Object.keys(actionCounter)
        .sort((a, b) => actionCounter[b] - actionCounter[a])
        .map((action) => [this.actionText(action), action, actionCounter[action]])

      const topReportedActivities = [...this.activityList]
        .map((item) => ({
          activityId: item._id || '',
          title: item.title || '',
          status: item.status || '',
          reportTotal: Number(item.reportMeta?.total || 0),
          reportPending: Number(item.reportMeta?.pending || 0),
          publisherNickname: item.publisherNickname || '',
        }))
        .filter((item) => item.reportTotal > 0)
        .sort((a, b) => b.reportTotal - a.reportTotal)
        .slice(0, 20)

      append(['搭里管理统计报表（CSV）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['当前页面', this.activeTab])
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${exportRangeText}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append(['明细字段', selectedFieldText || '-'])
      append([])

      append(['一、总览指标'])
      append(['指标', '数值'])
      append(['待审认证', this.pendingVerifyList.length])
      append(['待处理举报', reportCounter.PENDING || 0])
      append(['活跃活动(OPEN+FULL)', this.activeActivityCount])
      append(['活动总量', this.activityList.length])
      append(['举报记录总量', this.reportList.length])
      append(['操作记录总量', this.actionLogList.length])
      append(['导出范围操作记录', exportLogList.length])
      append([])

      append(['二、活动状态统计'])
      append(['状态', '数量'])
      append(['OPEN(招募中)', statusCounter.OPEN || 0])
      append(['FULL(已满员)', statusCounter.FULL || 0])
      append(['ENDED(已结束)', statusCounter.ENDED || 0])
      append(['CANCELLED(已取消)', statusCounter.CANCELLED || 0])
      append(['官方推荐活动数', this.activityList.filter((item) => !!item.isRecommended).length])
      append([])

      append(['三、举报处理统计'])
      append(['状态', '数量'])
      append(['PENDING(待处理)', reportCounter.PENDING || 0])
      append(['HANDLED(已处理)', reportCounter.HANDLED || 0])
      append(['IGNORED(已忽略)', reportCounter.IGNORED || 0])
      append([])

      append(['四、操作类型统计'])
      append(['动作中文', '动作编码', '次数'])
      sortedActionRows.forEach((row) => append(row))
      append([])

      append(['五、被举报活动 Top20'])
      append(['活动ID', '活动标题', '状态', '累计举报', '待处理举报', '发布者'])
      if (topReportedActivities.length === 0) {
        append(['-', '暂无', '-', 0, 0, '-'])
      } else {
        topReportedActivities.forEach((row) => {
          append([row.activityId, row.title, row.status, row.reportTotal, row.reportPending, row.publisherNickname])
        })
      }
      append([])

      append(['六、当前筛选下的操作记录明细'])
      append(exportDetailFieldDefs.map((item) => item.label))
      if (exportLogList.length === 0) {
        append(exportDetailFieldDefs.map(() => '-'))
      } else {
        exportLogList.forEach((item) => {
          append(exportDetailFieldDefs.map((field) => field.value(item)))
        })
      }

      return lines.join('\n')
    },

    buildSummaryCsvV2() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const { exportLogList, exportRangeText, selectedFieldText } = this.getCurrentLogExportContext()
      const highRiskActionSet = new Set(['hide', 'ban', 'resolve_report_hide', 'reject_verify', 'official_verify_alert', 'official_verify_alert_immediate', 'ops_patrol_alert'])
      const reportHandleActionSet = new Set(['resolve_report_hide', 'resolve_report_ignore'])
      const activityMap = this.activityList.reduce((acc, item) => {
        if (item && item._id) acc[item._id] = item
        return acc
      }, {})

      const activityAggMap = {}
      exportLogList.forEach((item) => {
        const activityId = item.linkedActivityId || (item.targetType === 'activity' ? item.targetId : '')
        if (!activityId) return
        const baseActivity = activityMap[activityId] || item.linkedActivity || {}
        if (!activityAggMap[activityId]) {
          activityAggMap[activityId] = {
            activityId,
            title: baseActivity.title || '',
            status: baseActivity.status || '',
            publisherNickname: baseActivity.publisherNickname || '',
            actionCount: 0,
            highRiskCount: 0,
            reportHandleCount: 0,
            recommendCount: 0,
            latestActionAt: '',
            latestTs: 0,
            totalReports: Number(baseActivity.reportMeta?.total || 0),
            pendingReports: Number(baseActivity.reportMeta?.pending || 0),
          }
        }
        const row = activityAggMap[activityId]
        row.actionCount += 1
        if (highRiskActionSet.has(item.action)) row.highRiskCount += 1
        if (reportHandleActionSet.has(item.action)) row.reportHandleCount += 1
        if (item.action === 'recommend' || item.action === 'unrecommend') row.recommendCount += 1
        const ts = new Date(item.createdAt).getTime()
        if (Number.isFinite(ts) && ts > row.latestTs) {
          row.latestTs = ts
          row.latestActionAt = item.createdAt || ''
        }
      })
      const activityAggList = Object.values(activityAggMap).sort((a, b) => (
        b.actionCount - a.actionCount || b.latestTs - a.latestTs
      ))

      const operatorAggMap = {}
      exportLogList.forEach((item) => {
        const key = `${item.adminOpenid || ''}__${item.adminRole || 'superAdmin'}`
        if (!operatorAggMap[key]) {
          operatorAggMap[key] = {
            adminOpenid: item.adminOpenid || '',
            adminRole: item.adminRole || 'superAdmin',
            actionCount: 0,
            highRiskCount: 0,
            reportHandleCount: 0,
            touchedActivities: new Set(),
            latestActionAt: '',
            latestTs: 0,
          }
        }
        const row = operatorAggMap[key]
        row.actionCount += 1
        if (highRiskActionSet.has(item.action)) row.highRiskCount += 1
        if (reportHandleActionSet.has(item.action)) row.reportHandleCount += 1
        const activityId = item.linkedActivityId || (item.targetType === 'activity' ? item.targetId : '')
        if (activityId) row.touchedActivities.add(activityId)
        const ts = new Date(item.createdAt).getTime()
        if (Number.isFinite(ts) && ts > row.latestTs) {
          row.latestTs = ts
          row.latestActionAt = item.createdAt || ''
        }
      })
      const operatorAggList = Object.values(operatorAggMap)
        .map((row) => ({
          ...row,
          touchedActivityCount: row.touchedActivities.size,
        }))
        .sort((a, b) => b.actionCount - a.actionCount || b.latestTs - a.latestTs)

      const actionCounter = {}
      exportLogList.forEach((item) => {
        const action = item.action || 'unknown'
        actionCounter[action] = (actionCounter[action] || 0) + 1
      })
      const actionRows = Object.keys(actionCounter)
        .sort((a, b) => actionCounter[b] - actionCounter[a])
        .map((action) => [action, this.actionText(action), actionCounter[action]])

      append(['搭里管理统计报表（二期-汇总）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${exportRangeText}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append(['明细字段', selectedFieldText || '-'])
      append(['导出范围操作记录', exportLogList.length])
      append([])

      append(['一、活动维度聚合（按当前筛选日志）'])
      append(['活动ID', '活动标题', '状态', '发布者', '管理动作总数', '高风险动作', '举报处理动作', '推荐相关动作', '累计举报', '待处理举报', '最近动作时间'])
      if (activityAggList.length === 0) {
        append(['-', '暂无', '-', '-', 0, 0, 0, 0, 0, 0, '-'])
      } else {
        activityAggList.forEach((row) => {
          append([
            row.activityId,
            row.title,
            row.status,
            row.publisherNickname,
            row.actionCount,
            row.highRiskCount,
            row.reportHandleCount,
            row.recommendCount,
            row.totalReports,
            row.pendingReports,
            row.latestActionAt ? this.formatExportTime(new Date(row.latestActionAt)) : '',
          ])
        })
      }
      append([])

      append(['二、管理员维度聚合（按当前筛选日志）'])
      append(['管理员OPENID', '管理员角色', '管理动作总数', '高风险动作', '举报处理动作', '触达活动数', '最近动作时间'])
      if (operatorAggList.length === 0) {
        append(['-', '-', 0, 0, 0, 0, '-'])
      } else {
        operatorAggList.forEach((row) => {
          append([
            row.adminOpenid,
            row.adminRole,
            row.actionCount,
            row.highRiskCount,
            row.reportHandleCount,
            row.touchedActivityCount,
            row.latestActionAt ? this.formatExportTime(new Date(row.latestActionAt)) : '',
          ])
        })
      }
      append([])

      append(['三、动作维度聚合（按当前筛选日志）'])
      append(['动作编码', '动作中文', '次数'])
      if (actionRows.length === 0) {
        append(['-', '-', 0])
      } else {
        actionRows.forEach((row) => append(row))
      }

      return lines.join('\n')
    },

    buildDetailCsvV2() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const {
        exportLogList,
        exportDetailFieldDefs,
        exportRangeText,
        selectedFieldText,
      } = this.getCurrentLogExportContext()

      append(['搭里管理统计报表（二期-明细）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${exportRangeText}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append(['明细字段', selectedFieldText || '-'])
      append(['记录数量', exportLogList.length])
      append([])

      append(['序号', ...exportDetailFieldDefs.map((item) => item.label)])
      if (exportLogList.length === 0) {
        append(['-', ...exportDetailFieldDefs.map(() => '-')])
      } else {
        exportLogList.forEach((item, index) => {
          append([index + 1, ...exportDetailFieldDefs.map((field) => field.value(item))])
        })
      }

      return lines.join('\n')
    },

    buildOfficialVerifyCsv() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const summary = this.officialVerifyAuditSummary
      const recent = this.officialVerifyRecentList
      const alerts = this.officialVerifyAlertList

      append(['搭里官方实名认证审计报表（3.1）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append([])

      append(['一、核心指标'])
      append(['指标', '数值'])
      append(['回调总数', summary.total || 0])
      append(['成功数', summary.success || 0])
      append(['失败数', summary.failed || 0])
      append(['处理中', summary.processing || 0])
      append(['可重试', summary.retriable || 0])
      append(['待回调用户', summary.pendingOfficialCount || 0])
      append(['通过率', summary.passRate == null ? '-' : `${Math.round(summary.passRate * 100)}%`])
      append(['重试用户', summary.retryUserCount || 0])
      append(['重试转化通过', summary.retryConvertedCount || 0])
      append(['重试转化率', summary.retryConversionRate == null ? '-' : `${Math.round(summary.retryConversionRate * 100)}%`])
      append(['24h告警数', summary.alertCount24h || 0])
      append(['24h即时告警数', summary.immediateAlertCount24h || 0])
      append(['24h阈值告警数', summary.thresholdAlertCount24h || 0])
      append(['重放拦截数', summary.replayBlocked || 0])
      append(['签名失败数', summary.signatureFailed || 0])
      append(['Token失败数', summary.unauthorizedFailed || 0])
      append(['IP白名单失败数', summary.ipDenied || 0])
      append([])

      append(['二、失败原因 Top'])
      append(['失败原因', '次数'])
      const topReasons = Array.isArray(summary.topFailReasons) ? summary.topFailReasons : []
      if (topReasons.length === 0) {
        append(['-', 0])
      } else {
        topReasons.forEach((item) => append([item.reason || '-', item.count || 0]))
      }
      append([])

      append(['三、最近回调明细（Top8）'])
      append(['时间', '状态', '结果', '用户', '重试次数', '错误码', '消息', '幂等键'])
      if (recent.length === 0) {
        append(['-', '-', '-', '-', 0, '-', '-', '-'])
      } else {
        recent.forEach((item) => {
          append([
            this.formatTime(item.updatedAt || item.createdAt),
            item.status || '',
            item.result || '',
            this.shortOpenid(item.userOpenid || item.openid),
            Number(item.retryCount || 0),
            item.error || '',
            item.message || '',
            (item.idempotencyKey || '').slice(0, 60),
          ])
        })
      }
      append([])

      append(['四、最近告警（Top3）'])
      append(['时间', '告警类型', '原因', '结果'])
      if (alerts.length === 0) {
        append(['-', '-', '-', '-'])
      } else {
        alerts.forEach((item) => {
          append([
            this.formatTime(item.createdAt),
            item.action === 'official_verify_alert_immediate' ? '即时告警' : '阈值告警',
            item.reason || '',
            item.result || '',
          ])
        })
      }

      return lines.join('\n')
    },

    async saveCsvToClipboard(csvText) {
      return new Promise((resolve, reject) => {
        uni.setClipboardData({
          data: csvText,
          success: resolve,
          fail: reject,
        })
      })
    },

    async saveCsvToFile(csvText, fileName) {
      return new Promise((resolve, reject) => {
        if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH) {
          reject(new Error('CURRENT_ENV_NOT_SUPPORT_FILE'))
          return
        }
        const fs = wx.getFileSystemManager()
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
        fs.writeFile({
          filePath,
          data: `\uFEFF${csvText}`,
          encoding: 'utf8',
          success: () => resolve(filePath),
          fail: (err) => reject(err),
        })
      })
    },

    async openCsvFile(filePath) {
      return new Promise((resolve, reject) => {
        if (typeof wx === 'undefined' || !wx.openDocument) {
          reject(new Error('OPEN_DOCUMENT_NOT_SUPPORT'))
          return
        }
        wx.openDocument({
          filePath,
          fileType: 'csv',
          showMenu: true,
          success: resolve,
          fail: reject,
        })
      })
    },

    async exportStatsCsv() {
      if (this.csvExporting || this.csvExportingV2 || this.trendCsvExporting) return
      this.csvExporting = true
      try {
        const csvText = this.buildStatsCsv()
        const fileName = `dali_admin_report_${this.formatDateToken(new Date())}.csv`

        try {
          const filePath = await this.saveCsvToFile(csvText, fileName)
          await this.openCsvFile(filePath)
          uni.showToast({ title: 'CSV已生成', icon: 'success' })
          return
        } catch (fileErr) {
          console.warn('保存CSV文件失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(csvText)
        uni.showModal({
          title: '已复制CSV内容',
          content: '当前环境不支持直接打开文件，已复制到剪贴板，可粘贴到表格工具保存为 .csv',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出CSV失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.csvExporting = false
      }
    },

    async exportOfficialVerifyCsv() {
      if (this.officialCsvExporting || this.csvExporting || this.csvExportingV2 || this.trendCsvExporting) return
      this.officialCsvExporting = true
      try {
        const csvText = this.buildOfficialVerifyCsv()
        const fileName = `dali_official_verify_audit_${this.formatDateToken(new Date())}.csv`

        try {
          const filePath = await this.saveCsvToFile(csvText, fileName)
          await this.openCsvFile(filePath)
          uni.showToast({ title: '实名审计CSV已生成', icon: 'success' })
          return
        } catch (fileErr) {
          console.warn('保存实名审计CSV失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(csvText)
        uni.showModal({
          title: '已复制实名审计CSV',
          content: '当前环境不支持直接打开文件，已复制到剪贴板，可粘贴到表格工具分析。',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出实名审计CSV失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.officialCsvExporting = false
      }
    },

    async exportStatsCsvV2() {
      if (this.csvExportingV2 || this.csvExporting || this.trendCsvExporting) return
      this.csvExportingV2 = true
      try {
        const token = this.formatDateToken(new Date())
        const summaryFileName = `dali_admin_summary_v2_${token}.csv`
        const detailFileName = `dali_admin_detail_v2_${token}.csv`
        const summaryCsv = this.buildSummaryCsvV2()
        const detailCsv = this.buildDetailCsvV2()

        try {
          const summaryPath = await this.saveCsvToFile(summaryCsv, summaryFileName)
          await this.saveCsvToFile(detailCsv, detailFileName)
          try {
            await this.openCsvFile(summaryPath)
          } catch (openErr) {
            console.warn('打开汇总报表失败', openErr)
          }
          uni.showModal({
            title: '二期双表已生成',
            content: `已生成文件：\n1) ${summaryFileName}\n2) ${detailFileName}\n\n可在“最近文件”或右上角菜单中继续查看/转发。`,
            showCancel: false,
          })
          return
        } catch (fileErr) {
          console.warn('双表保存失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(`${summaryCsv}\n\n${detailCsv}`)
        uni.showModal({
          title: '已复制二期报表内容',
          content: '当前环境不支持直接写入双文件，已复制“汇总+明细”到剪贴板，可粘贴后分别保存为两个 CSV 文件。',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出二期双表失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.csvExportingV2 = false
      }
    },

    async exportTrendCsv() {
      if (this.trendCsvExporting || this.csvExporting || this.csvExportingV2) return
      this.trendCsvExporting = true
      try {
        const csvText = this.buildTrendCsv()
        const fileName = `dali_admin_trend_${this.formatDateToken(new Date())}.csv`
        try {
          const filePath = await this.saveCsvToFile(csvText, fileName)
          await this.openCsvFile(filePath)
          uni.showToast({ title: '趋势CSV已生成', icon: 'success' })
          return
        } catch (fileErr) {
          console.warn('保存趋势CSV失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(csvText)
        uni.showModal({
          title: '已复制趋势CSV内容',
          content: '当前环境不支持直接打开文件，已复制到剪贴板，可粘贴到表格工具保存为 .csv',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出趋势CSV失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.trendCsvExporting = false
      }
    },
  }
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; }

.header {
  background: #1A3C5E;
  padding: 48rpx 32rpx 32rpx;
}
.title { font-size: 40rpx; font-weight: bold; color: white; }
.subtitle { display: block; margin-top: 10rpx; font-size: 24rpx; color: rgba(255,255,255,0.75); }
.mode-switch-row {
  margin-top: 14rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
.mode-switch-row .chip {
  background: rgba(255, 255, 255, 0.18);
  color: #eaf2fb;
}
.mode-switch-row .chip--active {
  background: #ffffff;
  color: #1A3C5E;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 16rpx;
}
.summary-card {
  background: white;
  border-radius: 16rpx;
  padding: 22rpx 24rpx;
}
.summary-value {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #1A3C5E;
}
.summary-label {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #888;
}
.summary-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #98a2b3;
}

.tabs {
  display: flex; background: white;
  border-bottom: 1rpx solid #f0f0f0;
}
.tab {
  flex: 1; text-align: center;
  padding: 24rpx 0;
  font-size: 23rpx; color: #888;
}
.tab--active {
  color: #1A3C5E; font-weight: bold;
  border-bottom: 4rpx solid #1A3C5E;
}

.content { padding: 16rpx; }

.toolbar {
  margin-bottom: 14rpx;
}
.search-input {
  height: 76rpx;
  border-radius: 38rpx;
  background: white;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #333;
}
.chip-scroll {
  margin: 0 0 16rpx;
  white-space: nowrap;
}
.chip-scroll--sort {
  margin-top: -8rpx;
}
.date-range-panel {
  display: flex;
  gap: 12rpx;
  margin: -2rpx 0 14rpx;
}
.date-pill {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: #eef4fb;
  color: #1A3C5E;
  font-size: 22rpx;
  line-height: 1.2;
}
.chip-row {
  display: flex;
  gap: 12rpx;
}
.chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #f0f2f4;
  font-size: 22rpx;
  color: #666;
  flex-shrink: 0;
}
.chip--active {
  background: #1A3C5E;
  color: white;
}
.chip--sort {
  font-size: 20rpx;
  padding: 10rpx 18rpx;
}

.center-tip, .empty {
  display: flex; flex-direction: column;
  align-items: center; padding: 80rpx 40rpx;
}
.empty--inline {
  padding: 32rpx 20rpx;
}
.empty-text { font-size: 28rpx; color: #999; }

.logs-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin: 0 0 14rpx;
}
.todo-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
  margin-top: 12rpx;
}
.todo-filter-row {
  margin: 0 0 14rpx;
  padding: 14rpx 16rpx;
  background: #fff;
  border: 1rpx solid #e7ecf3;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.todo-filter-copy {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.todo-filter-title {
  font-size: 24rpx;
  color: #344054;
  font-weight: 600;
}
.todo-filter-sub {
  font-size: 20rpx;
  color: #667085;
}
.todo-filter-switch {
  transform: scale(0.9);
  transform-origin: right center;
}
.todo-sla-row {
  margin: 0 0 14rpx;
  padding: 10rpx 14rpx;
  border-radius: 12rpx;
  background: #fff;
  border: 1rpx solid #e7ecf3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}
.todo-batch-toolbar {
  margin: 6rpx 0 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.todo-batch-actions {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}
.todo-title-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.todo-report-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.sla-board {
  margin: 6rpx 0 12rpx;
  padding: 10rpx 12rpx;
  border-radius: 12rpx;
  background: #f8fafc;
  border: 1rpx solid #e7ecf3;
}
.sla-board-grid {
  margin-top: 8rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8rpx;
}
.sla-board-card {
  background: #fff;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}
.export-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin: 0 0 14rpx;
}
.export-main-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.export-tip {
  font-size: 22rpx;
  color: #667085;
}
.action-btn--export-v2 {
  background: #0B6E4F;
  color: #fff;
}
.action-btn--export-trend {
  background: #8A5A00;
  color: #fff;
}
.export-config {
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e7ecf3;
  padding: 14rpx;
}
.trend-dashboard {
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e7ecf3;
  padding: 14rpx;
}
.export-config-title {
  font-size: 22rpx;
  color: #344054;
  font-weight: 600;
}
.export-config-tip {
  font-size: 20rpx;
  color: #667085;
}
.export-actions {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
}
.export-actions--trend {
  align-items: center;
  flex-wrap: wrap;
}
.trend-kpi-grid {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}
.trend-kpi-card {
  background: #f8fafc;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}
.trend-kpi-label {
  display: block;
  font-size: 20rpx;
  color: #667085;
}
.trend-kpi-value {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A3C5E;
}
.trend-kpi-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #667085;
}
.trend-legend {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
.trend-legend-item {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
}
.trend-legend-item--activity {
  color: #0b6e4f;
  background: #e9f7f0;
}
.trend-legend-item--report {
  color: #ad3307;
  background: #fff1eb;
}
.trend-legend-item--action {
  color: #1A3C5E;
  background: #eef4fb;
}
.trend-list {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.trend-row {
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: #f9fafb;
}
.trend-bar-wrap {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.trend-bar-track {
  width: 100%;
  height: 10rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
}
.trend-bar-fill {
  height: 100%;
  border-radius: 999rpx;
}
.trend-bar-fill--activity {
  background: #0b6e4f;
}
.trend-bar-fill--report {
  background: #d9480f;
}
.trend-bar-fill--action {
  background: #1A3C5E;
}
.trend-category-panel {
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #eef2f6;
}
.trend-category-grid {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10rpx;
}
.trend-category-card {
  background: #f9fafb;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}
.trend-mini-bars {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.trend-mini-row {
  display: grid;
  grid-template-columns: 70rpx 1fr 40rpx;
  align-items: center;
  gap: 8rpx;
}
.trend-mini-label {
  font-size: 20rpx;
  color: #667085;
}
.trend-mini-track {
  width: 100%;
  height: 8rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
}
.trend-mini-fill {
  height: 100%;
  border-radius: 999rpx;
}
.trend-mini-fill--sport {
  background: #0b6e4f;
}
.trend-mini-fill--music {
  background: #d97706;
}
.trend-mini-fill--reading {
  background: #1A3C5E;
}
.trend-mini-value {
  font-size: 20rpx;
  color: #344054;
  text-align: right;
}
.todo-item {
  margin-top: 12rpx;
  padding: 12rpx;
  border-radius: 10rpx;
  background: #f8fafc;
}
.todo-item--overdue {
  background: #fff1f2;
  box-shadow: 0 0 0 1rpx #fecdd3 inset;
}
.todo-item--urgent {
  background: #fff7ed;
  box-shadow: 0 0 0 1rpx #fed7aa inset;
}
.closure-trend-panel {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #eef2f6;
}
.mini-btn {
  height: 54rpx;
  line-height: 54rpx;
  padding: 0 16rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 20rpx;
  background: #1A3C5E;
  color: #fff;
}
.mini-btn::after {
  border: none;
}
.mini-btn--ghost {
  background: #eef4fb;
  color: #1A3C5E;
}
.mini-btn--pick {
  height: 46rpx;
  line-height: 46rpx;
  font-size: 18rpx;
  padding: 0 14rpx;
}
.export-chip-wrap {
  flex-wrap: wrap;
  margin-top: 12rpx;
}
.logs-overview-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
}
.logs-overview-value {
  display: block;
  font-size: 32rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #1A3C5E;
}
.logs-overview-label {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #667085;
}

.card {
  background: white; border-radius: 12rpx;
  padding: 24rpx 28rpx; margin-bottom: 16rpx;
  transition: all .22s ease;
}
.card--flash-handled {
  box-shadow: 0 0 0 2rpx #1E7145 inset;
  background: #F6FFF8;
}
.card--flash-ignored {
  box-shadow: 0 0 0 2rpx #667085 inset;
  background: #F8FAFC;
}
.card-info {
  display: flex; align-items: center;
  gap: 20rpx; margin-bottom: 20rpx;
}
.mini-avatar {
  width: 72rpx; height: 72rpx;
  border-radius: 50%; background: #eee; flex-shrink: 0;
}
.card-text { display: flex; flex-direction: column; gap: 6rpx; flex: 1; }
.card-title { font-size: 28rpx; font-weight: bold; color: #1a1a1a; }
.card-sub   { font-size: 24rpx; color: #666; }
.card-openid{ font-size: 22rpx; color: #bbb; }
.card-openid--processing { color: #1A3C5E; }
.activity-preview {
  margin: 0 0 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 12rpx;
  background: #F8FBFF;
  border: 1rpx solid #E1ECF7;
}
.activity-preview--missing {
  background: #f6f7f8;
  border-color: #eceff1;
}
.preview-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
}
.preview-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #667085;
}
.inline-badges {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin: 6rpx 0 2rpx;
}
.mini-pill {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.2;
}
.mini-pill--report {
  background: #FFF7E8;
  color: #8B5E00;
}
.mini-pill--pending {
  background: #FFF0F0;
  color: #C00000;
}
.mini-pill--log {
  background: #EEF4FB;
  color: #1A3C5E;
}
.mini-pill--risk {
  background: #FFF1F2;
  color: #9F1239;
}
.mini-pill--handled {
  background: #EEF7EE;
  color: #1E7145;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.status-pill {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.2;
}
.status-pill--pending { background: #FFF3CD; color: #8B5E00; }
.status-pill--handled { background: #EEF7EE; color: #1E7145; }
.status-pill--ignored { background: #f1f3f5; color: #666; }
.status-pill--open { background: #EEF7EE; color: #1E7145; }
.status-pill--full { background: #FFF3CD; color: #8B5E00; }
.status-pill--ended { background: #f1f3f5; color: #666; }
.status-pill--cancelled { background: #FFF0F0; color: #C00000; }
.status-pill--log { background: #EEF4FB; color: #1A3C5E; }
.status-pill--result-default { background: #EEF4FB; color: #1A3C5E; }
.status-pill--result-positive { background: #EEF7EE; color: #1E7145; }
.status-pill--result-neutral { background: #f1f3f5; color: #667085; }
.status-pill--result-risk { background: #FFF0F0; color: #C00000; }

.result-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.timeline {
  margin-top: 14rpx;
  padding-top: 8rpx;
}
.timeline-item {
  display: flex;
  gap: 14rpx;
  margin-bottom: 12rpx;
}
.timeline-item:last-child {
  margin-bottom: 0;
}
.timeline-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  flex-shrink: 0;
}
.timeline-dot--report {
  background: #F59E0B;
}
.timeline-dot--action {
  background: #1A3C5E;
}
.timeline-content {
  flex: 1;
  min-width: 0;
}

.card-actions { display: flex; gap: 16rpx; }
.card-actions--single { margin-top: 16rpx; }
.action-btn {
  flex: 1; height: 72rpx; border-radius: 12rpx;
  font-size: 26rpx; font-weight: bold; border: none;
}
.action-btn--approve    { background: #EEF7EE; color: #1E7145; }
.action-btn--reject     { background: #FFF0F0; color: #C00000; }
.action-btn--recommend  { background: #EEF4FB; color: #1A3C5E; }
.action-btn--unrecommend{ background: #f5f5f5; color: #888; }
.action-btn--detail     { background: #F6F8FA; color: #344054; }
.action-btn--export     { background: #1A3C5E; color: #fff; }
.action-btn::after { border: none; }
</style>
