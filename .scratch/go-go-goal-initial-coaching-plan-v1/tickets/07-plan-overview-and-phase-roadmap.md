---
id: GOGO-V1-07
title: 由 Gemini 產生 Plan Overview 與 Phase Roadmap
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-06
---

## Outcome

使用者提交 onboarding 後，能先理解 Coach 打算如何帶領自己，包括目標可行性、每週次數、建議日、安排理由及八週階段方向。

## Scope

- 擴充 server-side Gemini structured-output contract。
- 產生 goal summary、feasibility、safe milestone、coaching summary、reasoning summary、training days、weekly time 及 phases。
- Phase 包含週數範圍、繁中名稱、目的及 progression summary。
- validator 檢查八週 phase coverage、無重疊、無空白週。
- validator 檢查建議日、頻率上限、每日時間限制及 beginner recovery spacing。
- Plan Review 顯示 Overview、Coach Strategy／Reasoning 與 Phase Roadmap。
- Gemini timeout、非 2xx、空或 invalid output 時建立透明標示的 deterministic fallback overview。

## Acceptance criteria

- Review 顯示主要目標、八週週期、每週次數、建議日、估計投入時間與安排原因。
- 過度進取目標不會被承諾為八週必達；Review 顯示限制及安全階段目標。
- 半馬／全馬可被表達為第一個八週 training block，而不是完整備賽保證。
- Phase Roadmap 完整覆蓋 Week 1–8，週數不重疊。
- Gemini 不可把全部 available days 自動填滿，也不可超過 realistic frequency。
- beginner 無合理原因時不可安排不必要的連續跑步日。
- fallback 明確標示為基本規則計畫，不冒充 AI 個人化結果。

## Tests

- 擴充 Gemini backend contract fixtures 與 sanitisation tests。
- validator fixture 拒絕錯誤 phase coverage、不可用日期、超時長及超 frequency。
- fixture 覆蓋 beginner aggressive race goal 的 safe milestone。
- projection test 驗證 Review 所需資料，不依賴畫面元件樹。
- fixture 覆蓋 timeout、non-2xx、empty 及 schema-invalid fallback。

## Not included

- 每一節 session 的完整分步內容。
- Weekly adaptive recalculation。
