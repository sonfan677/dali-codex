# 搭里小程序 AI 复刻开发交接文档

> 目标：让另一个 AI 或新工程团队基于本仓库，快速理解并复刻出**同等功能、同等业务规则、同等交互逻辑**的小程序。
> 适用范围：`/dali-ng-main/daling-mvp`
> 当前技术栈：`uni-app + Vue + Pinia + 微信云开发`

## 1. 产品一句话

搭里是一个面向大理本地/旅居/游客的活动发现与发起小程序，核心是：

- 用户发现活动
- 用户发起活动
- 用户报名/取消/留言/举报
- 平台做身份核验、风控、治理、推荐和运营管理
- 平台不做支付托管，不做交易履约

这不是“团购/支付/订单平台”，而是“活动信息组织与风控治理平台”。

## 2. 复刻时必须先记住的硬边界

### 2.1 合规边界

- 平台只做信息展示、报名工具、风险提示、身份核验、后台治理
- 平台不代收款、不托管退款、不承担线下履约
- 费用信息允许展示为活动说明的一部分，但不能做小程序内支付闭环
- 身份证号、手机号、真实姓名属于敏感信息，当前代码要求**加密存储**

### 2.2 城市与范围边界

- 当前生产逻辑以 `dali` 城市为主
- 活动发布限制在**大理白族自治州范围**
- 发现页用户可在任意位置查看活动
- 已授权定位时，默认按**从近到远**排序展示真实活动
- 未授权定位时，不做距离精排，展示全量真实活动

### 2.3 时间边界

- 时间判断以云函数/服务器时间为主
- 发现页“今天 / 明天 / 即将开始 / 最新发布”等逻辑，不能依赖前端长驻缓存
- 成团、自动过期、自动归档等任务，依赖云函数执行

## 3. 项目结构总览

## 3.1 前端页面

- `pages/index/index.vue`
  发现页。负责：
  - 活动列表
  - 搜索
  - 四个下拉筛选：场景 / 距离 / 日期 / 状态
  - 社交偏好筛选（I / E）
  - 定位授权引导
  - 数据来源角标
  - 官方活动日历入口
  - 下拉刷新

- `pages/detail/index.vue`
  活动详情页。负责：
  - 活动详情展示
  - 报名 / 取消报名
  - 留言评论 / 发布者回复
  - 分享
  - 举报
  - 发布者参与者列表与导出
  - 出勤标记
  - 管理员视图（处理痕迹、后台标签、操作链路）

- `pages/publish/index.vue`
  发布页。当前是**单页三模式**：
  - 快速发布模板
  - 常发布活动（快速复用）
  - 自定义发布（结构化）

- `pages/mine/index.vue`
  我的页面。负责：
  - 用户资料展示与编辑
  - 发布/参与列表
  - 风控分、到场率、爽约数展示
  - 管理后台入口

- `pages/verify/index.vue`
  身份核验页。负责：
  - 提交真实姓名 + 身份证号
  - 本地身份证规则初筛
  - 待审核 / 已通过 / 需补充核验状态展示

- `pages/admin/index.vue`
  管理后台。负责：
  - 待办中心
  - 身份核验待审
  - 举报记录
  - 活动管理
  - 操作记录
  - 治理开关
  - 用户分群规则
  - 日历节庆主题维护
  - 巡检与报表

- `pages/calendar/index.vue`
  官方活动日历页。负责：
  - 固定集市
  - 节庆主题
  - 月历视图
  - 发起同行 / 参与已有同行

### 3.2 状态层

- `stores/user.js`
  用户会话中心。负责同步：
  - `openid`
  - 核验状态
  - 手机绑定状态
  - 社交偏好
  - 居住身份
  - 身份标签
  - 风控分
  - 组织者协议同意状态
  - 发布治理配置

- `stores/location.js`
  定位状态中心。负责：
  - 隐私授权判断
  - `getFuzzyLocation`
  - 交互式定位授权
  - 缓存定位结果
  - 返回定位错误码供 UI 决策

### 3.3 公共配置

- `utils/activityMeta.js`
  这是整个项目最关键的“业务字典”文件之一，里面集中定义：
  - 活动类型（scene）
  - 二级活动场景/子类型（type）
  - 发布模板
  - 发现页筛选项
  - 用户标签枚举
  - I/E 社交偏好推断
  - 旧分类向新结构迁移的映射

