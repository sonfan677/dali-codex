<template>
  <view class="page">
    <view class="content">

      <view class="header">
        <text class="title">实名认证</text>
        <text class="desc">发布活动前需要完成实名认证。你的信息加密存储，不会对外展示。</text>
      </view>

      <!-- 已认证 -->
      <view v-if="alreadyVerified" class="verified-box">
        <text class="verified-icon">✅</text>
        <text class="verified-text">你已完成实名认证，可以发布活动了</text>
      </view>

      <!-- 待审核 -->
      <view v-else-if="isPending" class="pending-box">
        <text class="pending-icon">⏳</text>
        <text class="pending-text">认证申请已提交，我们将在24小时内完成审核</text>
      </view>

      <!-- 填写表单 -->
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
          <text class="label">手机号</text>
          <input
            class="input"
            v-model="form.phone"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </view>

        <view class="privacy-note">
          <text>你的姓名和手机号仅用于身份核实，加密存储，不会展示给其他用户。</text>
        </view>

        <button
          class="submit-btn"
          @tap="submit"
          :loading="submitting"
        >提交认证</button>
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
      form: { realName: '', phone: '' },
    }
  },

  computed: {
    alreadyVerified() {
      return this.userStore.verifyStatus === 'approved' || this.userStore.isVerified
    },
    isPending() {
      return this.userStore.verifyStatus === 'pending'
    },
  },

  methods: {
    async submit() {
      if (!this.form.realName.trim()) {
        uni.showToast({ title: '请填写真实姓名', icon: 'none' })
        return
      }
      if (!/^1[3-9]\d{9}$/.test(this.form.phone)) {
        uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const res = await callCloud('submitVerify', {
          realName: this.form.realName.trim(),
          phone: this.form.phone,
        })

        if (res.success) {
          this.userStore.verifyStatus = 'pending'
          uni.showToast({ title: '提交成功！等待审核', icon: 'success' })
        } else {
          uni.showToast({ title: res.message || '提交失败', icon: 'none' })
        }
      } catch(e) {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; }
.content { padding: 48rpx 32rpx; }

.header { margin-bottom: 48rpx; }
.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1A3C5E;
  display: block;
  margin-bottom: 20rpx;
}
.desc { font-size: 28rpx; color: #666; line-height: 1.6; }

/* 已认证 */
.verified-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
  background: white;
  border-radius: 16rpx;
  gap: 24rpx;
}
.verified-icon { font-size: 80rpx; }
.verified-text { font-size: 30rpx; color: #1E7145; text-align: center; }

/* 待审核 */
.pending-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
  background: white;
  border-radius: 16rpx;
  gap: 24rpx;
}
.pending-icon { font-size: 80rpx; }
.pending-text { font-size: 28rpx; color: #888; text-align: center; line-height: 1.6; }

/* 表单 */
.form { display: flex; flex-direction: column; gap: 16rpx; }
.field {
  background: white;
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
  color: white;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  margin-top: 16rpx;
}
</style>