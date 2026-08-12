import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultPersonalGrowthSubmission, Weekday } from './domain';
import { PersonalGrowthWorkflow, hasCompleteTemplateAnswers, mergeRemotePersonalGrowthPlan, normalisePersonalGrowthSubmission, personalGrowthFocusOptions, personalGrowthTemplates, preparePersonalGrowthSubmission } from './personal-growth';
import { normaliseAccount } from './storage';

const validSubmission = {
  ...defaultPersonalGrowthSubmission,
  focus: { primary: 'new_skill' as const, secondary: [] },
  outcome: '完成一個可以展示的小工具',
  successDefinition: '有一個可以運作並能向朋友展示的作品',
};

test('個人成長 fallback 會按方向、時間及週期產生可驗證草案', () => {
  const workflow = new PersonalGrowthWorkflow();
  const draft = workflow.createFallbackPlan(validSubmission, new Date('2026-08-11T00:00:00.000Z'));
  assert.equal(draft.classification.category, 'personal_growth');
  assert.equal(draft.weeks.length, 1);
  assert.equal(draft.weeks[0].weekNumber, 1);
  assert.equal(workflow.validatePlan(validSubmission, draft).ok, true);
  assert.ok(draft.weeks.every((week) => week.tasks.every((task) => task.instructions.length >= 3 && task.completionCriteria.length > 0)));
});

test('舊草稿選了日期但缺少時間區間時會補上可用預設，下一步不會被錯誤阻擋', () => {
  const legacy = {
    ...validSubmission,
    availableDays: [1, 3] as Weekday[],
    timeByDay: {},
  };
  const normalised = normalisePersonalGrowthSubmission(legacy);
  assert.equal(normalised.timeByDay[1], '30_45');
  assert.equal(normalised.timeByDay[3], '30_45');
  assert.equal(new PersonalGrowthWorkflow().validateSubmission(normalised).ok, true);
});

test('個人成長只保留一個主要方向，舊有支援方向不會延續到新計畫', () => {
  const workflow = new PersonalGrowthWorkflow();
  const draft = workflow.createFallbackPlan({
    ...validSubmission,
    focus: { primary: 'language_learning', secondary: ['reading_knowledge', 'mindset', 'creative_expression'] },
  }, new Date('2026-08-11T00:00:00.000Z'));
  assert.equal(draft.submission.focus.primary, 'language_learning');
  assert.deepEqual(draft.submission.focus.secondary, []);
  assert.equal(personalGrowthFocusOptions.length, 9);
});

test('確認個人成長草案後會保存 goal，且不需要日曆欄位', () => {
  const workflow = new PersonalGrowthWorkflow();
  const now = new Date('2026-08-11T00:00:00.000Z');
  const draft = workflow.createFallbackPlan(validSubmission, now);
  const result = workflow.commit({
    id: 'growth-account', email: 'growth@example.com', timezone: 'Asia/Hong_Kong',
    photoAnalysisConsent: false, notificationPermission: 'denied', drafts: [], goals: [], personalGrowthDrafts: [draft], personalGrowthGoals: [],
  }, draft, now);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.personalGrowthGoals?.[0].classification.subcategory, 'growth');
    assert.equal(result.value.personalGrowthDrafts?.length, 0);
    assert.equal('calendar' in result.value.personalGrowthGoals?.[0], false);
  }
});

