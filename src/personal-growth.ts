import {
  Account,
  DailyTimeRange,
  PersonalGrowthFocus,
  PersonalGrowthFormat,
  PersonalGrowthGoal,
  PersonalGrowthLevel,
  PersonalGrowthPlanDraft,
  PersonalGrowthSubmission,
  PersonalGrowthTask,
  PersonalGrowthTemplateAnswer,
  PersonalGrowthTemplateAnswers,
  PersonalGrowthTemplateOtherAnswers,
  PersonalGrowthTimeSlot,
  PersonalGrowthWeek,
  PersonalGrowthWeeklyReview,
  Weekday,
  defaultPersonalGrowthSubmission,
} from './domain';
import { addDays, dateKeyInZone } from './time';

export const personalGrowthFocusOptions: Array<[PersonalGrowthFocus, string, string]> = [
  ['new_skill', '學習新技能', '由零開始掌握一項可實際使用的技能。'],
  ['language_learning', '語言學習', '建立詞彙、理解及表達的穩定練習。'],
  ['reading_knowledge', '閱讀與知識', '把閱讀轉成理解、筆記及可應用的洞見。'],
  ['mindset', '思維與心態', '練習覺察、反思及更有彈性的思考方式。'],
  ['focus_time', '專注與時間管理', '建立適合生活的專注節奏及安排方法。'],
  ['creative_expression', '創意與表達', '透過寫作、設計、說話或作品表達想法。'],
  ['self_reflection', '自我探索與反思', '整理價值觀、方向及下一步選擇。'],
  ['discipline_habits', '建立自律與習慣', '把想做的事拆成可以重複的日常行動。'],
  ['other', '其他', '輸入你想探索的個人成長方向。'],
];

export const personalGrowthFormatOptions: Array<[PersonalGrowthFormat, string]> = [
  ['reading', '閱讀／文章'],
  ['video', '影片／課程'],
  ['practice', '短時間練習'],
  ['project', '作品／小專案'],
  ['mixed', '混合方式'],
];

export const personalGrowthLevelOptions: Array<[PersonalGrowthLevel, string]> = [
  ['starting', '剛開始'],
  ['some_experience', '有少量經驗'],
  ['intermediate', '已有基礎'],
  ['advanced', '已有相當經驗'],
  ['unknown', '不確定'],
];

export type PersonalGrowthTemplateQuestion = {
  key: string;
  label: string;
  options: Array<[string, string]>;
};

const otherOption: [string, string] = ['other', '其他'];
const options = (...values: Array<[string, string]>) => [...values, otherOption];

