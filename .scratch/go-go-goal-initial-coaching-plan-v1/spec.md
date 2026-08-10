---
title: "Go Go Goal V1：Running Initial Coaching Plan"
labels:
  - ready-for-agent
status: ready-for-agent
---

## Problem Statement

目前 Go Go Goal 的 Running 起點只收集少量自由文字、可跑日子與單一時長，Gemini 亦只回傳標題、摘要、星期與分鐘。這不足以讓初學者相信自己得到的是一份有教練邏輯、可以直接照做的跑步計畫。

使用者未必知道自己的準確跑步數據，也可能把「有空」誤當成「應該全部安排」，或提出與目前能力及日期不相稱的目標。如果 onboarding 強迫使用者提供假精確資料，Gemini 會根據錯誤輸入產生看似專業但不可靠的結果；如果問卷太長，又會令使用者在承諾前退出。

使用者需要一個低負擔但足以支援 Serious Coaching 的結構化 onboarding：只收集真正會改變教練決定的資料，接受 Exact、Approximate 與 Unknown 三種可信度，清楚區分 Availability 與 Commitment，並由 Gemini 產生完整但保守、初學者看得懂的八週起始計畫。計畫必須先由使用者理解及確認，才成為正式承諾。

## Solution

將 Keep Fit > Running 的起點改為五步 onboarding，依序收集目標、目前跑步能力、最近四週活動量、現實時間安排與安全資料。第一步以一個主要原因、多個次要原因和動態具體目標開始；資料會自動保存，使用者可返回修改。

Onboarding 完成後，App 清楚告知哪些必要資料會傳送到 Gemini。Gemini 透過受控後端產生完整八週 Initial Coaching Plan，包括 Plan Overview、Phase Roadmap、教練安排理由及每週訓練。每節訓練必須提供初學者能直接執行的繁體中文分步指示，而不是只顯示 Run/Walk 或 Easy Run 等術語。

Gemini 的輸出必須通過後端確定性驗證。Availability 只代表可用時間窗口，Gemini 不得填滿所有可跑日；建議日必須符合使用者現實可維持的頻率、每日可投入時間、目前能力、近期活動與恢復需要。安全篩查、年齡限制、承諾狀態、版本歷史及 `Committed / Planned` 狀態不能由模型任意改寫。

Plan Review 先展示目標、策略、每週投入與選日理由，再展示 Phase Roadmap 和完整八週內容。正式承諾前整份計畫仍是 Draft；使用者按下「開始我的計畫」後，Week 1 才成為 `Committed`，Week 2–8 為 `Planned`，表示遠期內容是 roadmap 而非永久鎖死的處方。

本規格只完成 Initial Coaching Plan。跑後回報、Weekly Readiness、Coach Decision、重新計算與 Recommit 屬於 V2 Adaptive Coaching Loop。

## User Stories

