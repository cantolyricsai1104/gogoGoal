# Go Go Goal

Go Go Goal 是以繁體中文為預設的 React Native／Expo App。V1 聚焦 **Keep Fit > Running**：使用者先建立安全、可修改的跑步計畫，明確承諾後，在每個跑步日以兩張相隔至少 15 分鐘的相片完成私人打卡。

## V1 已實作

- 本機帳戶登入與私人 Workspace adapter。
- Keep Fit 類別；Running 可使用，其他運動方式顯示「即將推出」。
- 跑步背景資料、健康安全篩查、保守計畫草案與明確承諾。
- 每位使用者同時只可有一個進行中的 Running 目標。
- 目標不能直接刪除；支援下週修改、暫停／恢復、完成與放棄歸檔，並保留原因時間軸。
- 同一曆日兩張相片打卡、至少 15 分鐘間隔、第一張最遲 23:45。
- 每張相片的 Gemini／本機 fallback 簡短鼓勵；AI 失敗不影響打卡。
- 依主時區安排 10:00 與 20:00 本機提醒；午夜後開啟 App 會結算缺席。
- 缺席補登、跳過或重新安排，而且保留原始缺席事件。
- Workspace 日曆、達標率與完整目標時間軸。
- 原始相片 90 天後自動清理；可長按刪除個別相片而保留文字紀錄。
- 帳戶刪除的 30 天撤銷期與期滿本機資料清理。

## 啟動方式

先複製並填寫本機環境設定：

```bash
nano .env.local
```

把 Gemini API key 填在 `GEMINI_API_KEY=` 後面。`.env.local` 已被 Git 忽略，不可把 key 放進 `EXPO_PUBLIC_` 變數。

開啟第一個終端機，啟動安全的 Gemini backend：

```bash
npm run ai:server
```

再開啟第二個終端機，啟動 Android 模擬器 App：

```bash
npm install
npm run android
```

相片權限及本機通知應使用 iOS／Android 實機或模擬器驗證。網頁版可瀏覽主要流程，但裝置通知會標示為不可用。

## Gemini 後端

App 不會保存 Gemini API 金鑰。若沒有設定後端，計畫與鼓勵會使用可預測的安全 fallback，整個 V1 流程仍可操作。

本機 Android 模擬器設定：

```bash
GEMINI_API_KEY=your-private-key
GEMINI_MODEL=gemini-3.5-flash
EXPO_PUBLIC_GO_GOAL_AI_URL=http://10.0.2.2:8787/go-go-goal
```

其中 `10.0.2.2` 是 Android Emulator 存取開發電腦的特殊位址；iOS Simulator 改用 `127.0.0.1`。修改 `.env.local` 後必須重新啟動 Metro。

後端接受兩種 JSON 請求：

- `kind: "running-plan"`：接收安全篩查後的 Running assessment，回傳可修改的標題、摘要、跑步日、時長、週期及達標率。
- `kind: "photo-encouragement"`：接收經使用者同意的 base64 相片及 MIME type，回傳 `{"text":"簡短鼓勵"}`。

正式後端必須自行保存 API 金鑰、驗證帳戶、限制速率、控制影像保留時間，並禁止模型推測身分、年齡、性別、體型、健康或情緒。Gemini 不能控制打卡、缺席或目標狀態。

目前附帶的 `server/ai-server.mjs` 只供本機 V1 開發：API key 只存在 Node 行程，App 只收到計畫 JSON 或簡短鼓勵。部署正式版本前仍需加入登入驗證與每帳戶速率限制。

## 驗證

```bash
npm test
npm run typecheck
npx expo export --platform ios --output-dir /private/tmp/go-go-goal-ios
```

核心規則由單一 `RunningCommitmentWorkflow` 執行。測試涵蓋安全警示、唯一進行中目標、15 分鐘雙相片限制、23:45 截止、午夜缺席、補救紀錄、下週修改及 30 天暫停上限。

## 原型與正式發布的邊界

目前帳戶及資料 adapter 儲存在裝置本機，適合 V1 原型驗證；正式上架前應替換成有身分驗證的後端資料庫與私有媒體儲存。App 關閉時的伺服器端午夜結算、跨裝置同步與遠端推播亦需要正式後端排程器。

完整產品規格位於 `.scratch/go-go-goal-running-v1/spec.md`，未納入 V1 的方向位於 `V2_features.md`。