/** The agreed V1 templates. Values are stable keys; labels are sent to Gemini as context. */
export const personalGrowthTemplates: Record<Exclude<PersonalGrowthFocus, 'other'>, PersonalGrowthTemplateQuestion[]> = {
  new_skill: [
    { key: 'skill_category', label: '你想學哪類新技能？', options: options(['coding', '程式設計'], ['design', '設計'], ['business', '商業與行銷'], ['data', '數據分析'], ['communication', '溝通與簡報'], ['life_skill', '實用生活技能']) },
    { key: 'skill_outcome', label: '你希望帶來甚麼成果？', options: options(['small_project', '完成小作品'], ['solve_work', '解決工作問題'], ['portfolio', '建立作品集'], ['independent', '可獨立應用']) },
    { key: 'skill_experience', label: '你的經驗是？', options: options(['starting', '剛開始'], ['some', '略懂'], ['foundation', '已有基礎']) },
    { key: 'skill_method', label: '你偏好怎樣學？', options: options(['course', '跟課程'], ['project', '做專案'], ['reading', '閱讀練習'], ['community', '找人交流']) },
  ],
  language_learning: [
    { key: 'language', label: '你想學哪一種語言？', options: options(['english', '英文'], ['japanese', '日文'], ['korean', '韓文'], ['mandarin', '普通話'], ['french', '法文'], ['spanish', '西班牙文']) },
    { key: 'language_context', label: '你最想在哪個情境使用？', options: options(['daily', '日常對話'], ['travel', '旅行'], ['work', '職場'], ['exam', '考試'], ['content', '看懂內容']) },
    { key: 'language_level', label: '你目前的程度？', options: options(['zero', '零基礎'], ['basic', '基礎'], ['conversation', '可簡單溝通'], ['foundation', '已有基礎']) },
    { key: 'language_skill', label: '你想優先提升甚麼？', options: options(['listen_speak', '聽說'], ['reading', '閱讀'], ['writing', '寫作'], ['all', '綜合能力']) },
  ],
  reading_knowledge: [
    { key: 'reading_topic', label: '你想讀哪個主題？', options: options(['business', '商業職場'], ['psychology', '心理成長'], ['history', '歷史文化'], ['technology', '科技趨勢'], ['finance', '理財'], ['literature', '小說文學']) },
    { key: 'reading_goal', label: '你閱讀的主要目的？', options: options(['habit', '建立習慣'], ['solve_problem', '解決問題'], ['broaden', '擴闊知識'], ['share', '輸出分享']) },
    { key: 'reading_habit', label: '你目前的閱讀習慣？', options: options(['none', '幾乎不讀'], ['occasional', '偶爾'], ['weekly', '每週閱讀'], ['steady', '已有穩定習慣']) },
    { key: 'reading_media', label: '你偏好甚麼媒介？', options: options(['paper', '紙本'], ['ebook', '電子書'], ['article', '文章'], ['audio', '有聲書']) },
  ],
  mindset: [
    { key: 'mindset_area', label: '你想改善哪個面向？', options: options(['confidence', '自信'], ['resilience', '抗壓'], ['emotion', '情緒穩定'], ['procrastination', '減少拖延'], ['acceptance', '自我接納']) },
    { key: 'mindset_trigger', label: '最常在哪個情境出現？', options: options(['work', '工作壓力'], ['relationship', '人際關係'], ['performance', '公開表現'], ['setback', '遇到挫折'], ['anxiety', '日常焦慮']) },
    { key: 'mindset_state', label: '你目前的狀態？', options: options(['aware', '剛意識到'], ['sometimes', '偶爾困擾'], ['often', '經常困擾'], ['methods', '已有方法但不穩定']) },
    { key: 'mindset_method', label: '你願意用甚麼方式練習？', options: options(['journal', '日記反思'], ['mindfulness', '正念呼吸'], ['cognitive', '認知練習'], ['reading', '閱讀'], ['challenge', '行動挑戰']) },
  ],
  focus_time: [
    { key: 'focus_problem', label: '你最大的困擾？', options: options(['procrastination', '拖延'], ['phone', '手機分心'], ['too_many', '任務太多'], ['starting', '難開始'], ['interruptions', '經常被打斷']) },
    { key: 'focus_context', label: '你最想改善哪個情境？', options: options(['work', '工作'], ['study', '學習'], ['project', '個人專案'], ['life', '家務生活']) },
    { key: 'focus_time', label: '你通常在哪個時段較能專注？', options: options(['morning', '早上'], ['afternoon', '下午'], ['evening', '晚上'], ['varies', '不固定']) },
    { key: 'focus_habit', label: '你目前的做法？', options: options(['none', '沒有系統'], ['list', '偶爾列清單'], ['tool', '有工具但難持續'], ['routine', '已有規律']) },
  ],
  creative_expression: [
    { key: 'creative_form', label: '你想用甚麼形式表達？', options: options(['writing', '寫作'], ['design', '繪畫設計'], ['video', '影片'], ['music', '音樂'], ['photo', '攝影'], ['speaking', '公開表達']) },
    { key: 'creative_goal', label: '你想完成甚麼？', options: options(['one_work', '完成一件作品'], ['habit', '建立創作習慣'], ['publish', '發布分享'], ['skill', '提升技巧']) },
    { key: 'creative_experience', label: '你的經驗？', options: options(['starting', '剛開始'], ['interested', '有興趣但未做'], ['occasional', '偶爾創作'], ['foundation', '已有基礎']) },
    { key: 'creative_share', label: '你對分享作品的想法？', options: options(['private', '只自己看'], ['friends', '給朋友'], ['public', '公開發布'], ['unsure', '尚未決定']) },
  ],
  self_reflection: [
    { key: 'reflection_topic', label: '你想探索甚麼主題？', options: options(['values', '價值觀'], ['career', '職涯方向'], ['strengths', '個人優勢'], ['priorities', '人生優先次序'], ['relationships', '關係模式']) },
    { key: 'reflection_result', label: '你期待得到甚麼？', options: options(['understand', '更了解自己'], ['decision', '作出決定'], ['next_step', '找出下一步'], ['habit', '建立反思習慣']) },
    { key: 'reflection_method', label: '你偏好甚麼反思方式？', options: options(['journal', '提示式日記'], ['questions', '問題清單'], ['walk', '散步反思'], ['talk', '找人對談']) },
    { key: 'reflection_state', label: '你目前的狀態？', options: options(['lost', '迷惘'], ['unclear', '有想法但不清晰'], ['transition', '正在轉變'], ['confirm', '已有方向想確認']) },
  ],
  discipline_habits: [
    { key: 'habit_category', label: '你想建立哪類習慣？', options: options(['sleep', '早睡早起'], ['exercise', '運動'], ['reading', '閱讀'], ['learning', '學習'], ['tidy', '整理'], ['phone', '減少手機']) },
    { key: 'habit_trigger', label: '甚麼時機最適合開始？', options: options(['morning', '起床後'], ['lunch', '午飯後'], ['after_work', '下班後'], ['bedtime', '睡前'], ['fixed', '指定時間']) },
    { key: 'habit_consistency', label: '目前的持續度？', options: options(['not_started', '尚未開始'], ['breaks', '常中斷'], ['sometimes', '偶爾做到'], ['steady', '已能維持']) },
    { key: 'habit_obstacle', label: '最大的障礙？', options: options(['forget', '忘記'], ['tired', '太累'], ['time', '沒有時間'], ['motivation', '缺乏動力'], ['environment', '環境干擾']) },
  ],
};