test('完成本週回顧後只會建立下一週草案，確認後才寫入目標歷史', () => {
  const workflow = new PersonalGrowthWorkflow();
  const now = new Date('2026-08-11T00:00:00.000Z');
  const firstDraft = workflow.createFallbackPlan(validSubmission, now);
  const account = {
    id: 'adaptive-growth', email: 'adaptive@example.com', timezone: 'Asia/Hong_Kong',
    photoAnalysisConsent: false, notificationPermission: 'denied' as const,
    drafts: [], goals: [], personalGrowthDrafts: [firstDraft], personalGrowthGoals: [],
  };
  const committed = workflow.commit(account, firstDraft, now);
  assert.equal(committed.ok, true);
  if (!committed.ok) return;

  const currentGoal = committed.value.personalGrowthGoals?.[0];
  assert.ok(currentGoal);
  if (!currentGoal) return;
  const completedGoal = {
    ...currentGoal,
    plan: {
      ...currentGoal.plan,
      weeks: currentGoal.plan.weeks.map((week) => ({ ...week, tasks: week.tasks.map((task) => ({ ...task, status: 'COMPLETED' as const })) })),
    },
  };
  const review = {
    id: 'review-1', weekNumber: 1, createdAt: '2026-08-18T00:00:00.000Z', actualMinutes: 80,
    difficulty: 'suitable' as const, obstacle: '工作臨時延長。', evidence: '完成練習紀錄與小作品草稿。', confidence: 4 as const,
  };
  const nextDraft = workflow.createContinuationFallbackPlan(completedGoal, review, new Date('2026-08-18T00:00:00.000Z'));
  assert.equal(nextDraft.weeks.length, 1);
  assert.equal(nextDraft.weeks[0].weekNumber, 2);
  assert.equal(nextDraft.continuationGoalId, currentGoal.id);

  const applied = workflow.applyWeeklyDraft({ ...committed.value, personalGrowthGoals: [completedGoal], personalGrowthDrafts: [nextDraft] }, nextDraft);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  const updated = applied.value.personalGrowthGoals?.[0];
  assert.equal(updated?.plan.weeks.length, 2);
  assert.deepEqual(updated?.plan.weeks.map((week) => week.status), ['COMPLETED', 'PLANNED']);
  assert.equal(updated?.weeklyReviews.length, 1);
  assert.equal(updated?.plan.goalSummary, currentGoal.plan.goalSummary);
});

test('舊帳戶沒有個人成長資料時會安全補上空陣列', () => {
  const migrated = normaliseAccount({
    id: 'legacy-growth', email: 'legacy@example.com', timezone: 'Asia/Hong_Kong', photoAnalysisConsent: false,
    notificationPermission: 'denied', drafts: [], goals: [],
  });
  assert.deepEqual(migrated.personalGrowthDrafts, []);
  assert.deepEqual(migrated.personalGrowthGoals, []);
});

test('舊五步個人成長草稿會遷移到移除方向步驟後的四步流程', () => {
  const migrated = normaliseAccount({
    id: 'legacy-growth-step', email: 'legacy-step@example.com', timezone: 'Asia/Hong_Kong', photoAnalysisConsent: false,
    notificationPermission: 'denied', drafts: [], goals: [],
    personalGrowthOnboardingDraft: {
      currentStep: 4 as never,
      submission: defaultPersonalGrowthSubmission,
      updatedAt: '2026-08-11T00:00:00.000Z',
    },
  });
  assert.equal(migrated.personalGrowthOnboardingDraft?.currentStep, 3);
});

test('八個成長方向都有三至五條選擇式模板題目，並可用其他補充答案', () => {
  assert.equal(Object.keys(personalGrowthTemplates).length, 8);
  Object.values(personalGrowthTemplates).forEach((questions) => {
    assert.ok(questions.length >= 3 && questions.length <= 5);
    assert.ok(questions.every((question) => question.options.some(([value]) => value === 'other')));
  });
  const submission = {
    ...validSubmission,
    startDate: '2026-08-11',
    templateAnswers: { language: 'english', language_context: 'other', language_level: 'basic', language_skill: 'listen_speak' },
    templateOtherAnswers: { language_context: '與海外同事溝通' },
    focus: { primary: 'language_learning' as const, secondary: [] },
  };
  assert.equal(hasCompleteTemplateAnswers(submission), true);
  const prepared = preparePersonalGrowthSubmission(submission);
  assert.match(prepared.outcome, /語言學習/);
  assert.match(prepared.currentSituation ?? '', /海外同事/);
});