1. 作為準備開始跑步的使用者，我想先回答自己為甚麼跑步，讓計畫從真正的動機出發。
2. 作為有多個動機的使用者，我想指定一個主要原因，讓 Coach 知道哪個結果優先。
3. 作為有多個動機的使用者，我想再選擇多個次要原因，讓計畫不會忽略其他重要期待。
4. 作為使用者，我想從減脂、健康、提升體能、減壓、建立紀律、比賽及其他中選擇原因，讓我不必先組織長篇文字。
5. 作為選擇「其他」的使用者，我想補充自己的原因，讓非預設目標仍可被理解。
6. 作為使用者，我想根據主要原因看到對應的具體目標欄位，讓問題與我的目的相關。
7. 作為以減脂為動機的使用者，我想記錄期望改變的 kg 與日期，讓 Coach 理解背景，但不把體重當成跑步完成的唯一標準。
8. 作為以比賽為目標的使用者，我想選擇 5K、10K、半馬或全馬，讓計畫理解目標距離。
9. 作為以比賽為目標的使用者，我想填寫比賽或目標日期，讓 Coach 能評估時間是否現實。
10. 作為沒有比賽的使用者，我想選填目標日期，讓我未確定日期時仍可開始八週起始計畫。
11. 作為提出過度進取目標的使用者，我想被誠實告知目前時間不足並收到較安全的階段目標，讓 Coach 不會為迎合我而製造不安全課表。
12. 作為使用者，我想選填三個月後希望成為怎樣的人，讓鼓勵文案可以支持我想建立的身份。
13. 作為使用者，我想在目標頁底部選填目前處境或障礙，讓 Coach 理解生活背景但不強迫我透露。
14. 作為使用者，我想完成第一步後再回答能力問題，讓第一頁不會像一份冗長健康問卷。
15. 作為使用者，我想 onboarding 自動保存，讓我離開或返回時不必重新填寫。
16. 作為使用者，我想返回前一步修改答案，讓錯誤輸入不會被永久帶進計畫。
17. 作為未滿 18 歲的使用者，我想被清楚告知 V1 暫不支援未成年人計畫，讓產品不會假裝處理未成年人的安全與同意責任。
18. 作為成年使用者，我想從 18–24、25–34、35–44、45–54、55–64、65+ 選擇年齡區間，讓我不用提供出生日期。
19. 作為使用者，我想說明最近四週是否跑步及大約頻率，讓 Coach 知道我是新手、偶爾跑者還是已有習慣。
20. 作為最近四週沒有跑步的使用者，我不想被要求填寫不存在的最近跑步數據，讓 onboarding 保持合理。
21. 作為最近四週曾跑步的使用者，我想選擇記得、只記得大概或不太記得，讓資料可信度被明確保存。
22. 作為記得最近跑步的使用者，我想填寫距離、時間及 RPE 0–10，讓 Coach 可以使用相對可靠的數據。
23. 作為只記得大概的使用者，我想以距離、時間及感覺區間回答，讓我不必製造假精確度。
24. 作為不記得最近跑步的使用者，我想直接跳過精確數據，讓不確定不會阻止我開始。
25. 作為不確定能力的使用者，我想選擇目前大約可以連續慢跑多久，讓 Coach 仍得到保守的起始訊號。
26. 作為使用者，我想只選擇一個最接近的最高能力階梯，讓答案不會彼此矛盾。
27. 作為使用者，我想選填目前最長大約能跑多少公里，讓距離資料在我知道時可以補充。
28. 作為曾固定跑步的使用者，我想說明最長維持的時間區間，讓 Coach 分辨完全新手與重新開始的人。
29. 作為曾固定跑步的使用者，我想選填當時每週跑步次數，讓過往經驗可以被保守參考。
30. 作為使用者，我想只回答最近四週平均活動量，而不是回想每天紀錄，讓問卷負擔保持低。
31. 作為使用者，我想回答平均每週有多少天進行至少 20 分鐘運動或較活躍活動，讓近期活動頻率有一致定義。
32. 作為不確定活動頻率的使用者，我想選擇「不確定」，讓我不必猜測。
33. 作為使用者，我想回答平均每週大約運動多久，讓 Coach 理解總活動量。
34. 作為使用者，我想用少於 30 分鐘、30–60 分鐘、1–2 小時、2–3 小時、3 小時以上或不確定回答，讓我不用計算精確分鐘。
35. 作為使用者，我想選填平常主要做的運動，而且可以多選，讓步行、重量訓練、球類、游泳、單車或其他活動可作背景訊號。
36. 作為使用者，我想選擇通常有時間跑步的星期，讓 Coach 知道 Availability。
37. 作為使用者，我想 Availability 不會自動變成全部跑步日，讓有空不等於必須把每一天填滿。
38. 作為使用者，我想回答即使工作很忙，每週現實地能穩定跑幾次，讓 Commitment 不建立在理想化答案上。
39. 作為不確定頻率的使用者，我想讓 Coach 建議每週次數，讓我仍可前進。
40. 作為每個可跑日時間不同的使用者，我想為每一天選擇可投入時間區間，讓較長訓練可以安排在真正有空的日子。
41. 作為大部分日子時間相同的使用者，我想一次把同一時間套用到所有可跑日，讓設定不會繁瑣。
42. 作為使用者，我想從 20–30、30–45、45–60、60–90、90 分鐘以上或不確定選擇每日可用時間，讓 Coach 得到可驗證的限制。
43. 作為初學者，我想訓練日之間保留合理恢復間距，讓 Coach 不會因我連續多天有空就安排不必要的連續跑。
44. 作為使用者，我想在送出前完成五項簡短安全篩查，讓胸痛、暈眩、心肺疾病、影響跑步的痛楚或醫生限制不會被忽略。
45. 作為出現安全警示的使用者，我想保存未承諾草案並被建議先諮詢合資格專業人士，讓 App 不會自行產生加強型處方。
46. 作為使用者，我想知道哪些 onboarding 資料會傳給 Gemini，讓 AI 處理保持透明。
47. 作為重視隱私的使用者，我不想把電郵、帳戶 ID 或歷史相片傳給 Gemini，讓規劃只使用必要資料。
48. 作為使用者，我想按下「交給 Coach 制定計畫」表示同意這次必要資料處理，讓流程清楚但不增加多餘勾選框。
49. 作為使用者，我想由 Gemini 產生完整八週起始計畫，讓我得到可執行的 Initial Coaching Plan，而不是幾個概括數字。
50. 作為使用者，我想先看到 Plan Overview，讓我理解目標、週期、每週次數、建議日及大約投入時間。
51. 作為使用者，我想看見 Coach 的計畫策略與選日理由，讓我知道安排不是隨機填入日曆。
52. 作為使用者，我想看見 Phase Roadmap，讓我理解八週如何從建立習慣逐步走向目標。
53. 作為使用者，我想看見每個 phase 的週數範圍、目的及訓練重點，讓遠期方向容易理解。
54. 作為初學者，我想每節課都有清楚的繁體中文名稱，讓我不必理解訓練術語。
55. 作為初學者，我想每節課列出熱身、主要步驟、重複次數及放鬆，讓我可以直接照做。
56. 作為初學者，我想每節課顯示總時間、RPE 與說話測試，讓我知道應該跑多辛苦。
57. 作為初學者，我想看見今天的訓練重點，讓我不會誤以為每一課都要追求速度。
58. 作為初學者，我想知道不舒服或跟不上時如何降低難度，讓我能安全完成而不是硬撐。
59. 作為使用者，我想第一週預設展開，讓我立即知道下一步要做甚麼。
60. 作為使用者，我想查看第二至八週，讓完整旅程保持透明。
61. 作為使用者，我想未來週清楚標示為 Planned，讓我知道它們是目前 roadmap，不是假裝永久固定的處方。
62. 作為使用者，我想正式承諾前整份計畫保持 Draft，讓預覽不會偷偷建立目標。
63. 作為使用者，我想在 Plan Review 表示希望從更輕鬆開始、程度適合、有一天要調整或希望增加一點挑戰，讓我能參與初始計畫決定。
64. 作為希望增加挑戰的使用者，我想 Coach 先評估安全性而不是無條件加量，讓 Shared Decision-making 不會變成難度滑桿。
65. 作為調整計畫的使用者，我想看見 Before → After 差異，讓我知道星期、次數或分鐘改了甚麼。
66. 作為使用者，我想只有確認調整後草案才更新 Plan Review，讓 Gemini 建議不會直接改變正式規則。
67. 作為使用者，我想在 Gemini 暫時不可用時收到清楚標示的固定規則基本計畫，讓我仍可開始而不會被誤導成 AI 個人化結果。
68. 作為使用者，我想稍後重新要求 Gemini 分析 fallback 計畫，讓外部服務恢復後可以改善草案。
69. 作為使用者，我想按下「開始我的計畫」才建立正式 Running Goal，讓 Commitment 是明確行動。
70. 作為已承諾的使用者，我想 Week 1 變成 Committed，而 Week 2–8 保持 Planned，讓近期責任與遠期方向語意一致。
71. 作為已承諾的使用者，我想計畫版本記錄建立及承諾時間，讓未來 V2 可以保留 coaching history。
72. 作為已承諾的使用者，我想既有雙相片、通知、缺席、暫停、放棄及歸檔規則繼續有效，讓新的計畫體驗不破壞承諾系統。
73. 作為開發者，我想 Gemini 輸出使用受控 schema，讓 App 可以穩定顯示完整計畫。
74. 作為開發者，我想後端驗證 Gemini 的星期、次數、時長、phase、week 及 session，讓模型不能繞過使用者限制或安全規則。
75. 作為開發者，我想資料模型預留 plan version、superseded relationship、phase、week 及 session 狀態，讓 V2 可以新增版本而不破壞歷史。
76. 作為產品負責人，我想 V1 不宣稱會根據每次完成與恢復自動調整，讓 marketing capability 不超過真正實作。