export function templateForFocus(focus: PersonalGrowthFocus): PersonalGrowthTemplateQuestion[] {
  return focus === 'other' ? [] : personalGrowthTemplates[focus];
}

export function templateAnswerLabel(focus: PersonalGrowthFocus, key: string, answer: PersonalGrowthTemplateAnswer, otherAnswers: PersonalGrowthTemplateOtherAnswers = {}): string {
  const question = templateForFocus(focus).find((item) => item.key === key);
  const answers = Array.isArray(answer) ? answer : [answer];
  return answers.filter(Boolean).map((value) => value === 'other' ? otherAnswers[key]?.trim() || '其他' : question?.options.find(([option]) => option === value)?.[1] ?? value).join('、');
}

export function hasCompleteTemplateAnswers(submission: PersonalGrowthSubmission): boolean {
  return templateForFocus(submission.focus.primary).every((question) => {
    const answer = submission.templateAnswers?.[question.key];
    const values = Array.isArray(answer) ? answer : answer ? [answer] : [];
    return values.length > 0 && (!values.includes('other') || Boolean(submission.templateOtherAnswers?.[question.key]?.trim()));
  });
}

const ids = (prefix: string, value: string | number) => `${prefix}-${value}`;
const dailyLimit: Record<Exclude<DailyTimeRange, 'other'>, number> = { '20_30': 30, '30_45': 45, '45_60': 60, '60_90': 90, '90_plus': 120, unknown: 30 };
const timeSlotStart: Record<Exclude<PersonalGrowthTimeSlot, 'other'>, string> = { morning: '08:00', afternoon: '13:00', evening: '19:00' };

function validClock(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return undefined;
  const [hours, minutes] = text.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? text : undefined;
}

function startTimeForSubmission(submission: PersonalGrowthSubmission): string {
  if (submission.preferredTimeSlot === 'other') return validClock(submission.preferredStartTime) ?? '19:00';
  return timeSlotStart[submission.preferredTimeSlot ?? 'evening'] ?? '19:00';
}

function dailyMinutesForSubmission(submission: PersonalGrowthSubmission, weekday: Weekday): number {
  const range = submission.timeByDay[weekday] ?? 'unknown';
  if (range === 'other') return Math.max(1, Number(submission.timeByDayCustom?.[weekday]) || 30);
  return dailyLimit[range];
}

function cleanAnswerMap(value: unknown): PersonalGrowthTemplateAnswers {
  if (!value || typeof value !== 'object') return {};
  const result: PersonalGrowthTemplateAnswers = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, answer]) => {
    if (key.length > 80) return;
    if (typeof answer === 'string') result[key] = answer.trim().slice(0, 160);
    else if (Array.isArray(answer)) result[key] = answer.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 160)).filter(Boolean);
  });
  return result;
}

