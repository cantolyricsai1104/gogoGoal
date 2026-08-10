---
id: GOGO-V1-01
title: 建立版本化 Initial Coaching Plan 主流程
labels:
  - ready-for-agent
blocked_by: []
---

## Outcome

建立一條最小但完整的 Initial Coaching Plan tracer seam，讓一份最小 onboarding submission 能經過 Gemini stub、確定性驗證、Plan Review projection，最後由使用者明確 commit。現有簡易 running assessment 在 expand 階段仍保持可用。

## Scope

- 定義 versioned `OnboardingSubmission` 與 Initial Plan request boundary。
- 建立可擴充的 `Plan → Phase → Week → Session` 領域模型及 version metadata。
- 定義 Draft、Committed、Planned，以及 session status vocabulary。
- 建立 server-side Gemini port／stub，避免 domain 依賴 Gemini SDK。
- 建立確定性 plan validator 的最小骨架。
- 建立 Plan Review projection，讓 UI 不直接依賴 raw AI JSON。
- 建立 explicit commit application service；preview 不得建立 active goal。
- 新舊 contract 必須能被 schema／request version 清楚區分。

## Acceptance criteria

- 一份有效最小 submission 可以得到一份含八週骨架的 Draft plan。
- AI stub response 未通過 validator 時，不會進入 review 或 commit。
- Plan Review 可讀取 overview、weeks 及狀態的最小 projection。
- 查看 Draft 不會建立 Running Goal、record 或 goal-created event。
- 明確 commit 後才建立 Running Goal，並保存 plan version、created time 與 committed time。
- 現有 Running assessment／commitment 流程與測試仍然通過。
- client 與 domain 不引用 Gemini API key 或 SDK credential。

## Tests

- 新增最高層 integration contract：`submission → AI stub → validation → review → commit`。
- 測試 invalid AI response 在 validator 邊界被拒絕。
- 測試 preview 前後 active goal 數量，證明 commit 是唯一寫入點。
- 保留並執行既有 `RunningCommitmentWorkflow` 測試。

## Not included

- 完整五步 onboarding UI。
- 真實 Gemini 完整 prompt。
- 完整 session instructions、revision、adaptive coaching。