## Implementation Decisions

- 本功能名稱為 **Initial Coaching Plan**；V1 的產品假設是「能否建立一份使用者理解並願意承諾的教練計畫」。
- Running onboarding 採用五步 wizard：`Goal → Running Ability → Recent Activity → Availability → Safety & Submit`。每步自動保存，可向前或向後移動；未送出資料保持 onboarding draft。
- Goal 步驟使用同一組原因選項，但資料上分為唯一 `primaryReason` 與零至多個 `secondaryReasons`。次要原因不得重複主要原因；選擇 Other 時必須補充文字。
- Goal 選項包含 Fat Loss、Health、Fitness、Stress Relief、Discipline、Race 及 Other。主要原因控制後續結構化欄位；底部保留 `desiredIdentityInThreeMonths` 與 `currentSituation` 兩個選填文字欄。
- Race 目標要求距離類型及目標／比賽日期；其他目標的日期選填。Fat Loss 可以保存期望 kg 與日期，但只作 motivation context；計畫成功及承諾完成仍以跑步行為判定，Gemini 不可承諾體重結果、計算熱量或以體重決定強度。
- V1 只允許 18 歲以上建立 Initial Coaching Plan。年齡只保存區間：18–24、25–34、35–44、45–54、55–64、65+；不收出生日期。
- Running Ability 先保存最近四週跑步頻率：none、occasional、once weekly、two-to-three weekly、four-plus weekly。只有非 none 才進入 recent-run confidence flow。
- Recent run 採用 `EXACT / APPROXIMATE / UNKNOWN`。Exact 保存 km、分鐘及 RPE 0–10；Approximate 保存距離區間、時間區間與感覺區間；Unknown 不猜測數字，改問連續慢跑能力。
- 連續慢跑能力使用單選階梯：walk 30 minutes、jog under 5、5–10、10–20、20–30、30+ minutes、unknown。最長約可跑公里為選填。
- 過往固定跑步經驗先保存 yes/no；yes 時保存維持期間區間，並選填當時每週次數。
- Recent Activity 只收三項：最近四週平均每週至少 20 分鐘活動的天數、平均每週總運動時間區間，以及選填的多選運動類型。不加入逐日回憶、睡眠、壓力、心情或完整 wellness 問卷。
- Availability 是可安排時間窗口，不是承諾。使用者多選星期，另選現實可維持的每週次數（2、3、4、5+、Coach recommendation），並為每個 availability day 保存時間區間。UI 支援一次把相同區間套用到所有選中日期。
- 每日可用時間區間為 20–30、30–45、45–60、60–90、90+ minutes、unknown。Gemini 建議的 session 必須落在 availability day 且不超過該日可用時間。
- Safety 步驟保留胸痛、暈眩／失去知覺、已知心肺疾病、影響跑步的關節或肌肉痛楚、醫生運動限制五項。任何一項為 true 都建立 safety block：可保存草案，但不可由 App／Gemini產生可承諾的加強型跑步處方。
- 送出前顯示最小必要資料提示。規劃 request 可以包含目標、年齡區間、跑步能力、近期活動、availability、可維持頻率、每日時間及安全資料；不得包含電郵、帳戶 ID、歷史相片或不相關帳戶資料。
- Gemini 規劃沿用受控 server-side endpoint 與私密 API key。行動 App 不可包含 Gemini key。Request 使用 versioned contract，讓 backend 可以分辨舊的摘要草案與新的完整 Initial Coaching Plan。
- Gemini 必須生成完整八週起始計畫。對半馬／全馬或日期更遠的目標，八週是第一個 training block，Overview／Roadmap 可以說明長期方向，但不得假裝八週一定完成整個備賽目標。
- 過度進取或時間不足的目標不能照單全收。輸出必須標示目標可行性、說明限制並提供較安全階段目標；使用者接受調整後才可 commit。
- Initial Plan schema 至少包含 plan identity、schema version、plan version、status、goal summary、duration weeks、coaching summary、reasoning summary、target rate、recommended training days、estimated weekly time、phases、weeks、created at、committed at 及 superseded-by reference。
- Phase 至少包含 phase identity、起迄週、繁體中文名稱、目的及 progression summary。Phase Roadmap 必須覆蓋八週且不可重疊或留下無歸屬週數。
- Week 至少包含 week number、`DRAFT / COMMITTED / PLANNED` 狀態、focus、estimated total minutes 及 sessions。正式承諾前所有 week 為 Draft；承諾後只允許 Week 1 轉為 Committed，Week 2–8 轉為 Planned。
- Session schema 預留 `PLANNED / COMMITTED / COMPLETED / MISSED / CANCELLED`，V1 Initial Plan 只建立 Draft／Planned／Committed 路徑；Completed、Missed 與 Cancelled 由既有 commitment workflow 及未來 V2 使用。
- 每節 Session 包含日期／weekday、受控內部分類、初學者可理解的繁體中文名稱、總分鐘、分步 instructions、RPE 範圍、talk-test 描述、session focus、easier fallback 及 coaching reason。
- 受控內部分類至少包含 Run/Walk、Easy Run、Long Easy Run 及 Rest。Gemini 可以自由產生具體分步內容，但不能發明 schema 外的不可驗證狀態。V1 不提供個人化 pace prescription 或高強度 interval prescription。
- 對初學者，Gemini 應優先可持續性與恢復間距，不填滿全部 available days，不無理由安排連續跑步日，不同時大幅增加頻率與時長。
- Plan validation 是確定性 backend responsibility。它必須驗證八週完整性、phase coverage、week numbering、session day availability、frequency ceiling、daily time ceiling、受控分類、正數分鐘、安全 block、唯一 Week 1 commitment 及必要繁體中文內容。無效 AI response 不可直接傳給 commitment workflow。
- Plan Review 依序呈現 Plan Overview、Coach Strategy／Reasoning、Phase Roadmap、Weekly Plan。Week 1 預設展開；Week 2–8 可查看並明確標示 future plan may change，但 V1 不宣稱自動 adaptation 已存在。
- Initial Plan Review 提供受控 feedback：start easier、this feels suitable、increase a little challenge、adjust a day，以及選填原因。Gemini 可以提出修訂 Draft，但 harder request 不等於必須加量；安全規則與 backend validation 仍有最終否決權。
- 每次 revision 必須產生 Before → After comparison，至少列出每週次數、總分鐘、training days 及改動 session。使用者確認後才替換未承諾 Draft。
- Gemini 不可用時，由確定性規則產生保守八週 basic plan，清楚標示不是 Gemini 個人化輸出。Fallback 可以保存、修改及承諾，亦可稍後重新要求 AI 分析。
- 「開始我的計畫」是唯一由 Initial Plan 進入 Running Goal 的 commit action。Commitment workflow 再次驗證 plan、建立 version metadata、把 Week 1 設為 Committed、Week 2–8 設為 Planned，並建立既有每日 record、通知與目標事件。
- 已承諾目標仍遵守現有規則：每人最多一個 active／paused Running Goal、不可直接刪除、兩張相片相隔 15 分鐘、23:45 截止、主時區、缺席、暫停、完成、放棄及歸檔。
- Plan version metadata 從 V1 開始保存，但 V1 不執行每週自動 plan mutation。未來更新必須以新版本 supersede 舊版本，不能破壞 coaching history。
- Coaching copy 採用「底層嚴格、表層溫暖」原則：誠實說明限制與安排理由，不空泛稱讚、不把較輕計畫描述為懲罰，也不為了取悅使用者同意不安全 progression。

