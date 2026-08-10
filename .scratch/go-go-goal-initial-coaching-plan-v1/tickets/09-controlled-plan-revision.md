---
id: GOGO-V1-09
title: 支援受控 Plan Adjustment 與 Before → After
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-08
---

## Outcome

使用者可在承諾前參與計畫決定，但要求更難不會直接控制訓練負荷；任何 AI 修訂都必須先被驗證及展示差異。

## Scope

- Plan Review 提供：從更輕鬆開始、程度適合、增加一點挑戰、調整一天，以及選填原因。
- 把 feedback 轉成 versioned revision request，不直接 mutate current Draft。
- Gemini revision 經與 initial generation 相同的 validator。
- 建立 Before → After comparison projection。
- diff 至少涵蓋每週次數、總分鐘、training days 及變更 sessions。
- 使用者確認後才用 revised Draft 取代 current Draft；取消則保留原 plan。
- AI 不可用時保留原 plan，並允許稍後重試。

## Acceptance criteria

- 選擇「程度適合」不需要重新 generation。
- harder feedback 不保證增加負荷；validator／安全限制可維持或拒絕調高。
- revision 不可修改已 committed plan；本 ticket 只處理未承諾 Draft。
- Before → After 清楚列出實際差異，而不是只顯示「已更新」。
- 使用者確認前，重新開啟 Review 仍看到原 Draft。
- 確認後保存 revised Draft 與 revision metadata，但仍未建立 Running Goal。
- invalid revision 不會取代原 Draft。

## Tests

- fixture 覆蓋四種 feedback 與 optional reason。
- 測試 harder request 被安全限制否決或保守調整。
- diff tests 覆蓋 weekday、frequency、total minutes 及 session detail changes。
- 測試 confirm／cancel／invalid／timeout 都保留正確 Draft。

## Not included

- 已承諾計畫的 weekly adaptation。
- post-run feedback、readiness 或 coach decision states。
