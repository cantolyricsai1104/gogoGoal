---
id: GOGO-V1-08
title: 由 Gemini 產生完整八週 beginner sessions
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-07
---

## Outcome

使用者得到完整八週、每節都可以直接照做的初學者計畫，不需要先理解 Run/Walk、Easy Run 或 Long Easy Run 等術語。

## Scope

- 擴充 Gemini schema、prompt、fallback generator 與 validator，生成 Week 1–8 sessions。
- 受控內部分類至少包括 Run/Walk、Easy Run、Long Easy Run、Rest。
- 每節包含繁中名稱、總分鐘、warm-up、主要步驟、repeat、cool-down、RPE、talk test、focus、easier fallback、coaching reason。
- validator 檢查八週完整性、week numbering、正數分鐘、session type、instructions、時間上限及 frequency。
- Review 預設展開 Week 1；Week 2–8 可以查看。
- 正式 commit 前全部 week 顯示 Draft；未來內容標示為 roadmap，不能宣稱自動 adaptive 已存在。
- fallback 同樣必須提供可執行的八週 session，而不是只有概要。

## Acceptance criteria

- 回傳正好八週且 week number 連續。
- 每個 training session 都有足以讓 beginner 執行的繁中分步內容。
- RPE 配有 talk-test 說明，避免只顯示抽象數字。
- 每課有清楚的較輕鬆版本；安全文案不鼓勵帶痛硬撐。
- session 位於 available day，且不超過該日時間限制。
- 計畫不提供個人化 pace、heart-rate zone 或高強度 interval prescription。
- Week 1 預設展開，其他週可以由使用者主動查看。
- fallback 的完整性接受同一套 validator 檢查。

## Tests

- AI contract fixture 要求所有 session 必填欄位。
- validator 拒絕缺週、錯誤週號、負分鐘、schema 外 type、空 instructions、超時長及錯誤 weekday。
- projection test 驗證 Week 1 detail 與 Week 2–8 planned-preview data。
- 一個完全新手 fixture 驗證 progression 保守且有恢復間距。

## Not included

- GPS、速度目標、interval training、wearable integration。
- 依照完成率或疲勞自動修改未來週。
