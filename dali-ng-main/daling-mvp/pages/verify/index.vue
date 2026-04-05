<template>
  <view class="page">
    <view class="content">
      <view class="header">
        <text class="title">身份核验</text>
        <text class="desc">{{ headerDesc }}</text>
      </view>

      <view v-if="!stateReady" class="pending-box">
        <text class="pending-icon">⏳</text>
        <text class="pending-text">核验状态加载中...</text>
      </view>

      <view v-else-if="needsIdentityRecheck" class="risk-box">
        <text class="risk-title">当前账号需补充身份核验</text>
        <text class="risk-desc">{{ identityReasonText }}</text>
      </view>

      <view v-else-if="alreadyVerified" class="verified-box">
        <text class="verified-icon">✅</text>
        <text class="verified-text">你已完成身份核验，可以发布活动了</text>
        <text class="verified-sub">核验状态：已通过</text>
      </view>

      <view v-else-if="isPending" class="pending-box">
        <text class="pending-icon">⏳</text>
        <text class="pending-text">{{ pendingText }}</text>
      </view>

      <view v-else class="form">
        <view class="field">
          <text class="label">真实姓名</text>
          <input
            class="input"
            v-model="form.realName"
            placeholder="请输入真实姓名"
            maxlength="20"
          />
        </view>
        <view class="field">
          <text class="label">身份证号</text>
          <input
            class="input"
            v-model="form.idCard"
            placeholder="请输入18位身份证号"
            maxlength="18"
          />
        </view>

        <view class="privacy-note">
          <text>你的姓名和身份证号仅用于身份核验，加密存储，不会展示给其他用户。</text>
        </view>

        <button class="submit-btn" @tap="submitManualVerify" :loading="submitting">提交核验</button>
      </view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'
import { useUserStore } from '@/stores/user.js'