- `utils/cloud.js`
  云函数统一调用封装

## 4. 启动与全局数据流

`App.vue` 在小程序启动时做两件事：

1. `wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: true })`
2. 调用 `login` 云函数做静默登录

登录成功后会把用户快照写入：

- `getApp().globalData`
- `Pinia userStore`（后续页面多通过 store 同步）

这里的原则是：

- 启动时**不主动拉定位**
- 定位必须由用户可感知操作触发
- 登录态尽量用 `userStore.syncSession()` 保持新鲜

## 5. 核心数据库集合

以下集合是当前代码已真实使用的：

### 5.1 `users`

用途：

- 用户档案
- 身份核验
- 手机绑定
- 用户分群
- 风控分
- 组织者等级
- 订阅状态

关键字段：

- `_openid`
- `nickname`
- `avatarUrl`
- `cityId`
- `isVerified`
- `verifyStatus`
- `verifyProvider`
- `phoneVerified`
- `mobileBindStatus`
- `mobileBoundAt`
- `socialPreference`
- `residencyType`
- `identityTags`
- `userRiskScore`
- `identityCheckRequired`
- `identityCheckStatus`
- `identityCheckReasons`
- `realName`（加密）
- `idCard`（加密）
- `phone`（加密）
- `publishCount`
- `joinCount`
- `attendCount`
- `noShowCount`
- `reportAgainstCount`
- `recentPublish7dCount`
- `organizerTier`
- `organizerConsents`
- `subscriptions`

### 5.2 `activities`

用途：

- 活动主表
- 发现页数据源
- 详情页数据源
- 日历活动源
- 治理与风控分析对象

关键字段按模块可分为：

基础信息：

- `title`
- `description`
- `publisherId`
- `publisherNickname`
- `publisherAvatar`
- `cityId`
- `location`
- `startTime`
- `endTime`

分类结构：

- `sceneId`
- `sceneName`
- `typeId`
- `typeName`
- `categoryId`
- `categoryLabel`
- `customTypeName`

展示与推荐：

- `isRecommended`
- `isOfficial`
- `visibleTags`
- `socialEnergy`

收费与联系：

- `chargeType`
- `pricing`
- `payeeSubject`
- `refundPolicy`
- `cancellationPolicy`
- `contactPhone`
- `contactWechat`
- `contactQrcodeFileId`

参与规则：

- `maxParticipants`
- `allowWaitlist`
- `requireApproval`

成团机制：

- `isGroupFormation`
- `minParticipants`
- `formationWindowMinutes`
- `formationStatus`
- `formationDeadline`
- `windowExtensionCount`

审核与治理：

- `status`
- `publishReviewRequired`
- `publishReviewStatus`
- `publishRiskLevel`
- `publishRiskReasonCodes`
- `publishForceManualReview`

后台自动打标：

- `opsTagProfile`
- `riskScore`
- `riskLevel`
- `riskReasonCodes`

节庆主题：

- `festivalThemeTagsAuto`
- `festivalThemeTagsManual`
- `festivalThemeTags`
- `festivalThemeSource`

### 5.3 `participations`

用途：

- 报名关系
- 待审核报名
- 候补
- 出勤状态

关键字段：

- `activityId`
- `userId`
- `_openid`
- `status`
- `joinedAt`
- `appliedAt`
- `cancelledAt`
- `attendanceStatus`
- `attendanceMarkedAt`

### 5.4 `adminActions`

这是后台最重要的“操作流水 + 待办 + 审计”集合。

用途：

- 举报记录
- 身份核验待办
- 自动通过日志
- 巡检日志
- 治理开关更新记录
- 节庆主题维护动作
- AI / human 来源标识

关键字段：

- `actionId`
- `action`
- `actionType`
- `actionSource`
- `targetId`
- `targetType`
- `adminOpenid`
- `adminRole`
- `cityId`
- `reason`
- `result`
- `reportStatus`
- `manualOverride`
- `canAutoExecute`
- `dryRun`
- `agentTraceId`
- `beforeState`
- `afterState`
- `createdAt`