function cleanOtherAnswerMap(value: unknown): PersonalGrowthTemplateOtherAnswers {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, answer]) => key.length <= 80 && typeof answer === 'string')
    .map(([key, answer]) => [key, String(answer).trim().slice(0, 160)]));
}

export function normalisePersonalGrowthSubmission(value: PersonalGrowthSubmission | undefined): PersonalGrowthSubmission {
  const source = value ?? defaultPersonalGrowthSubmission;
  const primary = source.focus?.primary ?? defaultPersonalGrowthSubmission.focus.primary;
  const availableDays = [...new Set((source.availableDays ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))] as Weekday[];
  const timeByDay = { ...(source.timeByDay ?? {}) };
  const timeByDayCustom = { ...(source.timeByDayCustom ?? {}) };
  availableDays.forEach((day) => {
    if (!['20_30', '30_45', '45_60', '60_90', '90_plus', 'other', 'unknown'].includes(timeByDay[day] ?? '')) timeByDay[day] = '30_45';
    if (timeByDay[day] === 'other') timeByDayCustom[day] = Math.max(1, Number(timeByDayCustom[day]) || 30);
  });
  return {
    ...defaultPersonalGrowthSubmission,
    ...source,
    classification: { category: 'personal_growth', subcategory: 'growth' },
    focus: { primary, secondary: [] },
    availableDays,
    timeByDay,
    timeByDayCustom,
    preferredFormats: source.preferredFormats?.length ? [...new Set(source.preferredFormats)] : ['mixed'],
    cycleWeeks: Number.isInteger(Number(source.cycleWeeks)) && Number(source.cycleWeeks) > 0 ? Number(source.cycleWeeks) : defaultPersonalGrowthSubmission.cycleWeeks,
    weeklyMinutes: Math.min(600, Math.max(30, Number(source.weeklyMinutes) || defaultPersonalGrowthSubmission.weeklyMinutes)),
    templateAnswers: cleanAnswerMap(source.templateAnswers),
    templateOtherAnswers: cleanOtherAnswerMap(source.templateOtherAnswers),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(source.startDate ?? '') ? source.startDate : undefined,
    preferredTimeSlot: ['morning', 'afternoon', 'evening', 'other'].includes(source.preferredTimeSlot ?? '') ? source.preferredTimeSlot as PersonalGrowthTimeSlot : 'evening',
    preferredStartTime: validClock(source.preferredStartTime),
  };
}

function focusLabel(focus: PersonalGrowthFocus): string {
  return personalGrowthFocusOptions.find(([value]) => value === focus)?.[1] ?? '個人成長';
}

function chooseDays(submission: PersonalGrowthSubmission): Weekday[] {
  const days = [...new Set(submission.availableDays)].sort((a, b) => a - b);
  return days.length ? days : [...defaultPersonalGrowthSubmission.availableDays];
}

export function selectionSummary(submission: PersonalGrowthSubmission): { outcome: string; successDefinition: string; currentSituation: string } {
  const focus = focusLabel(submission.focus.primary);
  const answers = templateForFocus(submission.focus.primary).map((question) => `${question.label.replace('？', '')}：${templateAnswerLabel(submission.focus.primary, question.key, submission.templateAnswers?.[question.key] ?? '', submission.templateOtherAnswers)}`);
  return {
    outcome: `在 ${submission.cycleWeeks} 週內，以「${focus}」為重心，完成：${answers.slice(0, 2).join('；')}。`,
    successDefinition: `完成計畫安排的練習並留下成果；${answers.slice(2).join('；')}。`,
    currentSituation: answers.join('；'),
  };
}

export function preparePersonalGrowthSubmission(value: PersonalGrowthSubmission): PersonalGrowthSubmission {
  const clean = normalisePersonalGrowthSubmission(value);
  if (clean.focus.primary === 'other' || !hasCompleteTemplateAnswers(clean)) return clean;
  const summary = selectionSummary(clean);
  return { ...clean, ...summary, preferredFormats: ['mixed'] };
}

function dateForTask(startDate: string, weekNumber: number, weekday: Weekday): string {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const offset = (weekday - start.getUTCDay() + 7) % 7 + (weekNumber - 1) * 7;
  return addDays(startDate, offset);
}

