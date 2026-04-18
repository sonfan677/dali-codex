<template>
  <view class="page">
    <scroll-view scroll-y class="scroll" :scroll-top="scrollTop">
      <view class="form">

        <!-- 快速模板 -->
        <view class="field">
          <text class="label">快速发布模板（11类）</text>
          <view class="template-chip-list">
            <text
              v-for="item in publishTemplateOptions"
              :key="`scene-template-${item.sceneId}`"
              class="template-chip"
              :class="{ 'template-chip--active': selectedTemplateSceneId === item.sceneId }"
              @tap="selectSceneTemplate(item.sceneId)"
            >
              {{ item.emoji }} {{ item.sceneLabel }}
            </text>
          </view>
          <view class="template-actions">
            <button class="mini-btn" @tap="applySelectedSceneTemplate">套用模板</button>
            <button class="mini-btn mini-btn--ghost" @tap="generateStructuredDescriptionPreview">生成结构化描述</button>
          </view>
          <text class="hint">模板会自动填充默认文案、标签、收费与风控项，你只需改时间/地点等关键字段。</text>
        </view>

        <!-- 常发布快速复用 -->
        <view class="field">
          <text class="label">常发布活动（快速复用）</text>
          <view v-if="recentPublishProfiles.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无常用活动，发布成功后会自动沉淀到这里</text>
          </view>
          <view v-for="item in recentPublishProfiles" :key="item.id" class="recent-item">
            <view class="recent-main">
              <text class="recent-title">{{ item.title || '未命名模板' }}</text>
              <text class="recent-meta">{{ item.sceneName || '未分类类型' }} · {{ item.typeName || '未分类场景' }}</text>
            </view>
            <view class="recent-actions">
              <button class="mini-btn mini-btn--ghost" @tap="applyRecentProfile(item)">复用</button>
              <button class="mini-btn" @tap="quickPublishRecentProfile(item)">一键发布</button>
            </view>
          </view>
          <text class="hint">一键发布会自动把开始时间滚动到“当前时间后2小时”的最近15分钟刻度。</text>
        </view>

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
          <view class="field-switch structured-switch-row">
            <view>
              <text class="label mb0">活动描述（结构化）</text>
              <text class="hint">推荐开启：系统会自动拼接 emoji + 结构化文案</text>
            </view>
            <switch
              :checked="useStructuredDescription"
              color="#1A3C5E"
              @change="onStructuredModeChange"
            />
          </view>
          <view v-if="useStructuredDescription" class="structured-editor">
            <input
              class="input"
              v-model="structuredBlocks.highlight"
              placeholder="🎯 活动亮点（必填建议）"
              maxlength="60"
            />
            <textarea
              class="textarea mt12"
              v-model="structuredBlocks.process"
              placeholder="🗺️ 活动流程（建议：集合→进行→结束）"
              maxlength="120"
            />
            <textarea
              class="textarea mt12"
              v-model="structuredBlocks.tips"
              placeholder="⚠️ 注意事项（如迟到、装备、安全说明）"
              maxlength="120"
            />
            <input
              class="input mt12"
              v-model="structuredBlocks.suitableFor"
              placeholder="🙌 适合人群（如新手友好、一个人可来）"
              maxlength="80"
            />
            <view class="template-actions">
              <button class="mini-btn mini-btn--ghost" @tap="generateStructuredDescriptionPreview">刷新结构化描述</button>
            </view>
            <view class="structured-preview">
              <text class="structured-preview-label">结构化预览</text>
              <text class="structured-preview-text">{{ structuredDescriptionPreview || '暂无可预览内容' }}</text>
            </view>
          </view>
          <textarea
            class="textarea"
            v-model="form.description"
            placeholder="补充说明（选填）：如集合口令、临时变更、细节补充"
            maxlength="300"
          />
          <view class="visible-tags-summary">
            <text class="visible-tags-summary-text">{{ visibleTagSummaryText }}</text>
            <text class="visible-tags-summary-sub">一级类目默认展开，点击类目可选择标签</text>
          </view>
          <view v-if="form.visibleTags.length" class="selected-visible-tags">
            <text
              v-for="tag in form.visibleTags"
              :key="`selected-tag-${tag}`"
              class="selected-visible-tag"
            >{{ tag }}</text>
          </view>
          <view class="visible-tag-groups">
            <view
              v-for="group in visibleTagGroups"
              :key="`visible-group-${group.id}`"
              class="visible-tag-group"
            >
              <view class="visible-tag-group-header" @tap="toggleVisibleTagGroup(group.id)">
                <text class="visible-tag-group-title">{{ group.label }}</text>
                <text class="visible-tag-group-meta">
                  {{ visibleTagGroupSelectedCount(group.id) > 0 ? `已选 ${visibleTagGroupSelectedCount(group.id)} 个` : '' }}
                  {{ isVisibleTagGroupOpen(group.id) ? '收起' : '展开' }}
                </text>
              </view>
              <view v-if="isVisibleTagGroupOpen(group.id)" class="visible-tag-list">
                <text
                  v-for="tag in group.tags"
                  :key="`visible-tag-${group.id}-${tag}`"
                  class="visible-tag-item"
                  :class="{ 'visible-tag-item--active': form.visibleTags.includes(tag) }"
                  @tap="toggleVisibleTag(tag)"
                >{{ tag }}</text>
              </view>
            </view>
          </view>
          <text class="hint">标签会在活动详情里展示，帮助其他用户快速理解活动</text>
        </view>

        <!-- 类型 -->
        <view class="field">
          <text class="label">活动类型 *</text>
          <picker
            mode="selector"
            :range="scenePickerRange"
            :value="sceneIndex"
            @change="onSceneChange"
          >
            <view class="picker-row">
              <text class="picker-value">{{ scenePickerRange[sceneIndex] }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
          <text class="hint">你选择的是：{{ selectedSceneLabel }}</text>
        </view>

        <!-- 场景 -->
        <view v-if="!isCustomSceneSelected" class="field">
          <text class="label">活动场景 *</text>
          <picker
            mode="selector"
            :range="typePickerRange"
            :value="typeIndex"
            @change="onTypeChange"
          >
            <view class="picker-row">
              <text class="picker-value">{{ typePickerRange[typeIndex] }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
          <text class="hint">系统判定社交偏好：{{ inferredSocialEnergyLabel }}</text>
        </view>
        <view v-else class="field">
          <text class="label">活动场景（自定义）*</text>
          <input
            class="input"
            v-model="form.customTypeName"
            placeholder="例如：城市寻宝 / 露台音乐夜（2-20字）"
            maxlength="20"
          />
          <text class="hint">该活动会在发现页“类型=其它”中展示</text>
          <text v-if="customTypeDuplicateLabel" class="hint hint-error">与现有场景“{{ customTypeDuplicateLabel }}”重复，请直接选择已有场景</text>
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
          <text v-if="marketDateLocked" class="hint">同行日期已锁定：{{ lockedDateLabel }}（可调整时分）</text>
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

        <!-- 收费设置 -->
        <view class="field">
          <text class="label">收费方式 *</text>
          <view class="fee-options">
            <view
              class="fee-option"
              :class="{ 'fee-option--active': form.chargeType === 'free' }"
              @tap="setChargeType('free')"
            >免费</view>
            <view
              class="fee-option"
              :class="{ 'fee-option--active': form.chargeType === 'aa' }"
              @tap="setChargeType('aa')"
            >AA</view>
            <view
              class="fee-option"
              :class="{ 'fee-option--active': form.chargeType === 'paid' }"
              @tap="setChargeType('paid')"
            >付费</view>
          </view>
          <view v-if="form.chargeType === 'paid'" class="fee-input-row">
            <text class="fee-currency">¥</text>
            <input
              class="fee-amount-input"
              type="digit"
              :value="form.feeAmount"
              placeholder="填写金额（人民币）"
              @input="onFeeAmountInput"
            />
          </view>
        </view>

        <!-- 收费与履约披露 -->
        <view class="field">
          <text class="label">收费与履约披露 *</text>
          <view class="risk-binary-row">
            <text class="risk-binary-label">是否商业组织活动</text>
            <view class="fee-options risk-binary-options">
              <view
                class="fee-option"
                :class="{ 'fee-option--active': form.isCommercialActivity === 'yes' }"
                @tap="setCommercialMode('yes')"
              >是</view>
              <view
                class="fee-option"
                :class="{ 'fee-option--active': form.isCommercialActivity === 'no' }"
                @tap="setCommercialMode('no')"
              >否</view>
            </view>
          </view>
          <view v-if="form.chargeType !== 'free'" class="mt12">
            <input
              class="input"
              v-model="form.payeeSubject"
              placeholder="收款主体（如：张三 / XX工作室）*"
              maxlength="30"
            />
            <textarea
              class="textarea mt12"
              v-model="form.refundPolicy"
              placeholder="退款规则（必填，如：活动前24小时可全额退款）*"
              maxlength="200"
            />
          </view>
          <textarea
            class="textarea mt12"
            v-model="form.cancellationPolicy"
            placeholder="活动取消规则（必填，如：人数不足自动取消并通知）*"
            maxlength="200"
          />
          <text class="hint">费用由活动发起者自行收取，平台不代收、不托管、不分账</text>
        </view>

        <!-- 风险要素申报 -->
        <view class="field">
          <text class="label">风险要素申报 *</text>
          <view
            v-for="item in riskBinaryFields"
            :key="`risk-${item.key}`"
            class="risk-binary-row"
          >
            <text class="risk-binary-label">{{ item.label }}</text>
            <view class="fee-options risk-binary-options">
              <view
                class="fee-option"
                :class="{ 'fee-option--active': form[item.key] === 'yes' }"
                @tap="setRiskBinary(item.key, 'yes')"
              >是</view>
              <view
                class="fee-option"
                :class="{ 'fee-option--active': form[item.key] === 'no' }"
                @tap="setRiskBinary(item.key, 'no')"
              >否</view>
            </view>
          </view>
          <text class="hint">请如实填写，系统将据此分级提示与审核</text>
        </view>

        <!-- 报名规则 -->
        <view class="field field-switch">
          <view>
            <text class="label mb0">允许候补 *</text>
            <text class="hint">满员后仍可进入候补队列</text>
          </view>
          <switch
            :checked="form.allowWaitlist"
            color="#1A3C5E"
            @change="onAllowWaitlistChange"
          />
        </view>

        <view class="field field-switch">
          <view>
            <text class="label mb0">发起人审核后参与 *</text>
            <text class="hint">开启后，报名先进入待审核</text>
          </view>
          <switch
            :checked="form.requireApproval"
            color="#1A3C5E"
            @change="onRequireApprovalChange"
          />
        </view>

        <!-- 联系方式/入群方式 -->
        <view class="field">
          <text class="label">联系方式/入群方式（至少填1项）*</text>
          <input
            class="input"
            v-model="form.contactPhone"
            placeholder="电话号码（选填）"
            maxlength="30"
          />
          <input
            class="input mt12"
            v-model="form.contactWechat"
            placeholder="微信号（选填）"
            maxlength="40"
          />
          <view class="qrcode-row mt12">
            <button class="qrcode-btn" @tap="chooseContactQrcode">
              {{ form.contactQrcodeFileId ? '更换微信二维码图片' : '上传微信二维码图片（选填）' }}
            </button>
            <text v-if="form.contactQrcodeFileId" class="qrcode-clear" @tap="clearContactQrcode">清除</text>
          </view>
          <image
            v-if="form.contactQrcodeFileId"
            class="qrcode-preview"
            :src="form.contactQrcodeFileId"
            mode="aspectFill"
          />
          <text class="hint">仅报名成功用户可见联系方式</text>
        </view>

        <view class="field">
          <text class="label">发布协议确认 *</text>
          <view class="consent-item" @tap="toggleConsent('publishRules')">
            <text class="consent-box">{{ consent.publishRules ? '☑' : '☐' }}</text>
            <view class="consent-content">
              <text class="consent-line">
                我已阅读并同意
                <text class="consent-link" @tap.stop="openPublishRules">《活动发布规则》</text>
                （{{ publishRulesVersion }}）
              </text>
            </view>
          </view>
          <view class="consent-item" @tap="toggleConsent('organizerAgreement')">
            <text class="consent-box">{{ consent.organizerAgreement ? '☑' : '☐' }}</text>
            <view class="consent-content">
              <text class="consent-line">
                我已阅读并同意
                <text class="consent-link" @tap.stop="openOrganizerAgreement">《组织者服务协议》</text>
                （{{ organizerAgreementVersion }}）
              </text>
            </view>
          </view>
          <text class="hint">仅首次同意当前版本时会写入云端；规则更新后需重新同意。</text>
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

    <view v-if="showProfileDialog" class="phone-bind-mask" @tap="closeProfileDialog">
      <view class="phone-bind-dialog" @tap.stop>
        <text class="phone-bind-title">发布前先完善资料</text>
        <text class="phone-bind-desc">请先设置头像和用户名，方便活动中识别你的身份。</text>
        <view class="profile-editor">
          <button class="profile-avatar-btn" open-type="chooseAvatar" @chooseavatar="onPublishChooseAvatar">
            <image v-if="profileDraftAvatar" class="profile-avatar-img" :src="profileDraftAvatar" mode="aspectFill" />
            <text v-else class="profile-avatar-tip">设置头像</text>
          </button>
          <input
            v-model="profileDraftNickname"
            class="profile-nickname-input"
            maxlength="20"
            placeholder="请输入用户名"
          />
        </view>
        <view class="profile-extra">
          <view class="profile-extra-field">
            <text class="profile-extra-label">社交偏好</text>
            <picker
              mode="selector"
              :range="socialPreferencePickerRange"
              :value="profileDraftSocialPreferenceIndex"
              @change="onProfileSocialPreferenceChange"
            >
              <view class="picker-row">
                <text class="picker-value">{{ socialPreferencePickerRange[profileDraftSocialPreferenceIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="profile-extra-field">
            <text class="profile-extra-label">居住身份</text>
            <picker
              mode="selector"
              :range="residencyTypePickerRange"
              :value="profileDraftResidencyTypeIndex"
              @change="onProfileResidencyTypeChange"
            >
              <view class="picker-row">
                <text class="picker-value">{{ residencyTypePickerRange[profileDraftResidencyTypeIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="profile-extra-field">
            <text class="profile-extra-label">身份标签（最多3个）</text>
            <view class="profile-tag-list">
              <text
                v-for="tag in identityTagOptions"
                :key="`publish-profile-tag-${tag.id}`"
                class="profile-tag-item"
                :class="{ 'profile-tag-item--active': profileDraftIdentityTags.includes(tag.id) }"
                @tap="toggleProfileIdentityTag(tag.id)"
              >{{ tag.label }}</text>
            </view>
          </view>
        </view>
        <button class="phone-bind-confirm" @tap="saveProfileAndContinuePublish">保存并继续</button>
        <text class="phone-bind-cancel" @tap="closeProfileDialog">稍后再说</text>
      </view>
    </view>

    <view v-if="showPhoneBindDialog" class="phone-bind-mask" @tap="closePhoneBindDialog">
      <view class="phone-bind-dialog" @tap.stop>
        <text class="phone-bind-title">发布前先完成手机号绑定</text>
        <text class="phone-bind-desc">
          仅用于账号安全与风险防护，不会向其他用户展示你的手机号。部分设备/账号会触发微信短信二次校验，属于微信安全策略。
        </text>
        <button
          class="phone-bind-confirm"
          open-type="getPhoneNumber"
          @getphonenumber="onPublishGetPhoneNumber"
        >一键绑定并继续</button>
        <text class="phone-bind-cancel" @tap="closePhoneBindDialog">暂不绑定</text>
      </view>
    </view>

  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'
import { useUserStore } from '@/stores/user.js'
import {
  getPublishTemplateByScene,
  getPublishTemplateOptions,
  getSocialEnergyLabel,
  normalizeCustomTypeName,
  PUBLISH_SCENE_OPTIONS,
  resolveDuplicateTypeName,
  USER_IDENTITY_TAG_OPTIONS,
  USER_RESIDENCY_TYPE_OPTIONS,
  USER_SOCIAL_PREFERENCE_OPTIONS,
  getCategoryLabel,
  getTypesByScene,
  inferActivitySocialEnergy,
  normalizeIdentityTags,
  normalizeResidencyType,
  normalizeSocialPreference,
  resolveCategoryBySceneType,
  resolveSceneTypeFromLegacyFields,
} from '@/utils/activityMeta.js'

const QUICK_PUBLISH_STORAGE_KEY = 'dali_publish_quick_profiles_v1'
const QUICK_PUBLISH_MAX_COUNT = 6

function createEmptyStructuredBlocks() {
  return {
    highlight: '',
    process: '',
    tips: '',
    suitableFor: '',
  }
}

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

const USER_VISIBLE_TAG_GROUPS = [
  {
    id: 'who',
    label: '适合谁',
    tags: ['适合新朋友', '一个人也能来', '适合游客', '适合旅居者', '适合同城常住', '适合女生', '适合亲子', '可带宠物', '适合初学者', '同频交流'],
  },
  {
    id: 'vibe',
    label: '氛围',
    tags: ['轻松', '热闹', '安静', '深聊', '专业', '文艺', '松弛', '户外自然', '节日氛围', '沉浸体验'],
  },
  {
    id: 'format',
    label: '形式',
    tags: ['小规模', '限额报名', '需要预约', '可反复参与', '新手友好'],
  },
  {
    id: 'traits',
    label: '场景特征',
    tags: ['户外自然', '室内活动', '可带宠物', '适合拍照', '有吃有喝'],
  },
]
const USER_VISIBLE_TAG_ALLOW_SET = new Set(USER_VISIBLE_TAG_GROUPS.flatMap((group) => group.tags))
const RISK_BINARY_FIELDS = [
  { key: 'isNightActivity', label: '是否夜间活动（21:00后或06:00前）' },
  { key: 'isOutdoorActivity', label: '是否户外活动' },
  { key: 'hasAlcohol', label: '是否涉及饮酒' },
  { key: 'hasCarpool', label: '是否涉及拼车/搭车' },
  { key: 'hasOvernight', label: '是否涉及过夜安排' },
  { key: 'hasMinors', label: '是否允许未成年人参与' },
]

export default {
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },

  data() {
    const { dates, hours, minutes } = buildTimeRange()
    const now = new Date()
    const defaultHour = now.getHours() + 1 >= 24 ? 0 : now.getHours() + 1
    const defaultSceneId = PUBLISH_SCENE_OPTIONS[0].id
    const defaultSceneLabel = PUBLISH_SCENE_OPTIONS[0].label
    const defaultTypeOptions = getTypesByScene(defaultSceneId)
    const defaultType = defaultTypeOptions[0] || { id: '', name: '' }
    return {
      submitting: false,
      showProfileDialog: false,
      showPhoneBindDialog: false,
      profileDraftNickname: '',
      profileDraftAvatar: '',
      socialPreferenceOptions: USER_SOCIAL_PREFERENCE_OPTIONS,
      residencyTypeOptions: USER_RESIDENCY_TYPE_OPTIONS,
      identityTagOptions: USER_IDENTITY_TAG_OPTIONS,
      profileDraftSocialPreference: 'unknown',
      profileDraftResidencyType: 'unknown',
      profileDraftIdentityTags: [],
      scrollTop: 0,
      minParticipantsDisplay: '',
      form: {
        title: '',
        description: '',
        visibleTags: [],
        lat: 0,
        lng: 0,
        address: '',
        startTimeStr: '',
        startTimeMs: 0,
        sceneId: defaultSceneId,
        sceneName: defaultSceneLabel,
        typeId: defaultType.id,
        typeName: defaultType.name,
        customTypeName: '',
        maxParticipants: null,
        chargeType: 'free',
        feeAmount: '',
        isCommercialActivity: '',
        payeeSubject: '',
        refundPolicy: '',
        cancellationPolicy: '',
        isNightActivity: '',
        isOutdoorActivity: '',
        hasAlcohol: '',
        hasCarpool: '',
        hasOvernight: '',
        hasMinors: '',
        allowWaitlist: false,
        requireApproval: false,
        contactPhone: '',
        contactWechat: '',
        contactQrcodeFileId: '',
        isGroupFormation: false,
        minParticipants: 2,
      },
      sceneOptions: PUBLISH_SCENE_OPTIONS,
      sceneIndex: 0,
      typeOptions: defaultTypeOptions,
      typeIndex: 0,
      timeRangeData: { dates, hours, minutes },
      timeRange: [dates, hours, ['00', '15', '30', '45']],
      timeIndex: [0, defaultHour, 0],
      durationOptions: ['1小时', '2小时', '3小时', '4小时', '6小时', '8小时'],
      durationIndex: 1,
      visibleTagGroups: USER_VISIBLE_TAG_GROUPS,
      riskBinaryFields: RISK_BINARY_FIELDS,
      visibleTagOpenMap: USER_VISIBLE_TAG_GROUPS.reduce((acc, group) => {
        acc[group.id] = false
        return acc
      }, {}),
      formationWindowOptions: ['15分钟（极速成团）', '30分钟（标准成团）', '60分钟（预约成团）'],
      formationWindowValues: [15, 30, 60],
      formationWindowIndex: 1,
      marketDateLocked: false,
      lockedDateIndex: -1,
      lockedDateLabel: '',
      marketLinkDraft: null,
      publishGovernanceConfig: {
        publishRulesVersion: 'publish_rules_v1',
        organizerAgreementVersion: 'organizer_agreement_v1',
      },
      consent: {
        publishRules: false,
        organizerAgreement: false,
      },
      publishTemplateOptions: getPublishTemplateOptions(),
      selectedTemplateSceneId: defaultSceneId,
      useStructuredDescription: true,
      structuredBlocks: createEmptyStructuredBlocks(),
      recentPublishProfiles: [],
    }
  },

  computed: {
    scenePickerRange() {
      return this.sceneOptions.map((item) => item.label)
    },

    selectedSceneLabel() {
      return String(this.form.sceneName || '未选择')
    },

    isCustomSceneSelected() {
      return String(this.form.sceneId || '').trim() === 'other_scene'
    },

    customTypeDuplicateLabel() {
      if (!this.isCustomSceneSelected) return ''
      const customName = normalizeCustomTypeName(this.form.customTypeName || '')
      if (!customName) return ''
      return resolveDuplicateTypeName(customName)
    },

    typePickerRange() {
      const list = Array.isArray(this.typeOptions) ? this.typeOptions : []
      if (!list.length) return ['请选择活动场景']
      return list.map((item) => item.name)
    },

    formationWindowHint() {
      const mins = this.formationWindowValues[this.formationWindowIndex]
      return `发布后${mins}分钟内未成团，会通知你决定是否继续`
    },

    visibleTagSummaryText() {
      const total = Array.isArray(this.form?.visibleTags) ? this.form.visibleTags.length : 0
      if (!total) return '用户可见标签（选填）'
      return `用户可见标签（选填） · 已选 ${total} 个`
    },

    socialPreferencePickerRange() {
      return this.socialPreferenceOptions.map((item) => item.label)
    },

    profileDraftSocialPreferenceIndex() {
      const idx = this.socialPreferenceOptions.findIndex((item) => item.id === this.profileDraftSocialPreference)
      return idx >= 0 ? idx : 0
    },

    residencyTypePickerRange() {
      return this.residencyTypeOptions.map((item) => item.label)
    },

    profileDraftResidencyTypeIndex() {
      const idx = this.residencyTypeOptions.findIndex((item) => item.id === this.profileDraftResidencyType)
      return idx >= 0 ? idx : 0
    },

    inferredSocialEnergyId() {
      return inferActivitySocialEnergy({
        sceneId: this.form.sceneId,
        sceneName: this.form.sceneName,
        typeId: this.form.typeId,
        typeName: this.form.typeName,
        title: this.form.title,
        description: this.form.description,
      })
    },

    inferredSocialEnergyLabel() {
      return getSocialEnergyLabel(this.inferredSocialEnergyId)
    },

    structuredDescriptionPreview() {
      return this.buildStructuredDescriptionText({ includeExtraDescription: true })
    },

    publishRulesVersion() {
      return String(this.publishGovernanceConfig?.publishRulesVersion || 'publish_rules_v1')
    },

    organizerAgreementVersion() {
      return String(this.publishGovernanceConfig?.organizerAgreementVersion || 'organizer_agreement_v1')
    },
  },

  onLoad(options = {}) {
    this.loadRecentPublishProfiles()
    this.hydrateStructuredByScene(this.form.sceneId, { force: false })
    this.applyPrefillFromQuery(options)
    this.consumeMarketPrefillFromStorage({ showToast: false })
    this.syncPublishGovernanceFromStore()
  },

  async onShow() {
    this.consumeMarketPrefillFromStorage({ showToast: true })
    try {
      await this.userStore.syncSession({ force: false, minIntervalMs: 15000 })
    } catch (e) {
      console.error('发布页同步会话失败', e)
    } finally {
      this.syncPublishGovernanceFromStore()
    }
  },

  methods: {
    safeDecodeURIComponent(value = '') {
      const raw = String(value || '')
      if (!raw) return ''
      try {
        return decodeURIComponent(raw)
      } catch (e) {
        return raw
      }
    },

    formatStartTimeTextByMs(ms) {
      const dt = new Date(ms)
      if (!Number.isFinite(dt.getTime())) return ''
      const m = dt.getMonth() + 1
      const d = dt.getDate()
      const h = `${dt.getHours()}`.padStart(2, '0')
      const min = `${dt.getMinutes()}`.padStart(2, '0')
      return `${m}月${d}日 ${h}:${min}`
    },

    syncPublishGovernanceFromStore() {
      const gd = getApp().globalData || {}
      const configFromStore = this.userStore?.publishGovernanceConfig || {}
      const configFromGlobal = gd.publishGovernanceConfig || {}
      const publishRulesVersion = String(
        configFromStore.publishRulesVersion
        || configFromGlobal.publishRulesVersion
        || 'publish_rules_v1'
      ).trim() || 'publish_rules_v1'
      const organizerAgreementVersion = String(
        configFromStore.organizerAgreementVersion
        || configFromGlobal.organizerAgreementVersion
        || 'organizer_agreement_v1'
      ).trim() || 'organizer_agreement_v1'
      this.publishGovernanceConfig = {
        publishRulesVersion,
        organizerAgreementVersion,
      }

      const consentFromStore = this.userStore?.organizerConsents || {}
      const consentFromGlobal = gd.organizerConsents || {}
      const publishRulesConsent = consentFromStore.publishRules || consentFromGlobal.publishRules || {}
      const organizerAgreementConsent = consentFromStore.organizerAgreement || consentFromGlobal.organizerAgreement || {}
      this.consent.publishRules = String(publishRulesConsent.version || '').trim() === publishRulesVersion && !!publishRulesConsent.acceptedAt
      this.consent.organizerAgreement = String(organizerAgreementConsent.version || '').trim() === organizerAgreementVersion && !!organizerAgreementConsent.acceptedAt
    },

    loadRecentPublishProfiles() {
      try {
        const raw = uni.getStorageSync(QUICK_PUBLISH_STORAGE_KEY)
        if (!Array.isArray(raw)) {
          this.recentPublishProfiles = []
          return
        }
        this.recentPublishProfiles = raw
          .map((item) => ({
            id: String(item?.id || '').trim(),
            title: String(item?.title || '').trim().slice(0, 30),
            sceneId: String(item?.sceneId || '').trim(),
            sceneName: String(item?.sceneName || '').trim(),
            typeId: String(item?.typeId || '').trim(),
            typeName: String(item?.typeName || '').trim(),
            customTypeName: String(item?.customTypeName || '').trim(),
            visibleTags: Array.isArray(item?.visibleTags) ? [...new Set(item.visibleTags.map((x) => String(x || '').trim()).filter(Boolean))].slice(0, 12) : [],
            descriptionExtra: String(item?.descriptionExtra || '').trim().slice(0, 300),
            structuredBlocks: {
              highlight: String(item?.structuredBlocks?.highlight || '').trim(),
              process: String(item?.structuredBlocks?.process || '').trim(),
              tips: String(item?.structuredBlocks?.tips || '').trim(),
              suitableFor: String(item?.structuredBlocks?.suitableFor || '').trim(),
            },
            chargeType: ['free', 'aa', 'paid'].includes(String(item?.chargeType || '').trim()) ? String(item.chargeType).trim() : 'free',
            feeAmount: Number(item?.feeAmount) > 0 ? Number(item.feeAmount) : 0,
            allowWaitlist: !!item?.allowWaitlist,
            requireApproval: !!item?.requireApproval,
            isCommercialActivity: String(item?.isCommercialActivity || '').trim() === 'yes' ? 'yes' : 'no',
            riskFlags: {
              isNightActivity: String(item?.riskFlags?.isNightActivity || '').trim() === 'yes' ? 'yes' : 'no',
              isOutdoorActivity: String(item?.riskFlags?.isOutdoorActivity || '').trim() === 'yes' ? 'yes' : 'no',
              hasAlcohol: String(item?.riskFlags?.hasAlcohol || '').trim() === 'yes' ? 'yes' : 'no',
              hasCarpool: String(item?.riskFlags?.hasCarpool || '').trim() === 'yes' ? 'yes' : 'no',
              hasOvernight: String(item?.riskFlags?.hasOvernight || '').trim() === 'yes' ? 'yes' : 'no',
              hasMinors: String(item?.riskFlags?.hasMinors || '').trim() === 'yes' ? 'yes' : 'no',
            },
            maxParticipants: Number(item?.maxParticipants) > 0 ? Number(item.maxParticipants) : null,
            durationIndex: Number.isFinite(Number(item?.durationIndex)) ? Math.max(0, Math.min(this.durationOptions.length - 1, Number(item.durationIndex))) : 1,
            lat: Number(item?.lat) || 0,
            lng: Number(item?.lng) || 0,
            address: String(item?.address || '').trim(),
            payeeSubject: String(item?.payeeSubject || '').trim().slice(0, 30),
            refundPolicy: String(item?.refundPolicy || '').trim().slice(0, 200),
            cancellationPolicy: String(item?.cancellationPolicy || '').trim().slice(0, 200),
            updatedAt: Number(item?.updatedAt || 0) || 0,
          }))
          .filter((item) => item.id && item.sceneId)
          .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
          .slice(0, QUICK_PUBLISH_MAX_COUNT)
      } catch (e) {
        this.recentPublishProfiles = []
      }
    },

    persistRecentPublishProfiles() {
      try {
        uni.setStorageSync(QUICK_PUBLISH_STORAGE_KEY, this.recentPublishProfiles.slice(0, QUICK_PUBLISH_MAX_COUNT))
      } catch (e) {}
    },

    selectSceneTemplate(sceneId = '') {
      const safe = String(sceneId || '').trim()
      if (!safe) return
      this.selectedTemplateSceneId = safe
    },

    applySelectedSceneTemplate() {
      const sceneId = String(this.selectedTemplateSceneId || '').trim()
      if (!sceneId) {
        uni.showToast({ title: '请先选择模板类型', icon: 'none' })
        return
      }
      this.applySceneTemplateDefaults(sceneId)
    },

    hydrateStructuredByScene(sceneId = '', options = {}) {
      const tpl = getPublishTemplateByScene(sceneId)
      if (!tpl) return
      const hasContent = Object.values(this.structuredBlocks || {}).some((item) => String(item || '').trim())
      if (hasContent && !options.force) return
      this.structuredBlocks = {
        highlight: tpl.blocks.highlight || '',
        process: tpl.blocks.process || '',
        tips: tpl.blocks.tips || '',
        suitableFor: tpl.blocks.suitableFor || '',
      }
    },

    applySceneTemplateDefaults(sceneId = '') {
      const tpl = getPublishTemplateByScene(sceneId)
      if (!tpl) {
        uni.showToast({ title: '该类型暂无模板', icon: 'none' })
        return
      }
      this.syncSceneAndType(sceneId, '')
      this.selectedTemplateSceneId = sceneId
      this.useStructuredDescription = true
      this.structuredBlocks = {
        highlight: tpl.blocks.highlight || '',
        process: tpl.blocks.process || '',
        tips: tpl.blocks.tips || '',
        suitableFor: tpl.blocks.suitableFor || '',
      }
      if (tpl.title) {
        this.form.title = tpl.title.slice(0, 30)
      }
      this.form.visibleTags = Array.isArray(tpl.visibleTags) ? [...tpl.visibleTags].slice(0, 12) : []
      this.setChargeType(tpl.defaults.chargeType || 'free')
      if (this.form.chargeType === 'paid' && !Number(this.form.feeAmount)) {
        this.form.feeAmount = '39'
      }
      this.form.allowWaitlist = !!tpl.defaults.allowWaitlist
      this.form.requireApproval = !!tpl.defaults.requireApproval
      this.form.isOutdoorActivity = tpl.defaults.isOutdoorActivity || 'no'
      this.form.hasAlcohol = tpl.defaults.hasAlcohol || 'no'
      this.form.hasCarpool = tpl.defaults.hasCarpool || 'no'
      this.form.hasOvernight = tpl.defaults.hasOvernight || 'no'
      this.form.hasMinors = tpl.defaults.hasMinors || 'no'
      this.form.isCommercialActivity = tpl.defaults.isCommercialActivity || 'no'
      if (this.form.chargeType !== 'free') {
        if (!String(this.form.payeeSubject || '').trim()) {
          this.form.payeeSubject = '活动发起方'
        }
        if (!String(this.form.refundPolicy || '').trim()) {
          this.form.refundPolicy = '活动开始前24小时可全额退款，开始后不支持退款。'
        }
      }
      if (!String(this.form.cancellationPolicy || '').trim()) {
        this.form.cancellationPolicy = '如遇天气/人数不足等情况，将提前通知并给出改期或取消方案。'
      }
      this.generateStructuredDescriptionPreview()
      uni.showToast({ title: '模板已套用', icon: 'success' })
    },

    onStructuredModeChange(e) {
      this.useStructuredDescription = !!e?.detail?.value
      if (this.useStructuredDescription) {
        this.hydrateStructuredByScene(this.form.sceneId, { force: false })
      }
    },

    buildStructuredDescriptionText(options = {}) {
      const includeExtra = options.includeExtraDescription !== false
      const blocks = this.structuredBlocks || {}
      const rows = []
      const highlight = String(blocks.highlight || '').trim()
      const process = String(blocks.process || '').trim()
      const tips = String(blocks.tips || '').trim()
      const suitableFor = String(blocks.suitableFor || '').trim()
      if (highlight) rows.push(`🎯 活动亮点：${highlight}`)
      if (process) rows.push(`🗺️ 活动流程：${process}`)
      if (tips) rows.push(`⚠️ 注意事项：${tips}`)
      if (suitableFor) rows.push(`🙌 适合人群：${suitableFor}`)
      const extra = includeExtra ? String(this.form.description || '').trim() : ''
      if (extra) rows.push(`📝 补充说明：${extra}`)
      return rows.join('\n')
    },

    generateStructuredDescriptionPreview() {
      const preview = this.buildStructuredDescriptionText({ includeExtraDescription: true })
      if (!preview) {
        uni.showToast({ title: '请先填写结构化内容', icon: 'none' })
        return
      }
      uni.showToast({ title: '已刷新结构化描述', icon: 'none' })
    },

    buildRecentPublishSnapshot() {
      const id = `${String(this.form.sceneId || '')}_${String(this.form.typeId || this.form.customTypeName || '')}`.slice(0, 64)
      return {
        id: id || `${Date.now()}`,
        title: String(this.form.title || '').trim().slice(0, 30),
        sceneId: String(this.form.sceneId || '').trim(),
        sceneName: String(this.form.sceneName || '').trim(),
        typeId: String(this.form.typeId || '').trim(),
        typeName: String(this.form.typeName || '').trim(),
        customTypeName: String(this.form.customTypeName || '').trim(),
        visibleTags: Array.isArray(this.form.visibleTags) ? [...this.form.visibleTags].slice(0, 12) : [],
        descriptionExtra: String(this.form.description || '').trim().slice(0, 300),
        structuredBlocks: {
          highlight: String(this.structuredBlocks?.highlight || '').trim().slice(0, 80),
          process: String(this.structuredBlocks?.process || '').trim().slice(0, 160),
          tips: String(this.structuredBlocks?.tips || '').trim().slice(0, 160),
          suitableFor: String(this.structuredBlocks?.suitableFor || '').trim().slice(0, 100),
        },
        chargeType: this.form.chargeType,
        feeAmount: Number(this.form.feeAmount) > 0 ? Number(this.form.feeAmount) : 0,
        allowWaitlist: !!this.form.allowWaitlist,
        requireApproval: !!this.form.requireApproval,
        isCommercialActivity: String(this.form.isCommercialActivity || '').trim() === 'yes' ? 'yes' : 'no',
        riskFlags: {
          isNightActivity: this.form.isNightActivity === 'yes' ? 'yes' : 'no',
          isOutdoorActivity: this.form.isOutdoorActivity === 'yes' ? 'yes' : 'no',
          hasAlcohol: this.form.hasAlcohol === 'yes' ? 'yes' : 'no',
          hasCarpool: this.form.hasCarpool === 'yes' ? 'yes' : 'no',
          hasOvernight: this.form.hasOvernight === 'yes' ? 'yes' : 'no',
          hasMinors: this.form.hasMinors === 'yes' ? 'yes' : 'no',
        },
        maxParticipants: Number(this.form.maxParticipants) > 0 ? Number(this.form.maxParticipants) : null,
        durationIndex: Number(this.durationIndex || 1),
        lat: Number(this.form.lat || 0),
        lng: Number(this.form.lng || 0),
        address: String(this.form.address || '').trim(),
        payeeSubject: String(this.form.payeeSubject || '').trim().slice(0, 30),
        refundPolicy: String(this.form.refundPolicy || '').trim().slice(0, 200),
        cancellationPolicy: String(this.form.cancellationPolicy || '').trim().slice(0, 200),
        updatedAt: Date.now(),
      }
    },

    pushRecentPublishProfile() {
      const snapshot = this.buildRecentPublishSnapshot()
      if (!snapshot.sceneId || snapshot.sceneId === 'other_scene') return
      const next = [snapshot, ...(Array.isArray(this.recentPublishProfiles) ? this.recentPublishProfiles : []).filter((item) => item.id !== snapshot.id)]
        .slice(0, QUICK_PUBLISH_MAX_COUNT)
      this.recentPublishProfiles = next
      this.persistRecentPublishProfiles()
    },

    applyRecentProfile(profile = {}) {
      const sceneId = String(profile.sceneId || '').trim()
      if (!sceneId) return
      this.syncSceneAndType(sceneId, String(profile.typeId || '').trim())
      this.selectedTemplateSceneId = sceneId
      this.form.title = String(profile.title || '').slice(0, 30)
      this.form.visibleTags = Array.isArray(profile.visibleTags) ? [...profile.visibleTags].slice(0, 12) : []
      this.form.description = String(profile.descriptionExtra || '').slice(0, 300)
      this.structuredBlocks = {
        highlight: String(profile.structuredBlocks?.highlight || ''),
        process: String(profile.structuredBlocks?.process || ''),
        tips: String(profile.structuredBlocks?.tips || ''),
        suitableFor: String(profile.structuredBlocks?.suitableFor || ''),
      }
      this.useStructuredDescription = true
      this.setChargeType(String(profile.chargeType || 'free'))
      this.form.feeAmount = Number(profile.feeAmount) > 0 ? `${Number(profile.feeAmount)}` : ''
      this.form.allowWaitlist = !!profile.allowWaitlist
      this.form.requireApproval = !!profile.requireApproval
      this.form.isCommercialActivity = String(profile.isCommercialActivity || '') === 'yes' ? 'yes' : 'no'
      this.form.isNightActivity = String(profile.riskFlags?.isNightActivity || 'no') === 'yes' ? 'yes' : 'no'
      this.form.isOutdoorActivity = String(profile.riskFlags?.isOutdoorActivity || 'no') === 'yes' ? 'yes' : 'no'
      this.form.hasAlcohol = String(profile.riskFlags?.hasAlcohol || 'no') === 'yes' ? 'yes' : 'no'
      this.form.hasCarpool = String(profile.riskFlags?.hasCarpool || 'no') === 'yes' ? 'yes' : 'no'
      this.form.hasOvernight = String(profile.riskFlags?.hasOvernight || 'no') === 'yes' ? 'yes' : 'no'
      this.form.hasMinors = String(profile.riskFlags?.hasMinors || 'no') === 'yes' ? 'yes' : 'no'
      this.form.maxParticipants = Number(profile.maxParticipants) > 0 ? Number(profile.maxParticipants) : null
      this.form.payeeSubject = String(profile.payeeSubject || '')
      this.form.refundPolicy = String(profile.refundPolicy || '')
      this.form.cancellationPolicy = String(profile.cancellationPolicy || this.form.cancellationPolicy || '')
      this.durationIndex = Number.isFinite(Number(profile.durationIndex))
        ? Math.max(0, Math.min(this.durationOptions.length - 1, Number(profile.durationIndex)))
        : 1
      if (Number(profile.lat) && Number(profile.lng) && profile.address) {
        this.form.lat = Number(profile.lat)
        this.form.lng = Number(profile.lng)
        this.form.address = String(profile.address || '')
      }
      uni.showToast({ title: '已复用常发布活动', icon: 'success' })
    },

    buildQuickPublishStartMs() {
      const now = Date.now() + 2 * 60 * 60 * 1000
      const dt = new Date(now)
      const mins = dt.getMinutes()
      const rounded = Math.ceil(mins / 15) * 15
      dt.setMinutes(rounded >= 60 ? 0 : rounded, 0, 0)
      if (rounded >= 60) dt.setHours(dt.getHours() + 1)
      return dt.getTime()
    },

    quickPublishRecentProfile(profile = {}) {
      this.applyRecentProfile(profile)
      const nextStartMs = this.buildQuickPublishStartMs()
      this.form.startTimeMs = nextStartMs
      this.form.startTimeStr = this.formatStartTimeTextByMs(nextStartMs)
      const dayIdx = this.findDateIndexByMs(nextStartMs)
      if (dayIdx >= 0) {
        const dt = new Date(nextStartMs)
        const hh = `${dt.getHours()}`.padStart(2, '0')
        const mm = `${dt.getMinutes()}`.padStart(2, '0')
        const hourIdx = Math.max(0, this.timeRangeData.hours.findIndex((x) => x.startsWith(hh)))
        const minuteIdx = Math.max(0, this.timeRangeData.minutes.findIndex((x) => x === mm))
        this.timeIndex = [dayIdx, hourIdx, minuteIdx]
      }
      uni.showModal({
        title: '确认一键发布？',
        content: '将按常发布模板直接提交，开始时间已自动调整为2小时后。',
        success: (res) => {
          if (!res.confirm) return
          this.submit()
        },
      })
    },

    toggleConsent(key = '') {
      const safeKey = String(key || '').trim()
      if (!['publishRules', 'organizerAgreement'].includes(safeKey)) return
      this.consent[safeKey] = !this.consent[safeKey]
    },

    openPublishRules() {
      uni.navigateTo({ url: '/pages/publish-rules/index' })
    },

    openOrganizerAgreement() {
      uni.navigateTo({ url: '/pages/organizer-agreement/index' })
    },

    syncSceneAndType(sceneId = '', typeId = '') {
      const safeSceneId = String(sceneId || '').trim() || String(this.sceneOptions?.[0]?.id || '')
      const sceneIdx = this.sceneOptions.findIndex((item) => item.id === safeSceneId)
      const finalSceneIndex = sceneIdx >= 0 ? sceneIdx : 0
      const finalScene = this.sceneOptions[finalSceneIndex] || this.sceneOptions[0] || { id: '', label: '' }
      const types = getTypesByScene(finalScene.id)
      this.sceneIndex = finalSceneIndex
      this.form.sceneId = finalScene.id
      this.form.sceneName = finalScene.label
      if (String(finalScene.id || '').trim() !== 'other_scene') {
        this.form.customTypeName = ''
      }
      this.typeOptions = types

      let nextTypeIndex = types.findIndex((item) => item.id === String(typeId || '').trim())
      if (nextTypeIndex < 0) nextTypeIndex = 0
      if (nextTypeIndex < 0) nextTypeIndex = 0
      this.typeIndex = nextTypeIndex
      const finalType = types[nextTypeIndex] || { id: '', name: '' }
      this.form.typeId = finalType.id
      this.form.typeName = finalType.name
    },

    applyMarketPrefill(payload = {}, options = {}) {
      const showToast = options?.showToast !== false
      const title = String(payload?.title || '').trim()
      const description = String(payload?.description || '').trim()
      const address = String(payload?.address || '').trim()
      const categoryId = String(payload?.categoryId || '').trim().toLowerCase()
      const sceneId = String(payload?.sceneId || '').trim()
      const typeId = String(payload?.typeId || '').trim()
      const startTimeText = String(payload?.startTime || '').trim()
      const lockDate = payload?.lockDate === true || String(payload?.lockDate || '') === 'true'
      const marketId = String(payload?.marketId || '').trim()
      const marketTitle = String(payload?.marketTitle || '').trim()
      const lat = Number(payload?.lat)
      const lng = Number(payload?.lng)

      // 每次消费预填都先重置“集市关联态”，避免跨场景残留
      this.marketLinkDraft = null
      if (!lockDate) {
        this.marketDateLocked = false
        this.lockedDateIndex = -1
        this.lockedDateLabel = ''
      }

      if (title && !String(this.form.title || '').trim()) {
        this.form.title = title
      }
      if (description && !String(this.form.description || '').trim()) {
        this.form.description = description
      }
      if (address) {
        this.form.address = address
      }
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        this.form.lat = lat
        this.form.lng = lng
      }

      const mappedSceneType = resolveSceneTypeFromLegacyFields({
        sceneId,
        typeId,
        categoryId,
        title,
      })
      this.syncSceneAndType(mappedSceneType.sceneId, mappedSceneType.typeId)
      this.selectedTemplateSceneId = String(mappedSceneType.sceneId || '').trim()
      this.hydrateStructuredByScene(mappedSceneType.sceneId, { force: false })

      const startMs = new Date(startTimeText).getTime()
      if (Number.isFinite(startMs) && startMs > Date.now()) {
        this.form.startTimeMs = startMs
        this.form.startTimeStr = this.formatStartTimeTextByMs(startMs)
        const dateIdx = this.findDateIndexByMs(startMs)
        const start = new Date(startMs)
        const hh = `${start.getHours()}`.padStart(2, '0')
        const mm = `${start.getMinutes()}`.padStart(2, '0')
        const hourIdx = Math.max(0, this.timeRangeData.hours.findIndex((x) => x.startsWith(hh)))
        let minuteIdx = this.timeRangeData.minutes.findIndex((x) => x === mm)
        if (minuteIdx < 0) minuteIdx = 0
        this.timeIndex = [
          dateIdx >= 0 ? dateIdx : this.timeIndex[0],
          hourIdx,
          minuteIdx,
        ]
        if (lockDate && dateIdx >= 0) {
          this.marketDateLocked = true
          this.lockedDateIndex = dateIdx
          this.lockedDateLabel = this.timeRangeData.dates[dateIdx] || ''
        }
      }

      if (marketId) {
        this.marketLinkDraft = {
          marketId,
          marketTitle: marketTitle || title || '固定集市',
        }
      }

      const hasAny = title || description || address || Number.isFinite(startMs)
      if (hasAny && showToast) {
        setTimeout(() => {
          uni.showToast({ title: '已带入集市同行信息', icon: 'none', duration: 1800 })
        }, 100)
      }
      return hasAny
    },

    consumeMarketPrefillFromStorage(options = {}) {
      const key = 'dali_market_prefill_v1'
      let payload = null
      try {
        payload = uni.getStorageSync(key)
      } catch (e) {
        payload = null
      }
      if (!payload || typeof payload !== 'object') return false
      const hasUsefulField = ['title', 'description', 'address', 'categoryId', 'sceneId', 'typeId', 'startTime', 'lat', 'lng']
        .some((k) => typeof payload[k] !== 'undefined' && payload[k] !== '')
      if (!hasUsefulField) return false
      try {
        uni.removeStorageSync(key)
      } catch (e) {}
      return this.applyMarketPrefill(payload, options)
    },

    applyPrefillFromQuery(options = {}) {
      if (String(options.prefill || '') !== 'market') return

      this.applyMarketPrefill({
        title: this.safeDecodeURIComponent(options.title),
        description: this.safeDecodeURIComponent(options.description),
        address: this.safeDecodeURIComponent(options.address),
        categoryId: this.safeDecodeURIComponent(options.categoryId),
        sceneId: this.safeDecodeURIComponent(options.sceneId),
        typeId: this.safeDecodeURIComponent(options.typeId),
        startTime: this.safeDecodeURIComponent(options.startTime),
        marketId: this.safeDecodeURIComponent(options.marketId),
        marketTitle: this.safeDecodeURIComponent(options.marketTitle),
        lat: options.lat,
        lng: options.lng,
      }, { showToast: true })
    },

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

    setChargeType(type = 'free') {
      const safe = ['free', 'aa', 'paid'].includes(type) ? type : 'free'
      this.form.chargeType = safe
      if (safe !== 'paid') this.form.feeAmount = ''
    },

    onFeeAmountInput(e) {
      const raw = String(e?.detail?.value || '')
      const cleaned = raw.replace(/[^\d.]/g, '').replace(/\.{2,}/g, '.')
      this.form.feeAmount = cleaned
    },

    setCommercialMode(mode = 'no') {
      this.form.isCommercialActivity = mode === 'yes' ? 'yes' : mode === 'no' ? 'no' : ''
    },

    setRiskBinary(key = '', value = 'no') {
      const safeKey = String(key || '').trim()
      if (!safeKey || !Object.prototype.hasOwnProperty.call(this.form, safeKey)) return
      this.form[safeKey] = value === 'yes' ? 'yes' : value === 'no' ? 'no' : ''
    },

    parseRiskBinaryValue(value = '') {
      const safe = String(value || '').trim()
      if (safe === 'yes') return true
      if (safe === 'no') return false
      return null
    },

    onAllowWaitlistChange(e) {
      this.form.allowWaitlist = !!e?.detail?.value
    },

    onRequireApprovalChange(e) {
      this.form.requireApproval = !!e?.detail?.value
    },

    toggleVisibleTagGroup(groupId = '') {
      const id = String(groupId || '').trim()
      if (!id || !this.visibleTagOpenMap || typeof this.visibleTagOpenMap[id] === 'undefined') return
      this.visibleTagOpenMap = {
        ...this.visibleTagOpenMap,
        [id]: !this.visibleTagOpenMap[id],
      }
    },

    isVisibleTagGroupOpen(groupId = '') {
      const id = String(groupId || '').trim()
      return !!this.visibleTagOpenMap?.[id]
    },

    visibleTagGroupSelectedCount(groupId = '') {
      const id = String(groupId || '').trim()
      const group = (Array.isArray(this.visibleTagGroups) ? this.visibleTagGroups : [])
        .find((item) => String(item?.id || '') === id)
      if (!group) return 0
      const selected = new Set(Array.isArray(this.form.visibleTags) ? this.form.visibleTags : [])
      return (Array.isArray(group.tags) ? group.tags : []).filter((tag) => selected.has(tag)).length
    },

    toggleVisibleTag(tag = '') {
      const safeTag = String(tag || '').trim()
      if (!safeTag || !USER_VISIBLE_TAG_ALLOW_SET.has(safeTag)) return
      const current = Array.isArray(this.form.visibleTags) ? [...this.form.visibleTags] : []
      const exists = current.includes(safeTag)
      const next = exists
        ? current.filter((item) => item !== safeTag)
        : [...current, safeTag]
      const deduped = [...new Set(next)]
      this.form.visibleTags = deduped.slice(0, 12)
    },

    chooseContactQrcode() {
      // #ifdef MP-WEIXIN
      if (typeof wx === 'undefined' || !wx.chooseMedia || !wx.cloud || !wx.cloud.uploadFile) {
        uni.showToast({ title: '当前环境暂不支持上传二维码', icon: 'none' })
        return
      }
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const filePath = String(res?.tempFiles?.[0]?.tempFilePath || '')
          if (!filePath) return
          uni.showLoading({ title: '上传中...' })
          try {
            const extMatch = filePath.match(/\.(\w+)$/)
            const ext = extMatch ? extMatch[1] : 'jpg'
            const cloudPath = `activity_contact_qrcode/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
            const uploadRes = await wx.cloud.uploadFile({
              cloudPath,
              filePath,
            })
            const fileID = String(uploadRes?.fileID || '')
            if (!fileID) throw new Error('UPLOAD_EMPTY_FILE_ID')
            this.form.contactQrcodeFileId = fileID
            uni.showToast({ title: '二维码已上传', icon: 'success' })
          } catch (err) {
            console.error('上传二维码失败', err)
            uni.showToast({ title: '上传失败，请重试', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        },
      })
      // #endif

      // #ifndef MP-WEIXIN
      uni.showToast({ title: '仅微信小程序支持上传二维码', icon: 'none' })
      // #endif
    },

    clearContactQrcode() {
      this.form.contactQrcodeFileId = ''
    },

    onSceneChange(e) {
      const idx = Number(e.detail.value || 0)
      const selected = this.sceneOptions[idx] || this.sceneOptions[0]
      this.syncSceneAndType(selected?.id || '', '')
      this.selectedTemplateSceneId = String(selected?.id || '').trim()
      if (String(selected?.id || '').trim() !== 'other_scene') {
        this.form.customTypeName = ''
        this.hydrateStructuredByScene(selected?.id || '', { force: false })
      }
    },

    onTypeChange(e) {
      const idx = Number(e.detail.value || 0)
      this.typeIndex = idx
      const selected = this.typeOptions[idx] || this.typeOptions[0] || { id: '', name: '' }
      this.form.typeId = selected.id
      this.form.typeName = selected.name
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
      if (this.marketDateLocked && column === 0 && Number(value) !== this.lockedDateIndex) {
        this.timeIndex[0] = this.lockedDateIndex
        this.timeIndex = [...this.timeIndex]
        uni.showToast({ title: '集市同行日期已锁定', icon: 'none' })
        return
      }
      this.timeIndex[column] = value
      this.timeIndex = [...this.timeIndex]
    },

    onTimeChange(e) {
      this.timeIndex = e.detail.value
      if (this.marketDateLocked && Number(this.timeIndex[0]) !== this.lockedDateIndex) {
        this.timeIndex[0] = this.lockedDateIndex
        this.timeIndex = [...this.timeIndex]
        uni.showToast({ title: '集市同行日期不可更改', icon: 'none' })
      }
      this._updateStartTime()
    },

    toLocalDayKey(input) {
      const dt = new Date(input)
      if (!Number.isFinite(dt.getTime())) return ''
      const y = dt.getFullYear()
      const m = `${dt.getMonth() + 1}`.padStart(2, '0')
      const d = `${dt.getDate()}`.padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    findDateIndexByMs(ms) {
      const targetKey = this.toLocalDayKey(ms)
      if (!targetKey) return -1
      const now = Date.now()
      const total = Array.isArray(this.timeRangeData.dates) ? this.timeRangeData.dates.length : 0
      for (let i = 0; i < total; i += 1) {
        const dayMs = now + i * 24 * 60 * 60 * 1000
        if (this.toLocalDayKey(dayMs) === targetKey) return i
      }
      return -1
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

    initProfileDraft() {
      const gd = getApp().globalData || {}
      const nickname = String(gd.nickname || this.userStore.nickname || '').trim()
      const avatarUrl = String(gd.avatarUrl || this.userStore.avatarUrl || '').trim()
      const socialPreference = normalizeSocialPreference(gd.socialPreference || this.userStore.socialPreference || 'unknown')
      const residencyType = normalizeResidencyType(gd.residencyType || this.userStore.residencyType || 'unknown')
      const identityTags = normalizeIdentityTags(gd.identityTags || this.userStore.identityTags || [], 3)
      this.profileDraftNickname = nickname
      this.profileDraftAvatar = avatarUrl
      this.profileDraftSocialPreference = socialPreference
      this.profileDraftResidencyType = residencyType
      this.profileDraftIdentityTags = identityTags
    },
    closeProfileDialog() {
      this.showProfileDialog = false
    },
    onPublishChooseAvatar(e) {
      this.profileDraftAvatar = String(e?.detail?.avatarUrl || '').trim()
    },
    onProfileSocialPreferenceChange(e) {
      const idx = Number(e?.detail?.value || 0)
      const option = this.socialPreferenceOptions[idx] || this.socialPreferenceOptions[0]
      this.profileDraftSocialPreference = normalizeSocialPreference(option?.id || 'unknown')
    },
    onProfileResidencyTypeChange(e) {
      const idx = Number(e?.detail?.value || 0)
      const option = this.residencyTypeOptions[idx] || this.residencyTypeOptions[0]
      this.profileDraftResidencyType = normalizeResidencyType(option?.id || 'unknown')
    },
    toggleProfileIdentityTag(tagId = '') {
      const safe = String(tagId || '').trim()
      if (!safe) return
      const current = Array.isArray(this.profileDraftIdentityTags) ? [...this.profileDraftIdentityTags] : []
      const exists = current.includes(safe)
      const next = exists
        ? current.filter((item) => item !== safe)
        : [...current, safe]
      this.profileDraftIdentityTags = normalizeIdentityTags(next, 3)
    },
    async saveProfileAndContinuePublish() {
      const nickname = String(this.profileDraftNickname || '').trim()
      const avatarUrl = String(this.profileDraftAvatar || '').trim()
      const socialPreference = normalizeSocialPreference(this.profileDraftSocialPreference)
      const residencyType = normalizeResidencyType(this.profileDraftResidencyType)
      const identityTags = normalizeIdentityTags(this.profileDraftIdentityTags, 3)
      if (!avatarUrl) {
        uni.showToast({ title: '请先设置头像', icon: 'none' })
        return
      }
      if (!nickname) {
        uni.showToast({ title: '请先填写用户名', icon: 'none' })
        return
      }
      if (socialPreference === 'unknown') {
        uni.showToast({ title: '请先选择社交偏好', icon: 'none' })
        return
      }
      if (residencyType === 'unknown') {
        uni.showToast({ title: '请先选择居住身份', icon: 'none' })
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
          uni.showToast({ title: '保存资料失败，请重试', icon: 'none' })
          return
        }
        const gd = getApp().globalData || {}
        gd.nickname = nickname
        gd.avatarUrl = avatarUrl
        gd.socialPreference = socialPreference
        gd.residencyType = residencyType
        gd.identityTags = identityTags
        this.userStore.nickname = nickname
        this.userStore.avatarUrl = avatarUrl
        this.userStore.socialPreference = socialPreference
        this.userStore.residencyType = residencyType
        this.userStore.identityTags = identityTags
        this.showProfileDialog = false
        uni.showToast({ title: '资料已完善', icon: 'success' })
        setTimeout(() => {
          this.submit()
        }, 250)
      } catch (err) {
        console.error('发布前完善资料失败', err)
        uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
      }
    },

    closePhoneBindDialog() {
      this.showPhoneBindDialog = false
    },

    async onPublishGetPhoneNumber(e) {
      const code = e?.detail?.code || ''
      if (!code) {
        uni.showToast({ title: '你取消了手机号授权', icon: 'none' })
        return
      }
      try {
        const res = await callCloud('bindPhoneNumber', { code })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '绑定失败，请重试', icon: 'none' })
          return
        }
        const gd = getApp().globalData || {}
        gd.phoneVerified = true
        gd.mobileBindStatus = 'bound'
        gd.mobileBoundAt = res.mobileBoundAt || new Date().toISOString()
        this.userStore.phoneVerified = true
        this.userStore.mobileBindStatus = 'bound'
        this.userStore.mobileBoundAt = gd.mobileBoundAt
        this.showPhoneBindDialog = false
        uni.showToast({ title: '手机号绑定成功', icon: 'success' })
        setTimeout(() => {
          this.submit()
        }, 250)
      } catch (err) {
        console.error('发布前绑定手机号失败', err)
        uni.showToast({ title: '绑定失败，请稍后再试', icon: 'none' })
      }
    },

    async submit() {
      try {
        await this.userStore.syncSession({ force: true, minIntervalMs: 0 })
      } catch (e) {
        console.error('发布前同步登录态失败', e)
      }
      const gd = getApp().globalData || {}
      const nickname = String(gd.nickname || this.userStore.nickname || '').trim()
      const avatarUrl = String(gd.avatarUrl || this.userStore.avatarUrl || '').trim()
      if (!nickname || !avatarUrl) {
        this.initProfileDraft()
        this.showProfileDialog = true
        return
      }
      const phoneVerified = !!(gd.phoneVerified || this.userStore.phoneVerified)
      if (!phoneVerified) {
        this.showPhoneBindDialog = true
        return
      }
      const isVerified = gd.isVerified || this.userStore.isVerified
      if (!isVerified) {
        uni.showModal({
          title: '需要身份核验',
          content: '发布活动需要先完成身份核验',
          confirmText: '去核验',
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
      const normalizedCustomTypeName = normalizeCustomTypeName(this.form.customTypeName || '')
      if (this.isCustomSceneSelected) {
        if (!normalizedCustomTypeName || normalizedCustomTypeName.length < 2) {
          uni.showToast({ title: '请填写2-20字活动场景', icon: 'none' })
          return
        }
        if (this.customTypeDuplicateLabel) {
          uni.showToast({ title: `与“${this.customTypeDuplicateLabel}”重复`, icon: 'none' })
          return
        }
      }
      if (!this.form.sceneId || (!this.isCustomSceneSelected && !this.form.typeId)) {
        uni.showToast({ title: '请选择活动类型和活动场景', icon: 'none' })
        return
      }
      if (!['free', 'aa', 'paid'].includes(this.form.chargeType)) {
        uni.showToast({ title: '请选择收费方式', icon: 'none' })
        return
      }
      const isCommercialActivity = this.parseRiskBinaryValue(this.form.isCommercialActivity)
      if (isCommercialActivity === null) {
        uni.showToast({ title: '请选择是否商业组织活动', icon: 'none' })
        return
      }
      let feeAmount = 0
      if (this.form.chargeType === 'paid') {
        feeAmount = Number(this.form.feeAmount)
        if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
          uni.showToast({ title: '请填写正确的付费金额', icon: 'none' })
          return
        }
      }
      const payeeSubject = String(this.form.payeeSubject || '').trim()
      const refundPolicy = String(this.form.refundPolicy || '').trim()
      const cancellationPolicy = String(this.form.cancellationPolicy || '').trim()
      if (this.form.chargeType !== 'free') {
        if (payeeSubject.length < 2) {
          uni.showToast({ title: '请填写收款主体', icon: 'none' })
          return
        }
        if (refundPolicy.length < 4) {
          uni.showToast({ title: '请填写退款规则', icon: 'none' })
          return
        }
      }
      if (cancellationPolicy.length < 4) {
        uni.showToast({ title: '请填写活动取消规则', icon: 'none' })
        return
      }
      const riskBinaryPayload = {}
      const missingRiskField = this.riskBinaryFields.find((item) => {
        const parsed = this.parseRiskBinaryValue(this.form[item.key])
        if (parsed === null) return true
        riskBinaryPayload[item.key] = parsed
        return false
      })
      if (missingRiskField) {
        uni.showToast({ title: `请选择：${missingRiskField.label}`, icon: 'none' })
        return
      }
      const contactPhone = String(this.form.contactPhone || '').trim()
      const contactWechat = String(this.form.contactWechat || '').trim()
      const contactQrcodeFileId = String(this.form.contactQrcodeFileId || '').trim()
      if (!contactPhone && !contactWechat && !contactQrcodeFileId) {
        uni.showToast({ title: '请至少填写1项联系方式', icon: 'none' })
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
      if (!this.consent.publishRules || !this.consent.organizerAgreement) {
        uni.showToast({ title: '请先同意发布规则与组织者协议', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const finalCategoryId = resolveCategoryBySceneType(this.form.sceneId, this.form.typeId)
        const finalDescription = this.useStructuredDescription
          ? this.buildStructuredDescriptionText({ includeExtraDescription: true })
          : String(this.form.description || '').trim()
        const visibleTags = [...new Set((Array.isArray(this.form.visibleTags) ? this.form.visibleTags : [])
          .map((item) => String(item || '').trim())
          .filter((item) => item && USER_VISIBLE_TAG_ALLOW_SET.has(item)))]
          .slice(0, 12)
        const res = await callCloud('publishActivity', {
          title:            this.form.title.trim(),
          description:      finalDescription,
          visibleTags,
          sceneId:          this.form.sceneId,
          sceneName:        this.form.sceneName,
          typeId:           this.isCustomSceneSelected ? '' : this.form.typeId,
          typeName:         this.isCustomSceneSelected ? normalizedCustomTypeName : this.form.typeName,
          customTypeName:   this.isCustomSceneSelected ? normalizedCustomTypeName : '',
          socialEnergy:     this.inferredSocialEnergyId,
          chargeType:       this.form.chargeType,
          feeAmount,
          isCommercialActivity,
          payeeSubject,
          refundPolicy,
          cancellationPolicy,
          ...riskBinaryPayload,
          allowWaitlist:    !!this.form.allowWaitlist,
          requireApproval:  !!this.form.requireApproval,
          contactPhone,
          contactWechat,
          contactQrcodeFileId,
          categoryId:       finalCategoryId,
          categoryLabel:    getCategoryLabel(finalCategoryId),
          customCategoryLabel: '',
          lat:              this.form.lat,
          lng:              this.form.lng,
          address:          this.form.address,
          startTime:        new Date(this.form.startTimeMs).toISOString(),
          endTime:          new Date(this._getEndTimeMs()).toISOString(),
          maxParticipants:  this.form.maxParticipants || null,
          isGroupFormation: this.form.isGroupFormation,
          minParticipants:  this.form.isGroupFormation ? this.form.minParticipants : 0,
          formationWindow:  this.form.isGroupFormation ? this.formationWindowValues[this.formationWindowIndex] : 30,
          cityId:           'dali',
          marketLink: this.marketLinkDraft
            ? {
              marketId: String(this.marketLinkDraft.marketId || ''),
              marketTitle: String(this.marketLinkDraft.marketTitle || ''),
              marketDayKey: this.toLocalDayKey(this.form.startTimeMs),
            }
            : null,
          publishConsent: {
            publishRules: {
              accepted: !!this.consent.publishRules,
              version: this.publishRulesVersion,
            },
            organizerAgreement: {
              accepted: !!this.consent.organizerAgreement,
              version: this.organizerAgreementVersion,
            },
            source: 'publish_page',
            acceptedAt: new Date().toISOString(),
          },
        })
        if (res.success) {
          this.pushRecentPublishProfile()
          const publishReviewStatus = String(res.publishReviewStatus || '').toLowerCase()
          const baseText = publishReviewStatus === 'pending'
            ? '已提交审核'
            : (res.isOfficial ? '官方活动已发布' : '发布成功！')
          const successText = res.participantCapApplied
            ? `${baseText}（人数上限已按规则调整）`
            : baseText
          uni.showToast({ title: successText, icon: 'success' })
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
          if (res.error === 'CONSENT_REQUIRED' || res.error === 'CONSENT_VERSION_MISMATCH') {
            uni.showModal({
              title: '发布前需同意协议',
              content: res.message || '请阅读并同意当前版本发布规则后继续',
              confirmText: '去阅读',
              success: (r) => {
                if (r.confirm) this.openPublishRules()
              }
            })
            return
          }
          const msgs = {
            NOT_VERIFIED:  '请先完成身份核验',
            IDENTITY_CHECK_REQUIRED: '当前账号需补充身份核验',
            INVALID_TITLE: '标题格式有误',
            INVALID_SCENE: '请选择有效活动类型',
            SCENE_NOT_SELECTABLE: '节庆活动类型由系统自动匹配，无需手动选择',
            INVALID_TYPE: '请选择有效活动场景',
            INVALID_CUSTOM_TYPE: '请输入有效的自定义活动场景',
            CUSTOM_TYPE_TOO_LONG: '自定义活动场景最多20字',
            DUPLICATE_CUSTOM_TYPE: '自定义活动场景与现有场景重复',
            INVALID_CHARGE_TYPE: '收费方式不合法',
            INVALID_FEE_AMOUNT: '付费金额不合法',
            INVALID_COMMERCIAL_FLAG: '请选择是否商业组织活动',
            MISSING_PAYEE_SUBJECT: '请填写收款主体',
            MISSING_REFUND_POLICY: '请填写退款规则',
            MISSING_CANCELLATION_POLICY: '请填写活动取消规则',
            MISSING_RISK_FLAGS: '请完整填写风险要素申报',
            CONTACT_REQUIRED: '请至少填写1项联系方式',
            INVALID_CATEGORY: '请选择有效活动分类',
            START_PASSED:  '开始时间不能早于现在',
            INVALID_MIN:   '成团人数至少2人',
            INVALID_WINDOW:'成团时间窗口不合法',
            MIN_PARTICIPANTS_EXCEED_MAX: '最低成团人数不能超过活动人数上限',
            OUT_OF_DALI_REGION: '活动地点需在大理白族自治州范围内',
            CITY_NOT_SUPPORTED: '当前仅支持在大理白族自治州发布活动',
            ORGANIZER_TIER_BLOCKED: '当前账号等级暂不支持发布该活动',
            PUBLISH_RESTRICTED: '当前账号发布受限，请联系管理员',
            CONSENT_REQUIRED: '请先同意《活动发布规则》《组织者服务协议》',
            CONSENT_VERSION_MISMATCH: '协议版本已更新，请重新同意后发布',
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
.structured-switch-row {
  margin-bottom: 12rpx;
}
.template-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.template-chip {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #475467;
  background: #F2F4F7;
  border: 1rpx solid #E4E7EC;
}
.template-chip--active {
  color: #1A3C5E;
  background: #EAF2FB;
  border-color: #1A3C5E;
  font-weight: 600;
}
.template-actions {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.mini-btn {
  margin: 0;
  height: 62rpx;
  line-height: 62rpx;
  padding: 0 20rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #1A3C5E;
  background: #EAF2FB;
  border: none;
}
.mini-btn::after { border: none; }
.mini-btn--ghost {
  color: #475467;
  background: #F2F4F7;
}
.recent-item {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 10rpx;
  background: #F8FAFC;
  border: 1rpx solid #EEF2F7;
}
.recent-main {
  margin-bottom: 10rpx;
}
.recent-title {
  display: block;
  font-size: 25rpx;
  color: #1F2937;
  font-weight: 600;
}
.recent-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #667085;
}
.recent-actions {
  display: flex;
  gap: 10rpx;
}
.empty {
  padding: 24rpx 0;
  text-align: center;
}
.empty--inline {
  padding: 16rpx 0;
}
.empty-text {
  font-size: 22rpx;
  color: #98A2B3;
}
.label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.mb0 { margin-bottom: 4rpx; }
.hint { font-size: 22rpx; color: #bbb; display: block; margin-top: 8rpx; }
.hint-error { color: #C00000; }
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
.structured-editor {
  margin-bottom: 14rpx;
  padding: 14rpx;
  border-radius: 12rpx;
  background: #F8FAFC;
}
.structured-preview {
  margin-top: 12rpx;
  padding: 12rpx;
  border-radius: 10rpx;
  background: #FFFFFF;
  border: 1rpx solid #E4E7EC;
}
.structured-preview-label {
  display: block;
  font-size: 22rpx;
  color: #667085;
}
.structured-preview-text {
  margin-top: 6rpx;
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: #344054;
  white-space: pre-wrap;
}
.char-count {
  font-size: 22rpx;
  color: #ccc;
  display: block;
  text-align: right;
  margin-top: 8rpx;
}
.visible-tags-summary {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.visible-tags-summary-text {
  font-size: 24rpx;
  color: #667085;
}
.visible-tags-summary-sub {
  font-size: 24rpx;
  color: #98A2B3;
}
.selected-visible-tags {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.selected-visible-tag {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #155EEF;
  background: #EEF4FF;
}
.visible-tag-groups {
  margin-top: 14rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #F8FAFC;
}
.visible-tag-group + .visible-tag-group {
  margin-top: 16rpx;
}
.visible-tag-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 0 10rpx;
}
.visible-tag-group-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #344054;
}
.visible-tag-group-meta {
  font-size: 22rpx;
  color: #1A3C5E;
}
.visible-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.visible-tag-item {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #475467;
  background: #FFFFFF;
  border: 1rpx solid #E4E7EC;
}
.visible-tag-item--active {
  color: #1A3C5E;
  background: #EAF2FB;
  border-color: #1A3C5E;
}
.location-row, .picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mt12 { margin-top: 12rpx; }
.location-chosen    { font-size: 30rpx; color: #333; flex: 1; }
.location-placeholder { font-size: 30rpx; color: #ccc; flex: 1; }
.picker-value       { font-size: 30rpx; color: #333; flex: 1; }
.picker-placeholder { font-size: 30rpx; color: #ccc; flex: 1; }
.arrow { font-size: 36rpx; color: #ccc; }

.fee-options {
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
}
.fee-option {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #475467;
  background: #F2F4F7;
}
.fee-option--active {
  color: #1A3C5E;
  background: #EAF2FB;
  font-weight: 600;
}
.fee-input-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.risk-binary-row {
  margin-top: 10rpx;
}
.risk-binary-label {
  display: block;
  font-size: 24rpx;
  color: #344054;
  margin-bottom: 8rpx;
}
.risk-binary-options {
  margin-top: 0;
}
.fee-currency {
  font-size: 30rpx;
  color: #333;
}
.fee-amount-input {
  flex: 1;
  height: 72rpx;
  border-radius: 12rpx;
  background: #F5F7FA;
  padding: 0 16rpx;
  font-size: 28rpx;
  color: #333;
}
.qrcode-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.qrcode-btn {
  margin: 0;
  border: none;
  height: 66rpx;
  line-height: 66rpx;
  border-radius: 10rpx;
  padding: 0 20rpx;
  background: #EEF4FB;
  color: #1A3C5E;
  font-size: 24rpx;
}
.qrcode-btn::after { border: none; }
.qrcode-clear {
  font-size: 24rpx;
  color: #B42318;
}
.qrcode-preview {
  margin-top: 14rpx;
  width: 180rpx;
  height: 180rpx;
  border-radius: 10rpx;
  background: #f2f4f7;
}
.consent-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.consent-box {
  font-size: 30rpx;
  color: #1A3C5E;
  line-height: 1.4;
}
.consent-content {
  flex: 1;
}
.consent-line {
  font-size: 25rpx;
  color: #344054;
  line-height: 1.6;
}
.consent-link {
  color: #1A3C5E;
  font-weight: 600;
}

.phone-bind-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.phone-bind-dialog {
  width: 84%;
  background: #fff;
  border-radius: 18rpx;
  padding: 34rpx 30rpx 28rpx;
}
.phone-bind-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A1A1A;
}
.phone-bind-desc {
  margin-top: 14rpx;
  display: block;
  font-size: 24rpx;
  color: #667085;
  line-height: 1.6;
}
.phone-bind-confirm {
  margin-top: 26rpx;
  width: 100%;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 12rpx;
  background: #1A3C5E;
  color: #fff;
  font-size: 28rpx;
  border: none;
}
.phone-bind-confirm::after { border: none; }
.phone-bind-cancel {
  margin-top: 18rpx;
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #98A2B3;
}
.profile-editor {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
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
  color: #1A3C5E;
}
.profile-nickname-input {
  flex: 1;
  height: 72rpx;
  border-radius: 10rpx;
  background: #f5f7fa;
  padding: 0 18rpx;
  font-size: 26rpx;
  color: #1a1a1a;
}
.profile-extra {
  margin-top: 16rpx;
  border-radius: 12rpx;
  background: #f8fafc;
  padding: 14rpx 14rpx 8rpx;
}
.profile-extra-field {
  margin-bottom: 10rpx;
}
.profile-extra-label {
  display: block;
  font-size: 22rpx;
  color: #667085;
  margin-bottom: 6rpx;
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
