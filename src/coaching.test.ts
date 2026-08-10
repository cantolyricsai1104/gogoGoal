import assert from 'node:assert/strict';
import test from 'node:test';

import { Account, defaultOnboardingSubmission, OnboardingSubmission } from './domain';
import { InitialCoachingWorkflow } from './coaching';
import { RunningCommitmentWorkflow } from './workflow';

const coaching = new InitialCoachingWorkflow();

test('完整 onboarding 會產生可驗證、可理解的八週起始計畫', () => {
  const submission: OnboardingSubmission = {
    ...defaultOnboardingSubmission,
    goal: {
      ...defaultOnboardingSubmission.goal,
      primaryReason: 'health' as const,
      secondaryReasons: ['discipline'],
      desiredIdentityInThreeMonths: '成為每星期穩定跑步的人',
    },
    availability: {
      availableDays: [1, 3, 6],
      realisticFrequency: 3,
      timeByDay: { 1: '30_45', 3: '30_45', 6: '45_60' },
    },
  };

  const plan = coaching.createFallbackPlan(submission, new Date('2026-08-10T01:00:00.000Z'));
  const validation = coaching.validatePlan(submission, plan);
  const review = coaching.projectReview(plan);

  assert.deepEqual(validation, { ok: true, errors: [] });
  assert.equal(plan.weeks.length, 8);
  assert.deepEqual(plan.weeks.map((week) => week.status), Array(8).fill('DRAFT'));
  assert.deepEqual(plan.phases.flatMap((phase) => Array.from({ length: phase.endWeek - phase.startWeek + 1 }, (_, index) => phase.startWeek + index)), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(review.weeks[0].expandedByDefault, true);
  assert.equal(review.weeks[1].expandedByDefault, false);
  assert.ok(plan.weeks.every((week) => week.sessions.every((session) => session.instructions.length >= 3 && session.talkTest.length > 0 && session.easierFallback.length > 0)));
});

test('明確 commit 後只有第一週成為承諾，其餘週保持計畫狀態', () => {
  const submission: OnboardingSubmission = {
    ...defaultOnboardingSubmission,
    availability: {
      availableDays: [1, 3, 6],
      realisticFrequency: 3,
      timeByDay: { 1: '30_45', 3: '30_45', 6: '45_60' },
    },
  };
  const now = new Date('2026-08-10T01:00:00.000Z');
  const draft = coaching.createFallbackPlan(submission, now);
  const account: Account = {
    id: 'account-1',
    email: 'runner@example.com',
    timezone: 'Asia/Hong_Kong',
    photoAnalysisConsent: false,
    notificationPermission: 'denied',
    drafts: [draft],
    goals: [],
  };

  assert.equal(account.goals.length, 0);
  const result = new RunningCommitmentWorkflow().commit(account, draft, now);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const version = result.value.goals[0].planVersions[0];
  assert.equal(version.version, 1);
  assert.equal(version.status, 'COMMITTED');
  assert.deepEqual(version.weeks?.map((week) => week.status), ['COMMITTED', 'PLANNED', 'PLANNED', 'PLANNED', 'PLANNED', 'PLANNED', 'PLANNED', 'PLANNED']);
  assert.equal(result.value.drafts.length, 0);
});

test('安全訊號或未成年資料不能成為可承諾計畫', () => {
  const underAge = {
    ...defaultOnboardingSubmission,
    ability: { ...defaultOnboardingSubmission.ability, ageRange: 'under_18' as const },
  };
  const unsafe = {
    ...defaultOnboardingSubmission,
    safety: { ...defaultOnboardingSubmission.safety, hasChestPain: true },
  };

  assert.equal(coaching.validateSubmission(underAge).ok, false);
  assert.match(coaching.validateSubmission(underAge).errors.join(' '), /18 歲/);
  assert.equal(coaching.validateSubmission(unsafe).ok, false);
  assert.match(coaching.validateSubmission(unsafe).errors.join(' '), /安全篩查/);
});

test('Exact 最近跑步與固定跑步經驗必須保存可信資料', () => {
  const invalidExact: OnboardingSubmission = {
    ...defaultOnboardingSubmission,
    ability: {
      ...defaultOnboardingSubmission.ability,
      recentRunningFrequency: 'once_weekly',
      recentRun: { confidence: 'EXACT', distanceKm: 0, durationMinutes: 0, rpe: 11 },
      hadRunningHabit: true,
    },
  };

  const result = coaching.validateSubmission(invalidExact);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /距離/);
  assert.match(result.errors.join(' '), /時間/);
  assert.match(result.errors.join(' '), /RPE/);
  assert.match(result.errors.join(' '), /維持期間/);
});