export default {
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },

  data() {
    return {
      submitting: false,
      stateReady: false,
      form: { realName: '', idCard: '' },
    }
  },

  async onShow() {
    await this.syncVerifyState()
  },

  computed: {
    alreadyVerified() {
      return (this.userStore.verifyStatus === 'approved' || this.userStore.isVerified) && !this.needsIdentityRecheck
    },
    isPending() {
      return this.userStore.verifyStatus === 'pending'
    },
    needsIdentityRecheck() {
      return !!this.userStore.identityCheckRequired && this.userStore.identityCheckStatus !== 'approved'
    },
    headerDesc() {
      if (this.needsIdentityRecheck) {
        return '你的账号已进入补充核验流程。完成核验后可继续发布活动。信息加密存储，不对外展示。'
      }
      return '发布活动前需要完成身份核验。你的信息加密存储，不会对外展示。'
    },
    pendingText() {
      return '核验申请已提交，我们将在24小时内完成审核'
    },
    identityReasonText() {
      const map = {
        REPORTED_USER: '触发原因：账号被举报后需补充核验',
        HIGH_FREQ_ORGANIZER: '触发原因：近期高频发布触发补充核验',
      }
      const reasons = Array.isArray(this.userStore.identityCheckReasons)
        ? this.userStore.identityCheckReasons.map((code) => map[String(code)] || String(code)).filter(Boolean)
        : []
      return reasons.length ? reasons.join('；') : '触发原因：平台风险策略触发'
    },
  },

  methods: {
    applyVerifyState(snapshot = {}) {
      if (snapshot.openid) this.userStore.openid = snapshot.openid
      if (typeof snapshot.nickname === 'string') this.userStore.nickname = snapshot.nickname
      if (typeof snapshot.avatarUrl === 'string') this.userStore.avatarUrl = snapshot.avatarUrl
      this.userStore.isVerified = !!snapshot.isVerified
      this.userStore.verifyStatus = snapshot.verifyStatus || 'none'
      this.userStore.verifyProvider = snapshot.verifyProvider || 'manual'
      this.userStore.phoneVerified = !!snapshot.phoneVerified
      this.userStore.mobileBindStatus = snapshot.mobileBindStatus || (snapshot.phoneVerified ? 'bound' : 'unbound')
      this.userStore.mobileBoundAt = snapshot.mobileBoundAt || null
      this.userStore.identityCheckRequired = !!snapshot.identityCheckRequired
      this.userStore.identityCheckStatus = snapshot.identityCheckStatus || 'none'
      this.userStore.identityCheckReasons = Array.isArray(snapshot.identityCheckReasons) ? snapshot.identityCheckReasons : []
      this.userStore.identityCheckTriggeredAt = snapshot.identityCheckTriggeredAt || null
      this.userStore.isLoggedIn = true
    },

    applyVerifyStateToGlobal(snapshot = {}) {
      getApp().globalData = getApp().globalData || {}
      getApp().globalData.isVerified = !!snapshot.isVerified
      getApp().globalData.verifyStatus = snapshot.verifyStatus || 'none'
      getApp().globalData.verifyProvider = snapshot.verifyProvider || 'manual'
      getApp().globalData.identityCheckRequired = !!snapshot.identityCheckRequired
      getApp().globalData.identityCheckStatus = snapshot.identityCheckStatus || 'none'
      getApp().globalData.identityCheckReasons = Array.isArray(snapshot.identityCheckReasons) ? snapshot.identityCheckReasons : []
      getApp().globalData.identityCheckTriggeredAt = snapshot.identityCheckTriggeredAt || null
      if (snapshot.openid) getApp().globalData.openid = snapshot.openid
      if (typeof snapshot.nickname === 'string') getApp().globalData.nickname = snapshot.nickname
      if (typeof snapshot.avatarUrl === 'string') getApp().globalData.avatarUrl = snapshot.avatarUrl
      if (typeof snapshot.phoneVerified !== 'undefined') getApp().globalData.phoneVerified = !!snapshot.phoneVerified
      if (typeof snapshot.mobileBindStatus === 'string') getApp().globalData.mobileBindStatus = snapshot.mobileBindStatus
      if (typeof snapshot.mobileBoundAt !== 'undefined') getApp().globalData.mobileBoundAt = snapshot.mobileBoundAt || null
      getApp().globalData.isLoggedIn = true
    },

    async syncVerifyState() {
      this.stateReady = false
      const gd = getApp().globalData || {}
      if (gd.isLoggedIn && (gd.openid || this.userStore.openid)) {
        this.applyVerifyState(gd)
        this.stateReady = true
        return
      }
      try {
        const res = await callCloud('login', {})
        if (res && res.success) {
          this.applyVerifyStateToGlobal(res)
          this.applyVerifyState(res)
        }
      } catch (e) {
        console.error('同步核验状态失败', e)
      } finally {
        this.stateReady = true
      }
    },

    syncIdentityToGlobal(patch = {}) {
      getApp().globalData = getApp().globalData || {}
      Object.keys(patch).forEach((key) => {
        getApp().globalData[key] = patch[key]
      })
    },
    async submitManualVerify() {
      if (!this.form.realName.trim()) {
        uni.showToast({ title: '请填写真实姓名', icon: 'none' })
        return
      }
      if (!/^\d{17}[\dXx]$/.test(String(this.form.idCard || '').trim())) {
        uni.showToast({ title: '请填写正确的身份证号', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const res = await callCloud('submitVerify', {
          realName: this.form.realName.trim(),
          idCard: String(this.form.idCard || '').trim().toUpperCase(),
          verifyProvider: 'manual',
        })

        if (res.success) {
          this.userStore.verifyStatus = 'pending'
          this.userStore.verifyProvider = 'manual'
          this.userStore.identityCheckRequired = true
          this.userStore.identityCheckStatus = 'pending'
          this.syncIdentityToGlobal({
            verifyStatus: 'pending',
            verifyProvider: 'manual',
            identityCheckRequired: true,
            identityCheckStatus: 'pending',
          })
          uni.showToast({ title: '提交成功！等待审核', icon: 'success' })
        } else {
          uni.showToast({ title: res.message || '提交失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; }
.content { padding: 48rpx 32rpx; }

.header { margin-bottom: 28rpx; }
.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1A3C5E;
  display: block;
  margin-bottom: 20rpx;
}
.desc { font-size: 28rpx; color: #666; line-height: 1.6; }

.risk-box {
  margin-bottom: 20rpx;
  padding: 24rpx 24rpx;
  background: #fff7ed;
  border-radius: 14rpx;
  border: 1rpx solid #fed7aa;
}
.risk-title {
  display: block;
  font-size: 28rpx;
  color: #9a3412;
  font-weight: 600;
}
.risk-desc {
  margin-top: 10rpx;
  display: block;
  font-size: 24rpx;
  color: #c2410c;
  line-height: 1.6;
}

.verified-box,
.pending-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 40rpx;
  background: #fff;
  border-radius: 16rpx;
  gap: 20rpx;
}
.verified-icon,
.pending-icon { font-size: 80rpx; }
.verified-text { font-size: 30rpx; color: #1E7145; text-align: center; }
.verified-sub { font-size: 24rpx; color: #3C5D7F; }
.pending-text { font-size: 28rpx; color: #666; text-align: center; line-height: 1.6; }

.form { display: flex; flex-direction: column; gap: 16rpx; }
.field {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
}
.label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.input {
  font-size: 32rpx;
  color: #333;
  width: 100%;
}
.privacy-note {
  padding: 24rpx;
  background: #EEF4FB;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}
.submit-btn {
  width: 100%;
  height: 96rpx;
  background: #1A3C5E;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  margin-top: 16rpx;
}
</style>