### 5.5 其它集合

- `activityComments`
  活动留言与回复

- `opsConfigs`
  运营配置中心，当前真实用于：
  - `publish_governance`
  - `user_segment_rule`

- `festivalThemes`
  节庆主题配置

- `officialCalendarEvents`
  官方日历的额外事件

- `cityConfigs` / `cityConfig`
  城市级配置（大理默认配置）

- `categoryCustomStats`
  “其它场景/其它类型”的自定义统计

- `supplyMetrics`
  巡检/供给分析相关数据

## 6. 云函数清单与职责分组

### 6.1 登录与用户

- `login`
  - 静默登录
  - 初始化用户保底字段
  - 自动补齐用户统计保留字段
  - 自动审批超时未审核身份核验
  - 回传发布治理配置和订阅状态

- `bindPhoneNumber`
  - 调微信手机号能力
  - 加密存储手机号
  - 更新 `phoneVerified`

- `submitVerify`
  - 校验姓名 + 身份证号
  - AES-GCM 加密存储
  - 写入身份核验待办

### 6.2 活动发现与详情

- `getActivityList`
  - 发现页活动列表
  - 搜索、场景、距离、日期、状态等筛选
  - 定位模式与默认中心点逻辑
  - mock/真实数据模式切换

- `getActivityDetail`
  - 返回活动详情
  - 返回当前用户报名状态
  - 返回参与者列表
  - 返回管理员处理痕迹

- `getActivityComments`
  - 拉取活动评论

- `addActivityComment`
  - 参与者可评论
  - 发布者可回复

### 6.3 发布与编辑

- `publishActivity`
  - 核验发布权限
  - 校验活动字段
  - 自动挂载场景/类型/标签
  - 自动打后台标签
  - 自动应用节庆主题
  - 根据治理规则决定是否进入待审核

- `updateActivity`
  - 发布者编辑活动
  - 保持与发布时同一套字段规范

### 6.4 报名与取消

- `joinActivity`
  - 报名
  - 控制人数
  - 处理是否需要审核
  - 写参与记录
  - 触发通知

- `quitActivity`
  - 用户取消报名

- `cancelActivity`
  - 发布者取消活动

- `extendFormationWindow`
  - 延长成团窗口

- `markAttendance`
  - 发布者/管理员标记到场或爽约

### 6.5 管理后台

- `checkAdmin`
  - 判断是否管理员

- `getAdminDashboard`
  - 后台主聚合入口
  - 汇总待办、举报、认证、活动、日志、分群、巡检、后台标签、报表

- `adminAction`
  - 后台治理动作执行器
  - 处理举报、冻结活动、恢复活动、更新治理开关、更新分群规则等

### 6.6 日历与节庆

- `getOfficialCalendar`
  - 构建官方活动日历
  - 合并官方主办 / 官方推荐 / 官方预告 / 固定集市 / 节庆主题

- `manageFestivalThemes`
  - 管理后台维护节庆主题

### 6.7 自动任务与运营

- `autoUpdateStatus`
  - 活动自动过期
  - 成团结果处理
  - 自动恢复 / 回滚治理状态
  - 日级统计

- `runOpsPatrol`
  - 运营巡检

- `seedOpsPatrolTestData`
  - 为巡检制造测试数据

- `updateSubscriptionState`
  - 更新订阅状态

- `sendNotification`
  - 模板消息发送

## 7. 当前最关键的业务规则

## 7.1 发现页规则

- 新用户首次进入允许看到示例活动
- 定位授权后优先展示真实活动
- 已授权定位：默认“从近到远”
- 未授权定位：展示全量真实活动
- 搜索与筛选互斥
- 场景 / 距离 / 日期 / 状态 四个下拉互斥，一次只保留一个值
- 结果为空时显示空状态，不再回退 mock 数据

## 7.2 发布规则

- 发布前必须：
  - 登录
  - 完善头像/昵称/用户画像
  - 绑定手机号
  - 身份核验通过（或满足当前治理策略）
  - 同意发布规则与组织者协议

- 发布结构必须包含：
  - 活动类型（scene）
  - 活动场景（type）
  - 地点
  - 时间
  - 收费方式
  - 联系方式至少一项
  - 风险布尔项