test('比賽可行性會同時考慮距離、日期與目前能力', () => {
  const baseRace: OnboardingSubmission = {
    ...defaultOnboardingSubmission,
    goal: { primaryReason: 'race', secondaryReasons: [], raceDistance: '5k', targetDate: '2026-08-16' },
  };
  const soon = coaching.createFallbackPlan(baseRace, new Date('2026-08-10T01:00:00.000Z'));
  const enoughTime = coaching.createFallbackPlan({ ...baseRace, goal: { ...baseRace.goal, targetDate: '2026-11-10' } }, new Date('2026-08-10T01:00:00.000Z'));

  assert.equal(soon.feasibility.status, 'ADJUSTED');
  assert.match(soon.feasibility.message, /時間|階段/);
  assert.equal(enoughTime.feasibility.status, 'REALISTIC');
});

test('AI 計畫不能使用不可用日期或超過當日時間', () => {
  const submission: OnboardingSubmission = {
    ...defaultOnboardingSubmission,
    availability: { availableDays: [1, 3, 6], realisticFrequency: 3, timeByDay: { 1: '20_30', 3: '30_45', 6: '45_60' } },
  };
  const valid = coaching.createFallbackPlan(submission, new Date('2026-08-10T01:00:00.000Z'));
  const unavailable = structuredClone(valid);
  unavailable.weeks[0].sessions[0].weekday = 2;
  const tooLong = structuredClone(valid);
  tooLong.weeks[0].sessions[0].totalMinutes = 31;
  const preCommitted = structuredClone(valid);
  preCommitted.weeks[0].status = 'COMMITTED';

  assert.match(coaching.validatePlan(submission, unavailable).errors.join(' '), /不可用日期/);
  assert.match(coaching.validatePlan(submission, tooLong).errors.join(' '), /時間不符合限制/);
  assert.match(coaching.validatePlan(submission, preCommitted).errors.join(' '), /草案狀態/);
});

test('計畫調整比較會列出第一週次數、分鐘、日子及課堂差異', () => {
  const before = coaching.createFallbackPlan(defaultOnboardingSubmission, new Date('2026-08-10T01:00:00.000Z'));
  const after = structuredClone(before);
  after.weekdays = [1, 3];
  after.weeks[0].sessions = after.weeks[0].sessions.slice(0, 2);
  after.weeks[0].sessions[0].totalMinutes -= 5;
  after.weeks[0].sessions[0].title = '更輕鬆的跑走 20 分鐘';
  after.weeks[0].estimatedTotalMinutes = after.weeks[0].sessions.reduce((total, session) => total + session.totalMinutes, 0);
  after.weeks[7].sessions[0].title = '第八週調整後的輕鬆跑走';

  const difference = coaching.comparePlans(before, after);

  assert.deepEqual(difference.frequency, { before: 3, after: 2 });
  assert.deepEqual(difference.trainingDays, { before: [1, 3, 6], after: [1, 3] });
  assert.notEqual(difference.totalMinutes.before, difference.totalMinutes.after);
  assert.ok(difference.sessionChanges.length >= 1);
  assert.ok(difference.sessionChanges.some((change) => change.includes('第 8 週')));
});

test('正式日曆紀錄只來自每週實際計畫課堂，不會把所有建議日填滿八週', () => {
  const now = new Date('2026-08-10T01:00:00.000Z');
  const draft = coaching.createFallbackPlan(defaultOnboardingSubmission, now);
  draft.weeks[1].sessions = draft.weeks[1].sessions.slice(0, 2);
  draft.weeks[1].estimatedTotalMinutes = draft.weeks[1].sessions.reduce((total, session) => total + session.totalMinutes, 0);
  const account: Account = {
    id: 'account-1', email: 'runner@example.com', timezone: 'Asia/Hong_Kong', photoAnalysisConsent: false,
    notificationPermission: 'denied', drafts: [draft], goals: [],
  };

  const result = new RunningCommitmentWorkflow().commit(account, draft, now);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  const expectedSessions = draft.weeks.reduce((total, week) => total + week.sessions.filter((session) => session.type !== 'REST').length, 0);
  assert.equal(result.value.goals[0].records.length, expectedSessions);
  assert.ok(result.value.goals[0].records.some((record) => record.note?.includes('輕鬆')));
});

test('新的或修訂後的 Initial Plan 會取代舊 Draft，不留下可再次承諾的過期草案', () => {
  const first = coaching.createFallbackPlan(defaultOnboardingSubmission, new Date('2026-08-10T01:00:00.000Z'));
  const second = coaching.createFallbackPlan(defaultOnboardingSubmission, new Date('2026-08-10T02:00:00.000Z'));
  const account: Account = {
    id: 'account-1', email: 'runner@example.com', timezone: 'Asia/Hong_Kong', photoAnalysisConsent: false,
    notificationPermission: 'denied', drafts: [first], goals: [],
  };

  const saved = new RunningCommitmentWorkflow().saveDraft(account, second);

  assert.deepEqual(saved.drafts.map((draft) => draft.id), [second.id]);
});
