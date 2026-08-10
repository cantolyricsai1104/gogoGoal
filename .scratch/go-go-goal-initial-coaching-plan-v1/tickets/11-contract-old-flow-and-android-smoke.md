---
id: GOGO-V1-11
title: 收斂舊流程並完成 Android 端到端驗證
labels:
  - ready-for-agent
blocked_by:
  - GOGO-V1-09
  - GOGO-V1-10
---

## Outcome

新的五步 onboarding 與 Initial Coaching Plan 成為 Running 正式入口；舊簡易計畫路徑被安全收斂，Android simulator 可完成整條真實 V1 使用路徑。

## Scope

- 完成 expand–contract：移除或停用被新 flow 取代的簡易 assessment／summary path。
- 清理不再需要的 compatibility adapter，但保留 commitment/check-in domain 規則。
- 核對所有 V1 使用者可見文字，移除任何尚未實作的 adaptive promise。
- 補齊 loading、retry、validation、fallback 及 navigation 邊界。
- 執行完整 unit、contract、integration 與 regression tests。
- 在 Android simulator 驗證一條 smoke path。
- 更新本地開發／測試說明，註明 Gemini backend、fallback 與 Expo Go／development build 限制。

## Acceptance criteria

- Keep Fit > Running 不再進入舊的少量輸入／單一分鐘計畫頁。
- 使用者可完成：五步 onboarding → Gemini 或 fallback 八週 plan → Review → optional adjustment → Commit → Workspace active goal。
- App 重開後 draft、review 或 committed goal 能恢復到合理位置。
- Gemini failure 不造成白畫面或永遠 loading。
- UI 不聲稱會根據每次跑步、RPE、疲勞或痛楚自動調整。
- 所有 deterministic tests 通過。
- Android simulator smoke path 以可存取文字／狀態驗證，不依賴固定座標。
- 舊 commitment、雙相片、通知與歸檔能力沒有 regression。

## Tests

- 跑完整 repository test suite 與 Expo／TypeScript checks。
- 執行唯一 Android smoke path並記錄測試步驟及結果。
- 驗證 real Gemini development path；若沒有可用 key，以 stub／fallback 驗證，不把 secret 寫入紀錄。
- 手動核對 accessibility labels、繁體中文 instructions、Draft／Committed／Planned 標示。

## Not included

- V2 Adaptive Coaching Loop。
- production authentication、cloud sync、backend scheduler 或付費方案。