function taskCopy(submission: PersonalGrowthSubmission, weekNumber: number, index: number): Pick<PersonalGrowthTask, 'title' | 'instructions' | 'completionCriteria' | 'easierFallback' | 'coachingReason'> {
  const focus = focusLabel(submission.focus.primary);
  const modes = submission.preferredFormats.map((format) => personalGrowthFormatOptions.find(([value]) => value === format)?.[1]).filter(Boolean).join('、');
  const stage = weekNumber <= Math.ceil(submission.cycleWeeks / 3) ? '了解基礎' : weekNumber <= Math.ceil(submission.cycleWeeks * 2 / 3) ? '穩定練習' : '完成小輸出';
  return {
    title: `${stage}：${focus} ${index + 1}`,
    instructions: [
      `先用 5 分鐘回顧今天要處理的 ${focus} 小主題。`,
      `用你選擇的方式（${modes || '混合方式'}）專注練習，完成一個細小而可見的步驟。`,
      '最後用 2 分鐘記下完成了甚麼、下一次從哪裡開始。',
    ],
    completionCriteria: '留下今天的練習紀錄或一個可查看的小成果。',
    easierFallback: '只做第一個步驟 10 分鐘，留下下一步，不需要補回全部時間。',
    coachingReason: '把抽象的成長方向拆成一次可以完成的行動，比一次安排大量內容更容易建立節奏。',
  };
}

function buildWeek(submission: PersonalGrowthSubmission, startDate: string, weekNumber: number): PersonalGrowthWeek {
  const days = chooseDays(submission);
  const minutes = Math.max(10, Math.floor(submission.weeklyMinutes / days.length));
  const tasks = days.map((weekday, taskIndex) => ({
    id: ids(`week-${weekNumber}-task`, taskIndex + 1),
    weekNumber,
    weekday,
    date: dateForTask(startDate, weekNumber, weekday),
    startTime: startTimeForSubmission(submission),
    status: 'DRAFT' as const,
    totalMinutes: Math.min(minutes, dailyMinutesForSubmission(submission, weekday)),
    ...taskCopy(submission, weekNumber, taskIndex),
  }));
  return {
    id: ids('week', weekNumber),
    weekNumber,
    status: 'DRAFT' as const,
    focus: weekNumber === 1 ? '建立可持續的起點並留下第一份成果' : '根據上一週的真實進度，完成下一個可驗證步驟',
    estimatedTotalMinutes: tasks.reduce((total, task) => total + task.totalMinutes, 0),
    tasks,
  };
}

/** Adds editable local date/time values to V1 plans that were created before scheduling existed. */
export function normalisePersonalGrowthPlanDraft(plan: PersonalGrowthPlanDraft, fallbackStartDate: string): PersonalGrowthPlanDraft {
  const submission = normalisePersonalGrowthSubmission(plan.submission);
  const startDate = submission.startDate ?? fallbackStartDate;
  return {
    ...plan,
    submission: { ...submission, startDate },
    weeks: plan.weeks.map((week) => ({
      ...week,
      tasks: week.tasks.map((task) => ({
        ...task,
        date: task.date ?? dateForTask(startDate, week.weekNumber, task.weekday),
        startTime: task.startTime ?? startTimeForSubmission(submission),
      })),
    })),
  };
}

export class PersonalGrowthWorkflow {
  createFallbackPlan(submission: PersonalGrowthSubmission, now: Date): PersonalGrowthPlanDraft {
    const normalised = preparePersonalGrowthSubmission(submission);
    const startDate = normalised.startDate ?? dateKeyInZone(now, 'Asia/Hong_Kong');
    const clean = { ...normalised, startDate };
    const week = buildWeek(clean, startDate, 1);
    return {
      id: ids('growth-draft', now.getTime()),
      schemaVersion: 'personal-growth-plan/v1',
      planVersion: 1,
      status: 'DRAFT',
      createdAt: now.toISOString(),
      source: 'fallback',
      submission: clean,
      classification: clean.classification,
      title: `你的${focusLabel(clean.focus.primary)}起始計畫`,
      summary: `以 ${clean.cycleWeeks} 週目標作為方向，先完成第 1 週小行動，再按真實進度規劃下一週。`,
      goalSummary: clean.outcome.trim() || `建立${focusLabel(clean.focus.primary)}的穩定節奏`,
      feasibility: { status: 'REALISTIC', message: '這份起始計畫先按你提供的時間容量安排，之後可以再按實際生活調整。' },
      coachingSummary: '先完成本週的小步驟並留下證據；下週會根據你的回顧調整，不必現在承諾所有未來工作。',
      reasoningSummary: `從你選擇的 ${chooseDays(clean).length} 個日子安排第一週，保留緩衝，讓實際完成情況決定下一週。`,
      milestones: [{ id: ids('milestone', 1), weekNumber: 1, title: '本週的可見起點', purpose: '先建立可持續的節奏。', successSignal: '完成至少一項任務並保留成果或回顧。' }],
      weeks: [week],
      cycleWeeks: clean.cycleWeeks,
      weeklyMinutes: clean.weeklyMinutes,
    };
  }