test('模板第二部分支援多選答案，並會保留在生成摘要', () => {
  const submission = {
    ...validSubmission,
    focus: { primary: 'focus_time' as const, secondary: [] },
    templateAnswers: {
      focus_problem: ['phone', 'interruptions'],
      focus_context: ['work', 'project'],
      focus_time: ['evening'],
      focus_habit: ['list', 'other'],
    },
    templateOtherAnswers: { focus_habit: '用紙筆記錄' },
  };
  assert.equal(hasCompleteTemplateAnswers(submission), true);
  const prepared = preparePersonalGrowthSubmission(submission);
  assert.match(prepared.currentSituation ?? '', /手機分心、經常被打斷/);
  assert.match(prepared.currentSituation ?? '', /用紙筆記錄/);
});

test('個人成長排程支援其他週期、開始日及開始時間', () => {
  const workflow = new PersonalGrowthWorkflow();
  const submission = normalisePersonalGrowthSubmission({
    ...validSubmission,
    cycleWeeks: 16,
    startDate: '2026-09-01',
    preferredTimeSlot: 'other',
    preferredStartTime: '10:30',
  });
  const draft = workflow.createFallbackPlan(submission, new Date('2026-08-12T00:00:00.000Z'));
  assert.equal(draft.cycleWeeks, 16);
  assert.equal(draft.weeks.length, 1);
  assert.equal(draft.weeks[0].weekNumber, 1);
  assert.equal(draft.weeks[0].tasks[0].startTime, '10:30');
  assert.equal(draft.submission.startDate, '2026-09-01');
});

test('個人成長排程支援其他每週及每日投入時間', () => {
  const workflow = new PersonalGrowthWorkflow();
  const submission = normalisePersonalGrowthSubmission({
    ...validSubmission,
    weeklyMinutes: 600,
    timeByDay: { 2: 'other', 4: '30_45', 6: '45_60' },
    timeByDayCustom: { 2: 500 },
  });
  const draft = workflow.createFallbackPlan(submission, new Date('2026-08-12T00:00:00.000Z'));
  assert.equal(draft.submission.timeByDay[2], 'other');
  assert.equal(draft.submission.timeByDayCustom?.[2], 500);
  assert.equal(draft.weeks[0].tasks.find((task) => task.weekday === 2)?.totalMinutes, 200);
});

test('選擇開始日會為草稿安排可編輯日期，且多個個人成長計畫可同時確認', () => {
  const workflow = new PersonalGrowthWorkflow();
  const submission = { ...validSubmission, startDate: '2026-08-11' };
  const first = workflow.createFallbackPlan(submission, new Date('2026-08-11T00:00:00.000Z'));
  assert.ok(first.weeks.every((week) => week.tasks.every((task) => task.date && task.startTime)));
  const account = { id: 'growth-many', email: 'many@example.com', timezone: 'Asia/Hong_Kong', photoAnalysisConsent: false, notificationPermission: 'denied' as const, drafts: [], goals: [], personalGrowthDrafts: [first], personalGrowthGoals: [] };
  const one = workflow.commit(account, first, new Date('2026-08-11T00:00:00.000Z'));
  assert.equal(one.ok, true);
  if (!one.ok) return;
  const second = workflow.createFallbackPlan({ ...submission, focus: { primary: 'reading_knowledge', secondary: [] } }, new Date('2026-08-12T00:00:00.000Z'));
  const two = workflow.commit({ ...one.value, personalGrowthDrafts: [second] }, second, new Date('2026-08-12T00:00:00.000Z'));
  assert.equal(two.ok, true);
  if (two.ok) assert.equal(two.value.personalGrowthGoals?.length, 2);
});

test('Gemini 只回傳星期和時間時，合併草稿仍需要補上選定開始日的日期', () => {
  const workflow = new PersonalGrowthWorkflow();
  const fallback = workflow.createFallbackPlan({ ...validSubmission, startDate: '2026-08-11' }, new Date('2026-08-11T00:00:00.000Z'));
  const serverResponse = { ...fallback, weeks: fallback.weeks.map((week) => ({ ...week, tasks: week.tasks.map(({ date: _date, ...task }) => task) })) };
  const merged = mergeRemotePersonalGrowthPlan(serverResponse, fallback, 1);
  assert.ok(merged);
  assert.ok(merged?.weeks.every((week) => week.tasks.every((task) => Boolean(task.date))));
});
