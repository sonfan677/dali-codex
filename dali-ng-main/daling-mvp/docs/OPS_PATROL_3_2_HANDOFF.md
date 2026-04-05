# 运营自动巡检 3.2 交付说明

> 目标：不改用户主流程，只增强后台自动化巡检与风险提醒。  
> 相关云函数：`runOpsPatrol`、`seedOpsPatrolTestData`、`getAdminDashboard`。

## 一、能力概览

1. 新增“运营自动巡检”云函数：可手动触发，也可用于后续定时触发。
2. 巡检项覆盖：
   - 举报待处理超时
   - 认证待处理超时
   - 供给指标预警（读取 `supplyMetrics`）
3. 自动沉淀日志：
   - `ops_patrol_run`（每次巡检）
   - `ops_patrol_alert`（触发风险且不在冷却期）
4. 管理后台新增看板卡片：
   - 健康等级
   - 风险分
   - 触发项数量
   - 24h 巡检告警数
   - 一键“立即巡检”

## 二、环境变量（`runOpsPatrol`）

在云开发控制台 -> 云函数 -> `runOpsPatrol` -> 配置 -> 高级配置 -> 环境变量：

1. `OPS_PATROL_REPORT_PENDING_SLA_HOURS`
   - 含义：举报超过多少小时视为超时
   - 建议：`24`
2. `OPS_PATROL_VERIFY_PENDING_SLA_HOURS`
   - 含义：认证超过多少小时视为超时
   - 建议：`24`
3. `OPS_PATROL_SUPPLY_ALERT_LEVEL`
   - 含义：供给预警触发级别（`high`/`medium`）
   - 建议：`high`
4. `OPS_PATROL_ENABLE_ALERT`
   - 含义：是否生成巡检告警动作
   - 建议：`true`
5. `OPS_PATROL_ALERT_COOLDOWN_MINUTES`
   - 含义：相同风险签名告警冷却时间
   - 建议：`30`
6. `OPS_PATROL_RUN_TOKEN`（可选）
   - 含义：系统自动任务调用口令（非管理员调用时使用）
   - 建议：先不填，后续接定时器再配置

## 三、逐步点击验收（后台）

1. 部署云函数 `runOpsPatrol` 与 `getAdminDashboard` 最新代码。
2. 小程序真机进入管理后台 -> 待办中心。
3. 找到“运营自动巡检（3.2）”卡片，点击“立即巡检”。
4. 预期看到 toast：“巡检完成：正常/中风险/高风险”。
5. 卡片指标刷新：
   - 健康风险分
   - 触发项
   - 24h 巡检告警
   - 供给预警等级
6. 进入“操作记录”标签：
   - 能看到 `运营自动巡检执行`（`ops_patrol_run`）
   - 触发风险时能看到 `运营巡检风险告警`（`ops_patrol_alert`）

## 四、一键造测试数据（推荐）

先部署云函数：`seedOpsPatrolTestData`。  
先给 `seedOpsPatrolTestData` 配置环境变量（生产安全收口）：

1. `OPS_PATROL_SEED_ENABLED`
   - 建议：测试环境 `true`，生产环境 `false`
2. `OPS_PATROL_SEED_TOKEN`
   - 建议：设置为你自定义的一段长字符串
3. `OPS_PATROL_SEED_ALLOWED_ENVS`（可选）
   - 含义：允许造数的环境 ID，多个用英文逗号
4. `OPS_PATROL_SEED_REQUIRE_DUAL_AUTH`（可选）
   - 建议：生产环境 `true`（必须管理员身份 + runToken）

然后在云函数控制台测试 `seedOpsPatrolTestData`，使用以下 JSON：

1. 造“中风险”样本（仅超时认证，便于验证 medium）

```json
{
  "mode": "seed",
  "scenario": "medium",
  "cityId": "dali",
  "runToken": "这里填 OPS_PATROL_SEED_TOKEN"
}
```

2. 造“高风险”样本（超时举报 + 认证超时叠加，便于验证 high）

```json
{
  "mode": "seed",
  "scenario": "high",
  "cityId": "dali",
  "runToken": "这里填 OPS_PATROL_SEED_TOKEN"
}
```

3. 一键清理测试数据（强烈建议每次验收后执行）

```json
{
  "mode": "cleanup",
  "cleanupAll": true,
  "runToken": "这里填 OPS_PATROL_SEED_TOKEN"
}
```

> 造数成功后，回到真机管理后台点击“立即巡检”即可看到对应风险等级变化。

## 五、数据库核查（可选）

在集合 `adminActions` 中按 `action` 过滤：

1. `ops_patrol_run`：每次巡检都会写入一条。
2. `ops_patrol_alert`：有风险且不在冷却期才写入。

## 六、上线建议

1. 先手动巡检 1 次，确认数据正常。
2. 再配置定时任务（例如每 30 分钟）。
3. 若告警过多，可先调大：
   - `OPS_PATROL_ALERT_COOLDOWN_MINUTES`
4. 生产环境建议：
   - `OPS_PATROL_SEED_ENABLED=false`
   - `OPS_PATROL_SEED_REQUIRE_DUAL_AUTH=true`
   - `OPS_PATROL_SEED_ALLOWED_ENVS` 仅填写测试环境