  validateSubmission(submission: PersonalGrowthSubmission): { ok: boolean; errors: string[] } {
    const clean = normalisePersonalGrowthSubmission(submission);
    const errors: string[] = [];
    if (!clean.focus.primary) errors.push('請至少選擇一個個人成長方向。');
    if (clean.focus.primary === 'other' && !clean.otherFocus?.trim()) errors.push('請補充其他成長方向。');
    const legacyFreeform = clean.outcome.trim().length >= 5 && clean.successDefinition.trim().length >= 5;
    if (clean.focus.primary !== 'other' && !hasCompleteTemplateAnswers(clean) && !legacyFreeform) errors.push('請完成這個成長方向的所有選項。');
    if ((clean.focus.primary === 'other' || !hasCompleteTemplateAnswers(clean)) && clean.outcome.trim().length < 5) errors.push('請描述你想達成的結果。');
    if ((clean.focus.primary === 'other' || !hasCompleteTemplateAnswers(clean)) && clean.successDefinition.trim().length < 5) errors.push('請描述你會如何判斷完成。');
    if (!clean.availableDays.length) errors.push('請至少選擇一個可安排的日子。');
    if (clean.availableDays.some((day) => !clean.timeByDay[day])) errors.push('每個可安排日都需要一個時間區間。');
    if (clean.weeklyMinutes < 30 || clean.weeklyMinutes > 600) errors.push('每週可投入時間必須在 30 至 600 分鐘。');
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
  }

  validatePlan(submission: PersonalGrowthSubmission, plan: PersonalGrowthPlanDraft): { ok: boolean; errors: string[] } {
    const errors = [...this.validateSubmission(submission).errors];
    if (plan.schemaVersion !== 'personal-growth-plan/v1') errors.push('個人成長計畫 schema 不正確。');
    if (plan.status !== 'DRAFT') errors.push('確認前計畫必須保持草案狀態。');
    if (plan.weeks.length !== 1) errors.push('個人成長草案一次只能安排一週。');
    const clean = normalisePersonalGrowthSubmission(submission);
    plan.weeks.forEach((week) => {
      if (!Number.isInteger(week.weekNumber) || week.weekNumber < 1 || week.weekNumber > plan.cycleWeeks) errors.push('本週編號不在計畫週期內。');
      const total = week.tasks.reduce((sum, task) => sum + task.totalMinutes, 0);
      if (total > clean.weeklyMinutes) errors.push(`第 ${week.weekNumber} 週超過每週時間上限。`);
      week.tasks.forEach((task) => {
        if (task.totalMinutes <= 0) errors.push(`第 ${week.weekNumber} 週有不符合時間範圍的任務。`);
        if (!task.title.trim() || !task.date || !task.startTime) errors.push(`第 ${week.weekNumber} 週任務內容不完整。`);
      });
    });
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
  }

  saveDraft(account: Account, draft: PersonalGrowthPlanDraft): Account {
    return {
      ...account,
      personalGrowthDrafts: [draft, ...(account.personalGrowthDrafts ?? []).filter((item) => item.id !== draft.id && (!draft.continuationGoalId || item.continuationGoalId !== draft.continuationGoalId))],
      personalGrowthOnboardingDraft: draft.continuationGoalId ? account.personalGrowthOnboardingDraft : undefined,
    };
  }