- 发布页当前是三模式：
  - 快速模板：选类型 -> 选细分模板 -> 自动套用表单
  - 常发布复用：用历史模板快速复用
  - 自定义发布：完整结构化填写

## 7.3 身份核验规则

- 用户提交 `真实姓名 + 身份证号`
- 前端先做中国身份证基本校验
- 云端再次校验并加密
- 默认 10 分钟内若未人工审核，系统自动通过
- 管理员后续可人工覆盖最终结果

## 7.4 手机绑定规则

- 通过微信手机号能力绑定
- 云端加密存储手机号
- 安卓/iOS 的系统授权表现可能不同，但云端状态必须一致

## 7.5 后台治理规则

- 举报进入 `adminActions`
- 后台可以：
  - 冻结活动
  - 处理举报
  - 降级组织者
  - 更新治理开关
  - 更新分群规则
  - 查看全链路操作记录

- 支持 `human / ai / system` 三类动作来源预留

## 7.6 节庆主题与日历规则

- `festival_theme` 不作为普通用户可选发布类型
- 节庆主题主要通过：
  - 系统自动挂载
  - 管理员后台手工维护

- 日历页要同时支持：
  - 固定集市
  - 节庆主题
  - 官方主办
  - 官方推荐
  - 官方预告

## 8. 活动分类体系的真实实现方式

代码里不是简单“一个分类字段”，而是 4 层逻辑：

1. 前台活动类型（scene）
2. 二级活动场景（type）
3. 用户可见标签（visibleTags）
4. 后台自动标签（opsTagProfile）

### 8.1 前台活动类型

当前定义于 `utils/activityMeta.js`：

- 在地探索
- 轻松聚会
- 交友社交
- 学习分享
- 体验工作坊
- 音乐演出
- 市集摆摊
- 户外活动
- 亲子宠物
- 公益社区
- 旅居同城
- 其它
- 节庆主题（系统保留）

其中：

- `festival_theme` 在发布 UI 中隐藏，由系统/后台处理
- `other_scene` 是兜底自定义类型

### 8.2 二级活动场景

每个类型下有一组精细化 `type`，例如：

- 在地探索
  - 洱海沿线同游
  - 咖啡馆串联
  - 城市 walk

- 轻松聚会
  - 饭搭子局
  - 桌游局
  - 小酒馆聚会

这套字典已经写进 `utils/activityMeta.js` 与 `publishActivity/index.js`。

### 8.3 用户可见标签

用于活动详情展示，帮助用户理解活动：

- 适合谁
- 氛围
- 形式
- 场景特征

### 8.4 后台自动标签

写入 `opsTagProfile`，用于：

- 推荐分发
- 风控
- 运营分析
- 商业潜力判断

当前实现分两层：

1. 结构化字段打标
2. 关键词增强打标

并支持布尔型风险触发器：

- 是否户外
- 是否酒精
- 是否儿童
- 是否宠物
- 是否审核制

## 9. 环境变量清单

这些变量是复刻时必须重点保留的：

### 9.1 管理员相关

- `ADMIN_OPENIDS`
- `ADMIN_ROLE_MAP`
- `ADMIN_CITY_SCOPE`

### 9.2 敏感数据加密

- `SENSITIVE_DATA_KEY`

兼容兜底：

- `ADMIN_TOKEN`

### 9.3 通知模板

- `TMPL_START`
- `TMPL_CANCEL`
- `TMPL_FORMING`

### 9.4 发布治理

- `ACTIVITY_PUBLISH_RULES_VERSION`
- `ORGANIZER_SERVICE_AGREEMENT_VERSION`
- `USER_PUBLISH_MAX_PARTICIPANTS`
- `PUBLISH_COMPLAINT_DOWNGRADE_THRESHOLD`
- `PUBLISH_COMPLAINT_RESTRICT_ALL_THRESHOLD`
- `VERIFY_AUTO_APPROVE_MINUTES`
- `SCHEME2_HIGH_FREQ_PUBLISH_7D`

### 9.5 巡检

- `OPS_PATROL_RUN_TOKEN`
- `OPS_PATROL_REPORT_PENDING_SLA_HOURS`
- `OPS_PATROL_VERIFY_PENDING_SLA_HOURS`
- `OPS_PATROL_SUPPLY_ALERT_LEVEL`
- `OPS_PATROL_ENABLE_ALERT`
- `OPS_PATROL_ALERT_COOLDOWN_MINUTES`

