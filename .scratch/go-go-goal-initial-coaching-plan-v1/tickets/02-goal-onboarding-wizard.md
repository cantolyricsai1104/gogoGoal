---
id: GOGO-V1-02
title: 建立可返回及自動儲存的 Goal Onboarding
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-01
---

## Outcome

使用者可在 Keep Fit > Running 開始五步 onboarding，完成第一步「你的目標」，離開後恢復草案，並返回修改答案。

## Scope

- 建立五步 wizard shell、進度顯示、Next／Back navigation。
- onboarding draft 自動儲存及恢復；尚未提交時不建立正式 Goal。
- Goal 步驟提供唯一 primary reason 與多個 secondary reasons。
- 原因包含減脂、健康、提升體能、減壓、建立紀律、比賽及其他。
- primary reason 控制結構化欄位：比賽距離／日期、減脂 kg／日期或其他目標補充。
- 支援選填 `desiredIdentityInThreeMonths` 與頁底 `currentSituation`。
- 防止 secondary reasons 重複 primary reason；Other 要求補充文字。

## Acceptance criteria

- 使用者只能選一個主要原因，並可選零至多個不同的次要原因。
- 切換主要原因時顯示正確的 conditional fields，無關欄位不會污染 submission。
- Race 必須有 5K、10K、半馬或全馬，以及目標／比賽日期。
- 非 Race 日期可選填；Fat Loss 數據只保存為 motivation context。
- Other 在未填補充時不可前進。
- 返回上一步不遺失資料；重開 App 後可恢復未送出的 draft。
- 第一頁不顯示能力、活動量或安全問卷內容。

## Tests

- 以資料表覆蓋每種 primary reason 與對應 conditional fields。
- 測試 primary／secondary 去重、Other validation、Race date requirement。
- 測試 draft persistence、resume 及 back-navigation 的外部結果。
- 測試 weight-loss kg 不成為 plan completion 或強度欄位。

## Not included

- Running Ability、Recent Activity、Availability、Safety 的完整內容。
- AI plan generation。
