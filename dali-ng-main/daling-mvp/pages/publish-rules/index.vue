<template>
  <scroll-view scroll-y class="page">
    <view class="content">
      <text class="title">活动发布规则</text>
      <text class="date">版本号：publish_rules_v1 · 更新日期：2026年4月</text>
      <text class="intro">本规则用于明确活动发布边界与治理要求。你提交活动即表示已阅读并同意本规则。</text>

      <text class="section-title">1. 平台定位</text>
      <text class="item-body">平台提供活动信息发布、展示、报名登记与必要治理能力。除另有明确标注外，平台不是活动组织者、收费方、带队方或线下履约方。</text>

      <text class="section-title">2. 发布信息要求</text>
      <view class="bullet-group">
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">活动信息需真实、完整、可执行。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">收费活动必须披露收费方式、收款主体、退款规则、取消规则。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">需如实申报夜间、户外、饮酒、拼车、过夜、未成年人参与等风险要素。</text></view>
      </view>

      <text class="section-title">3. 风险分级与审核</text>
      <view class="bullet-group">
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">平台按活动类型、关键词、风险要素进行分级治理。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">高风险活动会触发更严格审核与限制措施。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">平台可基于投诉、违规、风险识别结果进行限流、下架、限权。</text></view>
      </view>

      <text class="section-title">4. 禁止发布内容</text>
      <view class="bullet-group">
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">违法违规、欺诈引流、虚假宣传或侵害他人权益内容。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">隐瞒收费主体、诱导站外转账、拒绝披露核心条件的活动。</text></view>
        <view class="bullet-item"><text class="bullet">·</text><text class="bullet-text">平台认定存在明显安全风险且不适合发布的活动。</text></view>
      </view>

      <text class="section-title">5. 违规处置</text>
      <text class="item-body">平台可视情节采取提醒、下架、驳回、限制发布、限制收费活动、冻结账号等措施，并保留必要证据以配合监管。</text>
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
