# 趋势报表测试数据导入指南（周/月 CSV）

适用目标：验证管理员后台“导出周/月趋势 CSV（运营看板口径）”。

## 1. 你会用到的文件

1. 活动测试数据（20 条，覆盖 2025-10 到 2026-03）  
`docs/activities_seed_trend_20.jsonl`
2. 管理动作+举报测试数据（20 条）  
`docs/adminActions_seed_trend_20.jsonl`

这两份文件都是 **JSON Lines** 格式（每行一条 JSON）。

## 2. 导入顺序（必须按顺序）

1. 先导入 `activities` 集合  
文件：`activities_seed_trend_20.jsonl`
2. 再导入 `adminActions` 集合  
文件：`adminActions_seed_trend_20.jsonl`

原因：`adminActions` 里有 `linkedActivityId`，需要先有活动数据。

## 3. 云开发控制台导入参数建议

1. 集合：选择对应集合（`activities` / `adminActions`）
2. 导入模式：`新增`
3. 文件格式：`JSON Lines`
4. 若看到“格式不正确”，先确认：
   - 文件扩展名为 `.jsonl`
   - 文件内容是“一行一个 JSON 对象”
   - 没有数组包裹（不是 `[...]`）

## 4. 导入后如何快速验证

1. 打开小程序管理员后台 -> 操作记录
2. 在导出区域点击：`导出周/月趋势 CSV`
3. 预期结果：
   - 周趋势有连续多周数据
   - 月趋势有连续多月数据
   - 指标中“新发布活动 / 新增举报 / 管理动作”不再全是 0

## 5. 数据口径说明（当前版本）

1. 新发布活动：`activityList.createdAt`
2. 新增举报：`report(action=report).createdAt`
3. 已处理举报：`report.reportStatus in [HANDLED, IGNORED] && handledAt`
4. 管理动作：`actionLogList.createdAt`
5. 高风险动作：`hide / ban / resolve_report_hide / reject_verify`
6. 举报处理动作：`resolve_report_hide / resolve_report_ignore`
7. 触达活动数：当期管理动作关联到的去重活动数
8. 活跃管理员数：当期有动作的去重 adminOpenid 数

## 6. 重复导入注意事项

本批数据带固定 `_id`（如 `trend_act_*`, `trend_report_*`, `trend_admin_*`）。
如果重复导入同一文件，可能报 `_id` 冲突；这属于正常现象。
