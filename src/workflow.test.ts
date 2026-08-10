import assert from 'node:assert/strict';
import test from 'node:test';

import { Account, defaultAssessment } from './domain';
import { minutesUntilSecondPhoto } from './time';
import { RunningCommitmentWorkflow } from './workflow';

const workflow = new RunningCommitmentWorkflow();

function account(): Account {
  return {
    id: 'account-1',
    email: 'runner@example.com',
    timezone: 'Asia/Hong_Kong',
    photoAnalysisConsent: false,
    notificationPermission: 'undetermined',
    drafts: [],
    goals: [],
  };
}

function committedAt(iso = '2026-08-10T01:00:00.000Z') {
  const draft = workflow.createDraft({ ...defaultAssessment, availableDays: [1] }, new Date(iso));
  const result = workflow.commit(account(), draft, new Date(iso));
  assert.equal(result.ok, true);
  return result.ok ? result.value : account();
}

test('安全警示會阻止建立承諾', () => {
  const now = new Date('2026-08-10T01:00:00.000Z');
  const draft = workflow.createDraft({ ...defaultAssessment, hasChestPain: true }, now);
  assert.equal(draft.safetyBlocked, true);
  assert.equal(workflow.commit(account(), draft, now).ok, false);
});

test('明確承諾後建立八週日期與唯一進行中目標', () => {
  const current = committedAt();
  assert.equal(current.goals.length, 1);
  assert.equal(current.goals[0].status, 'active');
  assert.equal(current.goals[0].records.length, 8);

  const another = workflow.createDraft(defaultAssessment, new Date('2026-08-10T02:00:00.000Z'));
  const duplicate = workflow.commit(current, another, new Date('2026-08-10T02:00:00.000Z'));
  assert.equal(duplicate.ok, false);
});

test('第二張相片必須相隔十五分鐘並在同一曆日', () => {
  const current = committedAt();
  const goalId = current.goals[0].id;
  const first = workflow.checkIn(current, goalId, 'file://first.jpg', '你開始了。', 'fallback', new Date('2026-08-10T11:00:00.000Z'));
  assert.equal(first.ok, true);
  assert.equal(first.ok && first.value.goals[0].records[0].status, 'in_progress');
  if (!first.ok) return;

  const early = workflow.checkIn(first.value, goalId, 'file://early.jpg', '繼續。', 'fallback', new Date('2026-08-10T11:14:00.000Z'));
  assert.equal(early.ok, false);

  const completed = workflow.checkIn(first.value, goalId, 'file://second.jpg', '完成承諾。', 'fallback', new Date('2026-08-10T11:15:00.000Z'));
  assert.equal(completed.ok, true);
  assert.equal(completed.ok && completed.value.goals[0].records[0].status, 'completed');
});

test('尚未上傳第一張相片時不應啟動十五分鐘等待', () => {
  const now = new Date('2026-08-10T11:00:00.000Z');
  assert.equal(minutesUntilSecondPhoto(undefined, now), 0);
  assert.equal(minutesUntilSecondPhoto('2026-08-10T10:59:00.000Z', now), 14);
  assert.equal(minutesUntilSecondPhoto('2026-08-10T10:45:00.000Z', now), 0);
});

test('23:45 後不能開始當日打卡', () => {
  const current = committedAt();
  const result = workflow.checkIn(current, current.goals[0].id, 'file://late.jpg', '開始。', 'fallback', new Date('2026-08-10T15:46:00.000Z'));
  assert.equal(result.ok, false);
  assert.match(result.message, /23:45/);
});

test('跨過午夜會把未完成跑步日標記缺席並保留補救事件', () => {
  const current = committedAt();
  const settled = workflow.settleAbsences(current, new Date('2026-08-10T16:01:00.000Z'));
  assert.equal(settled.goals[0].records[0].status, 'absent');
  const recovered = workflow.recoverAbsence(settled, settled.goals[0].id, '2026-08-10', 'skip', '身體不適，今天休息。', undefined, new Date('2026-08-11T01:00:00.000Z'));
  assert.equal(recovered.ok, true);
  assert.equal(recovered.ok && recovered.value.goals[0].records[0].status, 'absent');
  assert.equal(recovered.ok && recovered.value.goals[0].records[0].recovery?.type, 'skip');
});

test('修改計畫必須有原因且從下一週生效', () => {
  const current = committedAt();
  const noReason = workflow.revise(current, current.goals[0].id, [2, 4], 25, '新節奏', '', new Date('2026-08-11T01:00:00.000Z'));
  assert.equal(noReason.ok, false);
  const revised = workflow.revise(current, current.goals[0].id, [2, 4], 25, '新節奏', '工作時間改變', new Date('2026-08-11T01:00:00.000Z'));
  assert.equal(revised.ok, true);
  assert.equal(revised.ok && revised.value.goals[0].planVersions[1].effectiveFrom, '2026-08-17');
  assert.equal(revised.ok && revised.value.goals[0].planVersions[1].version, 2);
  assert.equal(revised.ok && revised.value.goals[0].planVersions[0].supersededBy, revised.ok && revised.value.goals[0].planVersions[1].id);
  if (!revised.ok) return;
  const revisedWeeks = revised.value.goals[0].planVersions[1].weeks ?? [];
  const revisedTraining = revisedWeeks.flatMap((week) => week.sessions.filter((session) => session.type !== 'REST'));
  assert.ok(revisedTraining.length > 0);
  assert.ok(revisedTraining.every((session) => [2, 4].includes(session.weekday)));
  assert.ok(revisedTraining.every((session) => session.totalMinutes === 25));
});

test('暫停不可超過三十天且放棄必須填原因', () => {
  const current = committedAt();
  const goalId = current.goals[0].id;
  assert.equal(workflow.pause(current, goalId, '旅行', '2026-09-20', new Date('2026-08-10T01:00:00.000Z')).ok, false);
  const paused = workflow.pause(current, goalId, '旅行', '2026-08-20', new Date('2026-08-10T01:00:00.000Z'));
  assert.equal(paused.ok, true);
  assert.equal(paused.ok && paused.value.goals[0].status, 'paused');
  assert.equal(workflow.abandon(current, goalId, '', new Date()).ok, false);
});