## Testing Decisions

- 好的測試驗證使用者與領域可觀察行為：不同答案顯示哪些後續問題、提交是否被接受、Gemini request 是否只包含必要資料、AI response 是否被安全驗證、Plan Review 是否得到完整可理解資料，以及明確 commit 後 week／goal 狀態是否正確。測試不依賴 hook 次序、元件內部 state 或 Gemini SDK 實作。
- 主要且最高層的單一測試 seam 是 Initial Coaching Plan workflow integration contract。它由完整 `OnboardingSubmission` 開始，使用 Gemini stub，經 request mapping、plan validation、Plan Review projection 及 explicit commit，最後斷言 Running Goal、Plan Version、Week status 與 sessions 的外部結果。
- 這個 integration seam 必須覆蓋五步有效 submission 產生八週 plan；正式 commit 前沒有 active goal；commit 後 Week 1 為 Committed、Week 2–8 為 Planned；既有 record 與 goal event 正確建立。
- 同一 seam 必須以資料表／fixture 覆蓋 Goal 動態欄位、Race 日期要求、Other 補充、18+ gate、Exact／Approximate／Unknown、running-history conditional fields、recent-activity options、availability、realistic frequency 及 per-day time limits。
- 安全與可行性 fixture 必須覆蓋：任一 safety flag 阻止可承諾處方；完全新手的過度進取全馬日期被降為安全階段目標；weight-loss motivation 不成為完成判定或強度輸入。
- AI contract fixture 必須覆蓋：只送必要 coaching inputs；不送 email、account ID 或相片；八週、phase coverage、week numbering、受控 session classification、繁體中文 steps、RPE、talk test、easier fallback 及 coaching reason 都是必要輸出。
- Plan validation fixture 必須拒絕：使用者不可用日期、超過每日時間、超過現實 frequency、無理由連續 beginner running days、缺 phase／week、錯誤狀態、負分鐘、schema 外 session type、空 instructions，以及 safety blocked response。
- Plan Review projection 測試必須驗證 Overview、reasoning、Phase Roadmap、第一週展開資料、future Planned label 及 estimated weekly totals，而不是測試特定畫面樹或 CSS。
- Revision fixture 必須驗證受控 feedback 不直接 mutate committed plan；Gemini 修訂仍通過相同 validator；Before → After 能準確列出日期、次數、總分鐘及 session 差異；使用者確認前仍保留原 Draft。
- Fallback fixture 必須驗證 Gemini timeout、非 2xx、空 response 及 schema invalid 時，系統回傳清楚標示的 basic plan，且不把 fallback 冒充 Gemini output。
- 既有 `RunningCommitmentWorkflow` 測試是本 repo 的 prior art，繼續覆蓋唯一進行中目標、15 分鐘雙相片、23:45、午夜缺席、修改、暫停與歸檔；本功能不重複在 UI 測試這些規則。
- 既有 Gemini backend contract test 是 AI transport prior art，擴充為完整 Initial Plan structured output、sanitization 及 invalid-output rejection；API key、實際模型品質與網路不放入 deterministic test。
- 只保留一條 Android simulator smoke path 作整合驗證：完成五步 onboarding、看到八週 Plan Review、按下 commit、返回 Workspace 看見 active goal。它依可存取文字與狀態驗證，不依賴座標或 view hierarchy。