### 9.6 测试造数

- `OPS_PATROL_SEED_TOKEN`
- `OPS_PATROL_SEED_ENABLED`
- `OPS_PATROL_SEED_ALLOWED_ENVS`
- `OPS_PATROL_SEED_REQUIRE_DUAL_AUTH`

### 9.7 日历/节庆

- `OFFICIAL_PUBLISHER_OPENIDS`
- `OFFICIAL_RECURRING_RULE_COLLECTION`
- `OFFICIAL_RECURRING_EXCEPTION_COLLECTION`
- `FESTIVAL_THEME_COLLECTION`

## 10. 已知难点与踩坑点

### 10.1 微信开发工具双项目问题

必须优先使用**根目录项目**进行调试和部署：

- 根目录项目负责云函数
- `dist` 项目只适合看页面，不适合部署云函数

### 10.2 iOS 与 Android 行为不完全一致

必须重点关注：

- 手机号绑定交互
- 剪贴板授权
- 定位授权与系统设置入口
- 页面安全区和底部空白

### 10.3 隐私协议与前端代码不是一回事

- 微信公众平台“用户隐私保护指引”的展示内容，不等于小程序内 `隐私政策` 页面文案
- 两者都要维护

### 10.4 管理配置有兼容模式

有些后台配置如果 `opsConfigs` 集合不存在，会退回 `adminActions` 兼容模式读取，因此：

- 生产建议创建 `opsConfigs`
- 复刻时不要误删兼容逻辑

## 11. 推荐的复刻顺序

如果另一个 AI 要从零复刻，建议按下面顺序：

1. 先搭基础壳子
   - `App.vue`
   - `pages.json`
   - `tabBar`
   - `userStore`
   - `locationStore`

2. 再做活动主链路
   - 发现页
   - 详情页
   - 发布页
   - 登录
   - 获取活动列表
   - 获取活动详情
   - 发布活动
   - 报名 / 取消报名

3. 再做身份与风控
   - 身份核验
   - 手机绑定
   - 组织者协议
   - 发布治理配置

4. 再做后台治理
   - 管理后台首页
   - 举报处理
   - 身份待审
   - 活动冻结
   - 审计日志

5. 最后补运营模块
   - 官方活动日历
   - 节庆主题
   - 巡检
   - 报表
   - 自动打标分析

## 12. 给其它 AI 的建议提示词

如果要把这份文档喂给另一个 AI，建议明确告诉它：

- 不要重写产品逻辑，只能在现有业务规则上扩展
- 活动分类使用 `scene + type + visibleTags + opsTagProfile` 四层结构
- 身份证号与手机号必须加密存储
- 管理后台动作必须落 `adminActions`
- 节庆主题不能当作普通用户自由可选分类
- 发布活动必须遵守“登录 -> 资料完善 -> 手机绑定 -> 身份核验 -> 协议同意”的前置链路
- 发现页的定位逻辑和空数据逻辑不要擅自改

可直接给 AI 的一句话提示模板：

`请严格按《AI_REBUILD_HANDOFF.md》复刻搭里小程序，不要简化业务规则，不要删除风控/治理/节庆/后台标签逻辑，先理解数据结构与云函数职责，再开始编码。`

## 13. 本仓库内可一起参考的文档

- `README.md`
- `docs/PRODUCT_BASELINE_SUMMARY.md`
- `docs/LOCAL_TEST_CHECKLIST.md`
- `docs/ADMIN_LITE_AI_READY.md`
- `docs/OPS_PATROL_3_2_HANDOFF.md`
- `docs/ops_tag_import_and_test_guide.md`

## 14. 这份交接文档的作用

它不是产品 PRD，也不是简单 README。

它的定位是：

- 帮 AI 快速恢复业务上下文
- 帮开发者快速理解当前仓库的真实结构
- 帮后续复刻时减少“看漏规则 / 误删治理逻辑 / 误改数据库结构”的风险

如果后续继续迭代，建议每完成一个大模块，就同步更新这份文档，而不是只更新 README。
