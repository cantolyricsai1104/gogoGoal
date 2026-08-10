---
id: GOGO-V1-05
title: 區分 Availability 與 Commitment
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-04
---

## Outcome

使用者提供真正可安排的日期、現實可維持的每週次數及每天時間窗口；系統不把「有空」直接當成「必須跑」。

## Scope

- 多選通常有時間跑步的星期。
- 另問即使工作很忙，現實可維持的每週跑步次數。
- 頻率選項為 2、3、4、5+ 或由 Coach 建議。
- 為每個 available day 保存時間區間。
- 提供「套用到所有已選日期」。
- 在 submission 中分開保存 availability、frequency preference 與 per-day limits。

## Acceptance criteria

- 未選任何 availability day 不可前進。
- 每日時間只接受 20–30、30–45、45–60、60–90、90+ 分鐘或不確定。
- 套用到全部後，使用者仍可單獨修改某一天。
- 取消某個 available day 會移除該日時間限制，避免 stale submission data。
- UI 明確說明可用日期不代表全部會被安排。
- 這一步不建立 `committed_training_days`。

## Tests

- 測試 weekday selection、per-day mapping 及 apply-all。
- 測試可維持頻率高於 available days 時的 validation。
- 測試移除日期會清理相應時間資料。
- integration fixture 證明 availability 與 commitment 是不同欄位。

## Not included

- Weekly calendar rescheduling。
- 根據 missed session 自動換日。
