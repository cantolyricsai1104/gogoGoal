---
id: GOGO-V1-04
title: 加入最近四週活動量
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-03
---

## Outcome

Coach 以三條低負擔問題理解使用者近期活動背景，不把 onboarding 變成完整 wellness 問卷。

## Scope

- 每週至少 20 分鐘運動／較活躍活動的天數，必填單選。
- 平均每週總運動時間區間，必填但容許不確定。
- 平常主要運動，多選及選填；支援 Other 補充。
- 把活動資料加入 autosave draft 與 AI submission。

## Acceptance criteria

- 活躍天數只接受 0、1、2、3、4、5+ 或不確定。
- 總時間只接受少於 30 分鐘、30–60 分鐘、1–2 小時、2–3 小時、3 小時以上或不確定。
- 主要運動支援步行、健身／重量訓練、球類、游泳、單車及其他。
- 第三題未回答仍可前進。
- 不要求逐日紀錄，也不新增睡眠、壓力、心情或肌肉酸痛問題。

## Tests

- 以 fixture 驗證所有單選 enum 可被穩定 mapping。
- 驗證 optional multi-select 與 Other 補充。
- 驗證返回、恢復及 submission 都保留資料。

## Not included

- 每日 wellness、心率變異、睡眠或壓力追蹤。
- 根據近期活動自動修改既有計畫。