## Out of Scope

- V2 Adaptive Coaching Loop：post-run RPE／completion／pain feedback、結構化 missed reason、Weekly Readiness Check、weekly aggregation、Coach reasoning 與 Recommit。
- V2 的 `Training / Recovery / Scheduling / Behaviour / Safety` reasoning engine，以及 `PROGRESS / MAINTAIN / RECOVER / RESCHEDULE / SAFETY_HOLD` Coach Decision。
- 根據完成率、疲勞、痛楚或生活事件自動重算 Week 2–8；V1 的 Planned 狀態只建立正確 mental model 與 version-ready schema。
- Minimum Version、activation-energy intervention、通知 trigger 自動最佳化及因「忘記」而調整提醒。
- 每日睡眠、壓力、心情、肌肉酸痛、心率變異或其他 wellness 問卷。
- 個人化 pace prescription、心率 zone、高強度 intervals、GPS 路線、穿戴裝置、比賽預測及完整半馬／全馬備賽週期。
- 營養、熱量、減重處方或保證體重結果。
- 未滿 18 歲的計畫、醫療診斷、復康處方或取代醫生／合資格教練的安全決定。
- Keep Fit 的其他運動方式與 Running 以外目標類別。
- 正式 production authentication、跨裝置同步、雲端資料庫、後端排程器、付費方案及模型成本控制；現有 V1 adapter 邊界維持不變。
- 重新設計既有雙相片打卡、通知、缺席、暫停、放棄、完成、相片保存或帳戶刪除規則。
- 開放式長期 Coach chat；V1 使用結構化 onboarding、Plan Review feedback 與受控 AI generation。

