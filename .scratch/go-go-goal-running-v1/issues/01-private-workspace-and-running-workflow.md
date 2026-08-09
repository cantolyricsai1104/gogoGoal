# 01 — 建立 Go Go Goal 私人 Workspace 與 Running 工作流骨架

**What to build:** 將現有通用目標原型轉成 Go Go Goal 的可登入私人 Workspace。使用者登入後可看見 Keep Fit，進入後可選 Running；其他運動方式只顯示「即將推出」。所有後續承諾操作由單一 RunningCommitmentWorkflow 協調，並以帳戶主時區及可替換的外部服務運作。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] App 名稱、首頁品牌及主要文案統一為「Go Go Goal」，預設使用繁體中文。
- [ ] 未登入使用者只能看見登入／註冊入口，不能建立或查看私人目標。
- [ ] 登入後建立或載入只屬於該帳戶的 Workspace，並保存帳戶主時區。
- [ ] 首頁顯示 Keep Fit；Keep Fit 內 Running 可選，其他運動方式標示「即將推出」且不能建立目標。
- [ ] Workspace 可呈現沒有目標的空白狀態，以及進行中、暫停和歸檔區域的基本結構。
- [ ] RunningCommitmentWorkflow 成為 UI 執行 Running 領域操作的單一高階入口。
- [ ] 帳戶、資料儲存、時鐘、時區、通知、媒體與 Gemini 能力透過可替換契約接入，而不是直接成為領域規則。
- [ ] 以使用者可觀察行為測試登入、登出、帳戶資料隔離、主時區載入及 Keep Fit／Running 導覽。
- [ ] App 重開後可還原登入狀態、主時區及 Workspace 基本資料；資料損毀或載入失敗時提供安全的復原提示。

