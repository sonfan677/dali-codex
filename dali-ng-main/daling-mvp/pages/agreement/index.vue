<template>
  <scroll-view scroll-y class="page">
    <view class="content">

      <!-- 页头 -->
      <text class="title">搭里用户协议</text>
      <text class="date">最后更新：2026年3月</text>
      <text class="intro">请在使用搭里小程序前仔细阅读本协议。你注册、登录、浏览、发布、报名或继续使用搭里服务，即视为已阅读并同意本协议全部内容。</text>

      <!-- 一 -->
      <text class="section-title">一、服务说明</text>
      <text class="item-body">搭里是一款基于地理位置的线下活动发现与报名小程序，帮助用户发现并参与附近正在发生的活动，支持活动发布、报名参与、留言互动、举报反馈等功能。</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">平台主要提供活动信息展示、筛选、报名记录、信任提示和基础管理能力。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">平台不提供支付、担保交易、履约承诺、会员收费或充值服务。</text>
        </view>
      </view>

      <!-- 二 -->
      <text class="section-title">二、用户注册与认证</text>
      <view class="numbered-group">
        <view class="numbered-item">
          <text class="number">1.</text>
          <text class="numbered-text">用户需通过微信授权登录后方可使用本产品。</text>
        </view>
        <view class="numbered-item">
          <text class="number">2.</text>
          <text class="numbered-text">全量用户可在“我的”页完成手机号绑定（方案1），用于账号安全与风险防护。</text>
        </view>
        <view class="numbered-item">
          <text class="number">3.</text>
          <text class="numbered-text">发布活动前需完成实名认证；当账号触发风险策略（如被举报、高频组织）时，需补充身份核验（方案2）后方可继续发布。</text>
        </view>
        <view class="numbered-item">
          <text class="number">4.</text>
          <text class="numbered-text">用户须保证所填信息真实有效，不得冒用他人信息；如信息异常或存在风险，平台有权限制相关功能或终止服务。</text>
        </view>
      </view>

      <!-- 三 -->
      <text class="section-title">三、用户行为规范</text>
      <text class="item-body">用户在使用本产品时，不得发布以下内容：</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">涉及违法违规的活动信息</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">虚假、误导性活动内容</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">侵犯他人权益的内容</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">任何形式的付费、收费、充值、会员、订单或交易闭环信息</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">恶意刷报名、骚扰留言、冒充官方、诱导站外违规交易等行为</text>
        </view>
      </view>

      <!-- 四 -->
      <text class="section-title">四、活动发布与参与规则</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">发布者应确保活动信息真实、清晰、可执行，并对活动内容及现场组织自行负责。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">参与者报名后应合理安排时间，如无法参加，应及时取消报名，避免影响其他用户。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">发布者可在活动开始前编辑或取消活动；平台可基于举报、违规风险或运营需要对活动进行下架处理。</text>
        </view>
      </view>

      <!-- 五 -->
      <text class="section-title">五、举报与平台处理</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">用户可对涉嫌违规、失实或存在安全风险的活动发起举报。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">平台有权根据举报内容、审核结果和运营规则，对相关活动采取下架、限制展示、取消推荐等处理措施。</text>
        </view>
      </view>

      <!-- 六 -->
      <text class="section-title">六、免责声明</text>
      <text class="item-body">平台仅提供活动信息展示、报名记录和基础管理能力，不对活动本身的真实性、适法性、安全性、组织效果或线下履约结果作出保证。用户参与活动前应自行判断风险并谨慎决策。</text>

      <!-- 七 -->
      <text class="section-title">七、协议变更</text>
      <text class="item-body">本产品有权根据业务调整、法律法规要求或运营需要对本协议进行更新。更新后的协议将在小程序内公示，公示后继续使用服务即视为你同意更新内容。</text>

      <!-- 八 -->
      <text class="section-title">八、联系我们</text>
      <text class="item-body">如有问题，请通过小程序内的反馈功能联系我们，我们将在7个工作日内回复。</text>

    </view>
  </scroll-view>
</template>

<style>
.page {
  background: #ffffff;
}
.content {
  padding: 48rpx 36rpx 100rpx;
}

/* 页头 */
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
  color: #aaa;
  margin-bottom: 28rpx;
}
.intro {
  display: block;
  font-size: 26rpx;
  color: #888;
  line-height: 1.8;
  padding-bottom: 32rpx;
  border-bottom: 1rpx solid #eeeeee;
}

/* 章节标题 */
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #1A3C5E;
  margin-top: 52rpx;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #1A3C5E;
}

/* 正文段落 */
.item-body {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
}

/* 编号列表 */
.numbered-group {
  margin-top: 4rpx;
}
.numbered-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}
.number {
  font-size: 26rpx;
  color: #1A3C5E;
  font-weight: bold;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.numbered-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
  flex: 1;
}

/* 圆点列表 */
.bullet-group {
  margin-top: 16rpx;
}
.bullet-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}
.bullet {
  font-size: 28rpx;
  color: #1A3C5E;
  margin-right: 12rpx;
  margin-top: 2rpx;
  flex-shrink: 0;
}
.bullet-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
  flex: 1;
}
</style>
