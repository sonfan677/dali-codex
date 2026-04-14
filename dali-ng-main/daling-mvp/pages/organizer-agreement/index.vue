<template>
  <scroll-view scroll-y class="page">
    <view class="content">
      <text class="title">组织者服务协议</text>
      <text class="date">版本号：organizer_agreement_v1 · 更新日期：2026年4月</text>
      <text class="intro">你申请发布活动或继续使用组织者能力前，应完整阅读本协议。继续发布即视为同意。</text>

      <text class="section-title">1. 协议范围</text>
      <text class="item-body">本协议约定平台与活动组织者在活动发布、收费披露、风险提示、投诉处理、平台治理中的权利与义务。</text>

      <text class="section-title">2. 组织者承诺</text>
      <view class="bullet-group">
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">发布信息真实、完整、准确，不隐瞒核心条件。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">收费活动须明确收款主体、收费项目、退款规则和取消规则。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">对线下活动组织、现场管理、安全提示和履约结果自行负责。</text></view>
      </view>

      <text class="section-title">3. 资质与合规</text>
      <view class="bullet-group">
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">依法需要许可或专业资质的活动，须按要求提交并保持资质有效。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">组织者不得冒充平台官方，不得误导用户认为平台为活动担保方。</text></view>
      </view>

      <text class="section-title">4. 平台治理与处置</text>
      <text class="item-body">平台可基于风险分级、投诉举报、违规记录采取审核、驳回、下架、限权、冻结等措施。严重或反复违规行为可触发账号分层降级。</text>

      <text class="section-title">5. 收费与争议处理</text>
      <text class="item-body">除平台明确公示的官方费用外，活动费用由组织者自行收取。平台不代收、不托管、不分账；组织者应依法处理收费与退款争议，并配合平台完成投诉处置。</text>

      <text class="section-title">6. 协议更新</text>
      <text class="item-body">平台可根据法律法规和业务治理需要更新本协议。更新后将公示版本；继续使用组织者能力即视为接受更新。</text>
    </view>
  </scroll-view>
</template>

<style>
.page { background: #ffffff; }
.content { padding: 48rpx 36rpx 100rpx; }
.title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  color: #1A3C5E;
  margin-bottom: 12rpx;
}
.date {
  display: block;
  font-size: 24rpx;
  color: #98A2B3;
  margin-bottom: 28rpx;
}
.intro {
  display: block;
  font-size: 26rpx;
  color: #667085;
  line-height: 1.8;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eeeeee;
}
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A3C5E;
  margin-top: 44rpx;
  margin-bottom: 18rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #1A3C5E;
}
.item-body {
  display: block;
  font-size: 26rpx;
  color: #475467;
  line-height: 1.9;
}
.bullet-group { margin-top: 8rpx; }
.bullet-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.bullet {
  font-size: 28rpx;
  color: #1A3C5E;
  margin-right: 12rpx;
  margin-top: 2rpx;
}
.bullet-text {
  flex: 1;
  font-size: 26rpx;
  color: #475467;
  line-height: 1.8;
}
</style>
