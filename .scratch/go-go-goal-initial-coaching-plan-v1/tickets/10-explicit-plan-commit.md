---
id: GOGO-V1-10
title: 把 Initial Plan 正式 Commit 成 Running Goal
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-08
---

## Outcome

「開始我的計畫」成為 Draft plan 轉成正式 Running Goal 的唯一入口；近期責任與遠期 roadmap 以不同狀態保存。

## Scope

- 在 commitment workflow 再次執行 deterministic validation。
- 建立 plan version identity、created／committed time 及 superseded reference 欄位。
- commit 後 Week 1 為 `COMMITTED`，Week 2–8 為 `PLANNED`。
- 依 Week 1 建立既有 daily records、通知及 goal-created event。
- 接回 Workspace，讓使用者看見 active Running Goal 與近期計畫。
- 保留每人最多一個 active／paused Running Goal 的規則。
- 保留不可直接刪除、完成／放棄／暫停原因及歸檔語意。
- 保留雙相片、15 分鐘、23:45、缺席及主時區規則。

## Acceptance criteria

- Review、revision 或返回 onboarding 都不建立 Running Goal。
- 只有成功按下「開始我的計畫」並通過最後驗證才建立 Goal。
- commit 是 idempotent；重複點擊不會建立重複 goal／record／event。
- Week 1 是唯一 Committed week；Week 2–8 全部為 Planned。
- 原始 Draft plan 與 committed version 有可追蹤關係。
- 已有 active／paused Running Goal 時，commit 被既有 domain rule 阻止。
- Workspace 顯示新 Goal，但 V1 不宣稱未來週會自動調整。
- 所有現有 commitment/check-in/archive regression tests 通過。

## Tests

- integration seam 從完整 submission 一直斷言到 Running Goal、Plan Version、Week statuses、records 及 events。
- 測試 commit 前後的外部狀態差異。
- 測試 double-submit idempotency 及 one-active-goal constraint。
- 執行既有雙相片、15 分鐘、23:45、缺席、暫停與歸檔 tests。

## Not included

- Weekly recommit 或 plan version 2 的自動產生。
- 重新設計相片及通知規則。
