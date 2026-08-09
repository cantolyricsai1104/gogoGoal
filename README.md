# Focus Goal

以繁體中文為預設的 React Native／Expo V1 原型，協助使用者將目標轉成可修改、可選取並加入系統日曆的行動計畫。

## 已實作的 V1 流程

- 首頁：目標清單、空白狀態與 Python 範例目標。
- 目標建立／AI 對話：可修改目標、期限、程度與限制；目前以 mock AI 提供可展示的建議。
- 可用時段設定：每週時段可逐日啟用、停用與調整。
- 計畫預覽：顯示完成日期、里程碑、任務與時間不足警示；AI 摘要、里程碑與任務均可編輯。
- 任務選取與日曆匯出：支援逐項勾選、全選、首次權限請求、拒絕／失敗說明與部分成功結果。
- 設定：檢視日曆權限、開啟系統設定與本機保存說明。

目標、可用時段、計畫及勾選狀態會保存於裝置本機。V1 不讀取既有日曆行程，也不會未經同意自動重新排程。

## 啟動方式

```bash
npm install
npm start
```

之後可在 Expo 終端按 `i` 開啟 iOS 模擬器，或按 `a` 開啟 Android 模擬器。日曆權限與建立事件應以 iOS／Android 實機或模擬器驗證；網頁預覽會清楚顯示系統日曆不可用。

## 驗證

```bash
npm run typecheck
npx expo export --platform ios --output-dir /private/tmp/focus-goal-export
```

完整產品規格位於 `.scratch/focus-goal-v1/001-focus-goal-v1.md`。
