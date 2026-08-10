---
id: GOGO-V1-06
title: 加入 Safety Gate 與透明 AI Submit
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-05
---

## Outcome

完整 onboarding 只有在成人限制與安全 gate 通過後才會送給 Coach；使用者同時知道哪些必要資料會交由 Gemini 處理。

## Scope

- 加入胸痛、暈眩／失去知覺、已知心肺疾病、影響跑步的痛楚、醫生運動限制五項安全問題。
- 任一 safety flag 建立 safety-blocked draft。
- blocked 使用者可保存答案，但不可取得或 commit 加強型跑步處方。
- Submit 前顯示最小資料使用說明。
- 「交給 Coach 制定計畫」作為本次資料處理及 generation action。
- 建立 sanitised request mapper，只傳必要 coaching inputs。

## Acceptance criteria

- 五項均回答後才可提交。
- 任一 flag 為 true 時，不呼叫 plan generation，並建議先諮詢合資格專業人士。
- safety block 不刪除 onboarding draft。
- request 可包含目標、年齡區間、能力、近期活動、availability、頻率、每日時間及安全資料。
- request 不包含 email、account ID、相片、push token 或其他無關帳戶資料。
- Gemini API key 只由 server-side environment 讀取。
- 重複點擊 submit 不會產生多個互相競爭的 draft plan request。

## Tests

- 五個 safety flag 各有獨立 blocked fixture。
- 測試 blocked flow 不呼叫 Gemini port。
- 測試 request allowlist，並明確斷言敏感／無關欄位不存在。
- 測試 valid submission 只產生一次 generation command。

## Not included

- 醫療判斷、復康建議或 emergency triage。
- 真實 Gemini plan 內容；下一 ticket 才擴充 output。