  commit(account: Account, draft: PersonalGrowthPlanDraft, now: Date): { ok: true; value: Account; message: string } | { ok: false; message: string } {
    const validation = this.validatePlan(draft.submission, draft);
    if (!validation.ok) return { ok: false, message: `計畫尚未通過檢查：${validation.errors[0]}` };
    const startDate = draft.submission.startDate ?? dateKeyInZone(now, account.timezone);
    const scheduledDraft = {
      ...draft,
      submission: { ...draft.submission, startDate },
      weeks: draft.weeks.map((week) => ({
        ...week,
        tasks: week.tasks.map((task) => ({ ...task, date: task.date ?? dateForTask(startDate, week.weekNumber, task.weekday) })),
      })),
    };
    const goal: PersonalGrowthGoal = {
      id: ids('growth-goal', now.getTime()),
      title: draft.title,
      status: 'active',
      createdAt: draft.createdAt,
      committedAt: now.toISOString(),
      startDate,
      endDate: addDays(startDate, draft.cycleWeeks * 7 - 1),
      cycleWeeks: draft.cycleWeeks,
      classification: draft.classification,
      plan: { ...scheduledDraft, weeks: scheduledDraft.weeks.map((week) => ({ ...week, status: 'PLANNED', tasks: week.tasks.map((task) => ({ ...task, status: 'PLANNED' })) })) },
      weeklyReviews: [],
    };
    return {
      ok: true,
      value: { ...account, personalGrowthGoals: [goal, ...(account.personalGrowthGoals ?? [])], personalGrowthDrafts: (account.personalGrowthDrafts ?? []).filter((item) => item.id !== draft.id) },
      message: '個人成長計畫已確認並保存。',
    };
  }

  createContinuationFallbackPlan(goal: PersonalGrowthGoal, review: PersonalGrowthWeeklyReview, now: Date): PersonalGrowthPlanDraft {
    const submission = normalisePersonalGrowthSubmission(goal.plan.submission);
    const nextWeekNumber = goal.plan.weeks.length + 1;
    if (nextWeekNumber > goal.cycleWeeks) throw new Error('這個個人成長計畫已到最後一週。');
    const startDate = submission.startDate ?? goal.startDate;
    const week = buildWeek({ ...submission, startDate }, startDate, nextWeekNumber);
    return {
      id: ids('growth-week-draft', now.getTime()),
      schemaVersion: 'personal-growth-plan/v1',
      planVersion: goal.plan.planVersion + 1,
      status: 'DRAFT',
      createdAt: now.toISOString(),
      source: 'fallback',
      submission: { ...submission, startDate },
      classification: goal.classification,
      title: goal.title,
      summary: `第 ${nextWeekNumber} 週會根據你剛完成的回顧重新安排。`,
      goalSummary: goal.plan.goalSummary,
      feasibility: goal.plan.feasibility,
      coachingSummary: '先看真實完成情況，再安排下一個可完成的步驟。',
      reasoningSummary: '這是等待你確認的下一週草案；原本目標和期限不會自動改變。',
      milestones: [{ id: ids('milestone', nextWeekNumber), weekNumber: nextWeekNumber, title: `第 ${nextWeekNumber} 週下一步`, purpose: '依照本週回顧調整。', successSignal: '完成本週可驗證的成果。' }],
      weeks: [week],
      cycleWeeks: goal.cycleWeeks,
      weeklyMinutes: submission.weeklyMinutes,
      continuationGoalId: goal.id,
      weeklyReview: review,
    };
  }

