import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultGoalClassification, defaultOnboardingSubmission } from './domain';
import { goalActivities, lifeWheelCategories } from './life-wheel';
import { normaliseAccount, normaliseGoalClassification } from './storage';
import { InitialCoachingWorkflow } from './coaching';
import { RunningCommitmentWorkflow } from './workflow';

test('生命之輪包含八個指定類別，健康及個人成長是目前可用入口', () => {
  assert.deepEqual(lifeWheelCategories.map(([category]) => category), [
    'health', 'wealth', 'career', 'relationships', 'personal_growth', 'leisure', 'environment', 'meaning',
  ]);
  assert.equal(lifeWheelCategories[0][1], '健康（身心）');
  assert.ok(lifeWheelCategories.slice(1).every(([, title, description]) => title.length > 0 && description.length > 0));
});

test('運動目標包含現有及新增的運動類型', () => {
  assert.deepEqual(goalActivities, ['running', 'strength_training', 'swimming', 'cycling', 'walking', 'ball_sports', 'other']);
});

test('新建立的 onboarding 預設為健康、運動、跑步', () => {
  assert.deepEqual(defaultOnboardingSubmission.goal.classification, defaultGoalClassification);
});

test('舊資料沒有分類時會補上健康、運動、跑步', () => {
  assert.deepEqual(normaliseGoalClassification(undefined), defaultGoalClassification);
  const legacyAccount = {
    id: 'account-legacy',
    email: 'legacy@example.com',
    timezone: 'Asia/Hong_Kong',
    photoAnalysisConsent: false,
    notificationPermission: 'denied' as const,
    drafts: [],
    goals: [{ id: 'goal-legacy' }],
  } as never;
  const migrated = normaliseAccount(legacyAccount);
  assert.deepEqual(migrated.goals[0].classification, defaultGoalClassification);
});

test('分類會由 onboarding 草稿保存到已承諾目標', () => {
  const now = new Date('2026-08-10T01:00:00.000Z');
  const draft = new InitialCoachingWorkflow().createFallbackPlan(defaultOnboardingSubmission, now);
  assert.deepEqual(draft.classification, defaultGoalClassification);
  const result = new RunningCommitmentWorkflow().commit({
    id: 'account-classification', email: 'classification@example.com', timezone: 'Asia/Hong_Kong',
    photoAnalysisConsent: false, notificationPermission: 'denied', drafts: [draft], goals: [],
  }, draft, now);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.goals[0].classification, defaultGoalClassification);
});
