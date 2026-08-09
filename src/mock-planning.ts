import { AvailabilityWindow, Goal, Milestone, Plan, Task } from './domain';

const taskTemplates = [
  { title: '釐清本週的小目標', description: '把目標拆成今天能開始的一小步。', minutes: 30 },
  { title: '完成核心練習', description: '專注完成一段可驗證的練習或產出。', minutes: 60 },
  { title: '整理與複盤', description: '記錄卡住的地方，為下一次安排準備。', minutes: 30 },
  { title: '完成進度輸出', description: '將本週成果整理成可回顧的版本。', minutes: 90 },
  { title: '檢查里程碑', description: '對照原目標，調整下一週的優先順序。', minutes: 45 },
  { title: '收尾與回顧', description: '完成最後一項重要行動並記錄下一步。', minutes: 60 },
];

const pythonTemplates = [
  { title: '完成 Python 變數與資料型別練習', description: '練習字串、數字、布林值與型別轉換。', minutes: 60 },
  { title: '完成 Python 條件與迴圈練習', description: '寫出三個 if／for／while 小題目。', minutes: 60 },
  { title: '練習函式與串列', description: '完成一個可重複使用的小函式。', minutes: 60 },
  { title: '完成字典與檔案讀寫練習', description: '將資料讀取、處理並輸出結果。', minutes: 90 },
  { title: '製作小型練習專案', description: '整合已學概念，完成一個命令列小工具。', minutes: 90 },
  { title: '回顧錯題與整理筆記', description: '補強仍不熟悉的概念。', minutes: 45 },
];

const thesisTemplates = [
  { title: '整理第一節大綱與參考文獻', description: '將段落主張與引用來源列成提綱。', minutes: 60 },
  { title: '撰寫論文第一節草稿', description: '先完成可修改的初稿，不追求一次完美。', minutes: 90 },
  { title: '補足文獻脈絡', description: '為草稿加入必要的來源與過渡句。', minutes: 60 },
  { title: '撰寫第二節草稿', description: '完成本章下一個論點的初稿。', minutes: 90 },
  { title: '修訂章節結構與論證', description: '檢查段落順序、重複與論點連貫性。', minutes: 60 },
  { title: '完成第一章可交付版本', description: '校對格式、引用與待詢問指導老師的問題。', minutes: 90 },
];

const runningTemplates = [
  { title: '慢跑 30 分鐘', description: '以能說完整句子的舒服速度完成。', minutes: 30 },
  { title: '肌力基礎訓練', description: '完成深蹲、推、拉與核心各一組。', minutes: 45 },
  { title: '準備一餐高蛋白餐點', description: '選擇容易持續、自己願意吃的搭配。', minutes: 30 },
  { title: '快走或跑走交替 40 分鐘', description: '保持穩定節奏，結束後簡短記錄感受。', minutes: 40 },
  { title: '本週飲食與活動回顧', description: '觀察趨勢，不以單日數字評判自己。', minutes: 30 },
  { title: '長距離輕鬆跑', description: '將重點放在完成與恢復。', minutes: 60 },
];

function dateFrom(value: string): Date {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function combine(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function chooseTemplates(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('python')) return pythonTemplates;
  if (title.includes('論文')) return thesisTemplates;
  if (title.includes('減脂') || title.includes('跑步') || title.includes('體重')) return runningTemplates;
  return taskTemplates;
}

function nextSlot(after: Date, availability: AvailabilityWindow[]): { start: Date; end: Date } {
  for (let offset = 0; offset < 21; offset += 1) {
    const candidate = new Date(after);
    candidate.setDate(candidate.getDate() + offset);
    const matching = availability.find((window) => window.weekday === candidate.getDay());
    if (!matching) continue;
    const start = combine(candidate, matching.start);
    const end = combine(candidate, matching.end);
    if (start > after || offset > 0) return { start, end };
  }
  const fallback = new Date(after);
  fallback.setDate(fallback.getDate() + 1);
  return { start: combine(fallback, '19:00'), end: combine(fallback, '20:00') };
}

export function buildMockPlan(goal: Pick<Goal, 'title' | 'deadline' | 'availability'>): Plan {
  const templates = chooseTemplates(goal.title);
  const availability = goal.availability.length ? goal.availability : [];
  const deadline = dateFrom(goal.deadline);
  const now = new Date();
  let cursor = new Date(now.getTime() + 60 * 60_000);
  const tasks: Task[] = templates.map((template, index) => {
    const slot = nextSlot(cursor, availability);
    const requestedEnd = addMinutes(slot.start, template.minutes);
    const end = requestedEnd <= slot.end ? requestedEnd : slot.end;
    cursor = new Date(slot.start.getTime() + 24 * 60 * 60_000);
    return {
      id: `task-${Date.now()}-${index}`,
      title: template.title,
      description: template.description,
      startAt: slot.start.toISOString(),
      endAt: end.toISOString(),
      selected: index < 3,
    };
  });
  const milestones: Milestone[] = [
    { title: '第一週：建立節奏', description: '先完成三個小任務，找出最容易開始的方式。' },
    { title: '中段：完成核心輸出', description: '將重點放在最能推進目標的練習或產出。' },
    { title: '最後一週：整合與收尾', description: '整理成果，保留下一輪可延續的行動。' },
  ];
  const lastTask = tasks[tasks.length - 1];
  const capacityWarning = !availability.length
    ? '尚未設定可用時段。請先安排固定時段，才能得到較可靠的計畫。'
    : lastTask && new Date(lastTask.endAt) > deadline
      ? '依目前期限與可用時段，任務可能無法如期完成。你可以延後期限、增加可用時段，或縮小本輪範圍。'
      : undefined;
  return {
    suggestedDueDate: goal.deadline,
    summary: `這是一份可修改的初步計畫，先從「${tasks[0]?.title ?? '第一個小步驟'}」開始。`,
    milestones,
    tasks,
    capacityWarning,
  };
}
