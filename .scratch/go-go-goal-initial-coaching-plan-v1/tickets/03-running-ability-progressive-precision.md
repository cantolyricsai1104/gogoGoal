---
id: GOGO-V1-03
title: 加入 Running Ability 漸進式準確度
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-02
---

## Outcome

使用者不必假裝記得精確跑步數據，也可以向 Coach 提供可信、帶 confidence 的能力訊號。

## Scope

- 加入成人 age range；未滿 18 歲不能建立 V1 Initial Coaching Plan。
- 收集最近四週跑步頻率。
- 只有最近四週曾跑步才詢問 `EXACT / APPROXIMATE / UNKNOWN`。
- Exact 收集 km、分鐘、RPE 0–10。
- Approximate 收集距離區間、時間區間與感覺區間。
- Unknown 不要求精確資料，改問可連續慢跑多久。
- 收集最高能力階梯、選填最長公里及過往固定跑步經驗。
- 所有資料加入 versioned submission mapping。

## Acceptance criteria

- 年齡選項只保存 18–24、25–34、35–44、45–54、55–64、65+，不保存出生日期。
- 未滿 18 歲顯示清楚限制，不可送出可承諾的計畫。
- 最近四週沒有跑步時，recent-run 精確資料欄不出現。
- Exact 三項均驗證合法範圍；Approximate 不轉換成假精確數字。
- Unknown 可以前進，而且 submission 明確標示未知。
- 最高能力階梯為單選，不產生互相矛盾答案。
- 過往固定跑步為 No 時，不保存維持時間或每週次數。

## Tests

- fixture 覆蓋 none 與所有 running-frequency 分支。
- fixture 覆蓋 Exact、Approximate、Unknown 的 request mapping。
- 測試 invalid km、minutes、RPE 及 conditional-field 清理。
- 測試未成年 gate 阻止 plan submission。

## Not included

- 醫療診斷或未成年人計畫。
- GPS、pace、heart-rate zone 或 wearable data。