## Further Notes

- V1 與 V2 驗證不同產品假設：V1 問「能否建立一份使用者理解並願意承諾的教練計畫」；V2 才問「Coach 能否在真實生活發生後正確調整計畫」。
- 本規格取代舊 V1 規格中「少量 assessment → 標題／摘要／星期／單一分鐘」的計畫建立部分；帳戶、Workspace、承諾、雙相片、通知、缺席與歸檔決策繼續有效。
- `Exact → Approximate → I don't know` 是整個 onboarding 的資料品質原則。Unknown 不等於缺失錯誤；Gemini prompt 必須明確要求：Exact 可直接使用、Approximate 保守解讀、Unknown 不得猜測。
- `Availability ≠ Commitment` 是計畫架構原則。Gemini 從可用窗口中選擇可持續日子並解釋理由；使用者確認後，選中的近期日子才成為 Commitment。
- `Committed ≠ permanently fixed`。V1 只承諾近期 Week 1；遠期 Planned week 保留方向性與透明度，為 V2 plan versioning 預備，但 V1 不宣稱自動 adaptation。
- 受控 session type 是內部驗證 vocabulary，不是限制 AI 只能套模板。使用者看到的是 Gemini 產生的具體繁體中文 instructions，而不是抽象術語。
- Gemini model、prompt 或 SDK 可以替換，但 backend contract、plan validator、commitment workflow 與歷史語意必須保持穩定。
- Gemini API key 只存在 server-side environment。Client 與 issue／log／測試 fixture 都不得包含真實 key。
- Coach personality 的目標是「我站在你這邊，但不會為了讓你開心而給你不適合的計畫」。Warm 不等於 permissive，Serious 不等於 cold。