  applyWeeklyDraft(account: Account, draft: PersonalGrowthPlanDraft): { ok: true; value: Account; message: string } | { ok: false; message: string } {
    const goalId = draft.continuationGoalId;
    const goal = account.personalGrowthGoals?.find((item) => item.id === goalId);
    const validation = this.validatePlan(draft.submission, draft);
    if (!goalId || !goal) return { ok: false, message: '找不到要更新的個人成長目標。' };
    if (goal.status !== 'active') return { ok: false, message: '只有進行中的個人成長目標可以建立下一週。' };
    if (!validation.ok) return { ok: false, message: `下一週草案尚未通過檢查：${validation.errors[0]}` };
    const expectedWeek = goal.plan.weeks.length + 1;
    const nextWeek = draft.weeks[0];
    if (nextWeek.weekNumber !== expectedWeek) return { ok: false, message: '下一週草案的週次不正確。' };
    if (!draft.weeklyReview || draft.weeklyReview.weekNumber !== expectedWeek - 1) return { ok: false, message: '請先完成本週回顧。' };
    const updatedGoal: PersonalGrowthGoal = {
      ...goal,
      plan: {
        ...goal.plan,
        planVersion: draft.planVersion,
        title: draft.title,
        summary: draft.summary,
        coachingSummary: draft.coachingSummary,
        reasoningSummary: draft.reasoningSummary,
        weeks: [
          ...goal.plan.weeks.map((week) => week.weekNumber === draft.weeklyReview?.weekNumber ? { ...week, status: 'COMPLETED' as const } : week),
          { ...nextWeek, status: 'PLANNED', tasks: nextWeek.tasks.map((task) => ({ ...task, status: 'PLANNED' as const })) },
        ],
      },
      weeklyReviews: [...goal.weeklyReviews, draft.weeklyReview],
    };
    return {
      ok: true,
      value: {
        ...account,
        personalGrowthGoals: (account.personalGrowthGoals ?? []).map((item) => item.id === goal.id ? updatedGoal : item),
        personalGrowthDrafts: (account.personalGrowthDrafts ?? []).filter((item) => item.id !== draft.id),
      },
      message: `第 ${expectedWeek} 週已根據你的回顧加入計畫。`,
    };
  }
}

export type RemotePersonalGrowthPlan = Pick<PersonalGrowthPlanDraft, 'title' | 'summary' | 'goalSummary' | 'feasibility' | 'coachingSummary' | 'reasoningSummary' | 'milestones' | 'weeks'>;
export type RemotePersonalGrowthWeeklyPlan = Pick<PersonalGrowthPlanDraft, 'title' | 'summary' | 'goalSummary' | 'feasibility' | 'coachingSummary' | 'reasoningSummary'> & { week: PersonalGrowthWeek };

/** Pure client-side merge seam for Gemini responses. */
export function mergeRemotePersonalGrowthPlan(remote: RemotePersonalGrowthPlan, fallback: PersonalGrowthPlanDraft, planVersion: number): PersonalGrowthPlanDraft | null {
  const candidate: PersonalGrowthPlanDraft = {
    ...fallback,
    id: fallback.id,
    planVersion,
    createdAt: new Date().toISOString(),
    source: 'gemini',
    title: remote.title,
    summary: remote.summary,
    goalSummary: remote.goalSummary,
    feasibility: remote.feasibility,
    coachingSummary: remote.coachingSummary,
    reasoningSummary: remote.reasoningSummary,
    milestones: remote.milestones,
    weeks: remote.weeks,
  };
  const scheduled = normalisePersonalGrowthPlanDraft(candidate, candidate.submission.startDate ?? candidate.createdAt.slice(0, 10));
  return new PersonalGrowthWorkflow().validatePlan(scheduled.submission, scheduled).ok ? scheduled : null;
}

/** Merges the one-week contract used for both the initial and adaptive plans. */
export function mergeRemotePersonalGrowthWeeklyPlan(remote: RemotePersonalGrowthWeeklyPlan, fallback: PersonalGrowthPlanDraft, planVersion: number): PersonalGrowthPlanDraft | null {
  const candidate: PersonalGrowthPlanDraft = {
    ...fallback,
    id: fallback.id,
    planVersion,
    createdAt: new Date().toISOString(),
    source: 'gemini',
    title: remote.title,
    summary: remote.summary,
    goalSummary: remote.goalSummary,
    feasibility: remote.feasibility,
    coachingSummary: remote.coachingSummary,
    reasoningSummary: remote.reasoningSummary,
    milestones: [{ id: ids('milestone', remote.week.weekNumber), weekNumber: remote.week.weekNumber, title: `第 ${remote.week.weekNumber} 週重點`, purpose: remote.week.focus, successSignal: '完成本週任務並留下回顧。' }],
    weeks: [remote.week],
  };
  const scheduled = normalisePersonalGrowthPlanDraft(candidate, candidate.submission.startDate ?? candidate.createdAt.slice(0, 10));
  return new PersonalGrowthWorkflow().validatePlan(scheduled.submission, scheduled).ok ? scheduled : null;
}
