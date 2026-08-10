# Go Go Goal V1 — Initial Coaching Plan Tickets

本目錄把 [產品規格](../spec.md) 拆成 11 個可獨立驗收的垂直切片。Ticket 不是按 UI、backend、database 分層，而是讓每一步都產生可觀察、可測試的產品進度。

## 建議執行次序

| ID | Ticket | Blocked by | 完成後可展示的結果 |
|---|---|---|---|
| GOGO-V1-01 | 建立版本化 Initial Coaching Plan 主流程 | — | 最小 onboarding 可經 Gemini stub、驗證、review，再明確 commit |
| GOGO-V1-02 | 建立可返回及自動儲存的 Goal Onboarding | 01 | 使用者可完成、離開、恢復及修改 Goal 步驟 |
| GOGO-V1-03 | 加入 Running Ability 漸進式準確度 | 02 | Exact、Approximate、Unknown 都能形成可信 submission |
| GOGO-V1-04 | 加入最近四週活動量 | 03 | 三項低負擔活動問題能影響 coaching input |
| GOGO-V1-05 | 區分 Availability 與 Commitment | 04 | 使用者提供可跑窗口、現實頻率與每天時間限制 |
| GOGO-V1-06 | 加入 Safety Gate 與 AI 資料說明 | 05 | 安全輸入可阻止處方；合資格 submission 可送給 Coach |
| GOGO-V1-07 | 由 Gemini 產生 Overview 與 Phase Roadmap | 06 | Review 可解釋八週策略、可行性及各階段目的 |
| GOGO-V1-08 | 由 Gemini 產生完整八週 beginner sessions | 07 | 使用者可查看每一課的具體繁中執行方法 |
| GOGO-V1-09 | 支援受控 Plan Adjustment 與 Before → After | 08 | Draft 可安全修訂，確認前不會被替換 |
| GOGO-V1-10 | 把 Initial Plan 正式 Commit 成 Running Goal | 08 | Week 1 Committed、Week 2–8 Planned，並接回既有承諾系統 |
| GOGO-V1-11 | 收斂舊流程並完成 Android 端到端驗證 | 09、10 | 新流程成為正式入口，完整 simulator 路徑通過 |

## Dependency graph

```text
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08
                                      ├──→ 09 ──┐
                                      └──→ 10 ──┴──→ 11
```

`09` 與 `10` 在 `08` 完成後可以平行實作；`11` 必須等待兩者，才可移除舊入口及進行完整 contract 驗證。

## 共通完成標準

- 遵守 [spec.md](../spec.md) 的 Implementation Decisions、Testing Decisions 與 Out of Scope。
- 不把 Gemini API key、email、account ID 或相片加入 client bundle、fixture、log 或 AI request。
- 新增／修改的領域行為必須由 deterministic test 覆蓋；不得把真實 Gemini 網路呼叫放入測試。
- AI 輸出只有通過後端 validator 才能進入 review 或 commitment workflow。
- 使用者可見 coaching 文字以繁體中文為主，並符合「底層嚴格、表層溫暖」。
- 不破壞既有雙相片、15 分鐘間隔、23:45 截止、缺席、暫停及歸檔測試。
- V1 不宣稱或實作 Weekly Readiness、post-run feedback、自動 adaptive decision 或重新計算。

## 本地 ticket 檔案

- [GOGO-V1-01](01-initial-coaching-plan-tracer-seam.md)
- [GOGO-V1-02](02-goal-onboarding-wizard.md)
- [GOGO-V1-03](03-running-ability-progressive-precision.md)
- [GOGO-V1-04](04-recent-activity.md)
- [GOGO-V1-05](05-availability-and-realistic-frequency.md)
- [GOGO-V1-06](06-safety-gate-and-ai-submit.md)
- [GOGO-V1-07](07-plan-overview-and-phase-roadmap.md)
- [GOGO-V1-08](08-full-eight-week-beginner-plan.md)
- [GOGO-V1-09](09-controlled-plan-revision.md)
- [GOGO-V1-10](10-explicit-plan-commit.md)
- [GOGO-V1-11](11-contract-old-flow-and-android-smoke.md)
