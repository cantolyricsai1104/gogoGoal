import {
  Account,
  CheckInPhoto,
  defaultGoalClassification,
  GoalEvent,
  PlanWeek,
  RecoveryType,
  RunRecord,
  RunningAssessment,
  RunningGoal,
  RunningPlanDraft,
  RunningPlanVersion,
  Weekday,
} from './domain';
import { addDays, dateKeyInZone, minutesInZone, nextMonday, weekdayForDateKey } from './time';
import { InitialCoachingWorkflow, onboardingFromLegacyAssessment } from './coaching';

export type WorkflowResult<T> = { ok: true; value: T; message: string } | { ok: false; message: string };

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const event = (type: GoalEvent['type'], message: string, now: Date): GoalEvent => ({ id: id('event'), at: now.toISOString(), type, message });

function hasSafetyRisk(assessment: RunningAssessment): boolean {
  return assessment.hasChestPain
    || assessment.hasDizziness
    || assessment.hasHeartOrLungCondition
    || assessment.hasJointProblem
    || assessment.hasMedicalRestriction;
}

function planSummary(assessment: RunningAssessment): string {
  const frequency = assessment.availableDays.length;
  return `先以跑走交替建立節奏：每週 ${frequency} 天，每次約 ${assessment.minutesPerRun} 分鐘。保持能說完整句子的強度，若出現不適便停止。`;
}

function recordsBetween(startDate: string, endDate: string, weekdays: Weekday[]): RunRecord[] {
  const records: RunRecord[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    if (weekdays.includes(weekdayForDateKey(cursor))) {
      records.push({ id: id('run'), date: cursor, status: 'planned', photos: [] });
    }
  }
  return records;
}

function recordsFromInitialPlan(startDate: string, endDate: string, weeks: PlanWeek[]): RunRecord[] {
  const records = new Map<string, RunRecord>();
  for (const week of weeks) {
    const weekStart = addDays(startDate, (week.weekNumber - 1) * 7);
    const weekStartDay = weekdayForDateKey(weekStart);
    for (const session of week.sessions) {
      if (session.type === 'REST') continue;
      const offset = (session.weekday - weekStartDay + 7) % 7;
      const date = addDays(weekStart, offset);
      if (date > endDate) continue;
      records.set(date, { id: id('run'), date, status: 'planned', photos: [], note: session.title });
    }
  }
  return [...records.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function revisePlanWeeks(weeks: PlanWeek[] | undefined, weekdays: Weekday[], minutesPerRun: number): PlanWeek[] | undefined {
  if (!weeks) return undefined;
  const sortedDays = [...weekdays].sort((left, right) => left - right);
  return weeks.map((week) => {
    const templates = week.sessions.filter((session) => session.type !== 'REST');
    if (!templates.length) return week;
    const sessions = sortedDays.map((weekday, index) => {
      const template = templates[Math.min(index, templates.length - 1)];
      const type = index === sortedDays.length - 1 && sortedDays.length > 1 ? 'LONG_EASY_RUN' as const : template.type;
      const activeMinutes = Math.max(5, minutesPerRun - 10);
      const instructions = type === 'RUN_WALK'
        ? ['先快步行 5 分鐘熱身。', `在餘下約 ${activeMinutes} 分鐘內，以舒服的慢跑和步行交替完成，不追速度。`, '最後慢步行至呼吸平穩。']
        : ['先快步行 5 分鐘熱身。', `以能說完整句子的速度完成約 ${activeMinutes} 分鐘；需要時可加入步行。`, '最後慢步行至呼吸平穩。'];
      return {
        ...template,
        id: id(`week-${week.weekNumber}-session`),
        weekday,
        type,
        title: `${type === 'LONG_EASY_RUN' ? '較長的輕鬆跑走' : type === 'RUN_WALK' ? '輕鬆跑走交替' : '舒服連續慢跑'} ${minutesPerRun} 分鐘`,
        totalMinutes: minutesPerRun,
        instructions,
        easierFallback: `把總時間縮短至 ${Math.max(10, minutesPerRun - 10)} 分鐘，並增加步行段落。`,
      };
    });
    return { ...week, sessions, estimatedTotalMinutes: sessions.reduce((total, session) => total + session.totalMinutes, 0) };
  });
}

function mapGoal(account: Account, goalId: string, updater: (goal: RunningGoal) => RunningGoal): Account | null {
  const goal = account.goals.find((item) => item.id === goalId);
  if (!goal) return null;
  return { ...account, goals: account.goals.map((item) => item.id === goalId ? updater(item) : item) };
}

export class RunningCommitmentWorkflow {
  createDraft(assessment: RunningAssessment, now: Date): RunningPlanDraft {
    const plan = new InitialCoachingWorkflow().createFallbackPlan(onboardingFromLegacyAssessment(assessment), now);
    return {
      ...plan,
      id: id('draft'),
      assessment,
      title: '建立穩定跑步習慣',
      summary: hasSafetyRisk(assessment)
        ? '你的安全篩查出現需要注意的項目。請先諮詢醫生或合資格專業人士，再建立跑步承諾。'
        : planSummary(assessment),
      minutesPerRun: assessment.minutesPerRun,
    };
  }

  saveDraft(account: Account, draft: RunningPlanDraft): Account {
    return { ...account, drafts: [draft] };
  }

  commit(account: Account, draft: RunningPlanDraft, now: Date): WorkflowResult<Account> {
    if (draft.safetyBlocked) return { ok: false, message: '安全篩查尚未通過，不能建立跑步承諾。' };
    const planValidation = new InitialCoachingWorkflow().validatePlan(draft.submission, draft);
    if (!planValidation.ok) return { ok: false, message: `計畫尚未通過安全驗證：${planValidation.errors[0]}` };
    if (account.goals.some((goal) => goal.status === 'active' || goal.status === 'paused')) {
      return { ok: false, message: '你已有一個進行中的 Running 目標。請先處理原有承諾。' };
    }
    if (!draft.weekdays.length) return { ok: false, message: '請至少選擇一個跑步日。' };
    const startDate = dateKeyInZone(now, account.timezone);
    const endDate = addDays(startDate, draft.cycleWeeks * 7 - 1);
    const committedWeeks = draft.weeks.map((week) => ({
      ...week,
      status: week.weekNumber === 1 ? 'COMMITTED' as const : 'PLANNED' as const,
      sessions: week.sessions.map((session) => ({
        ...session,
        status: week.weekNumber === 1 ? 'COMMITTED' as const : 'PLANNED' as const,
      })),
    }));
    const version: RunningPlanVersion = {
      id: id('plan'),
      schemaVersion: draft.schemaVersion,
      version: draft.planVersion,
      status: 'COMMITTED',
      createdAt: now.toISOString(),
      committedAt: now.toISOString(),
      effectiveFrom: startDate,
      source: draft.source,
      weekdays: draft.weekdays,
      minutesPerRun: draft.minutesPerRun,
      summary: draft.summary,
      reason: '首次承諾',
      goalSummary: draft.goalSummary,
      coachingSummary: draft.coachingSummary,
      reasoningSummary: draft.reasoningSummary,
      phases: draft.phases,
      weeks: committedWeeks,
    };
    const goal: RunningGoal = {
      id: id('goal'),
      title: draft.title,
      classification: draft.classification ?? draft.submission.goal.classification ?? { ...defaultGoalClassification },
      status: 'active',
      createdAt: draft.createdAt,
      committedAt: now.toISOString(),
      startDate,
      endDate,
      cycleWeeks: draft.cycleWeeks,
      targetRate: draft.targetRate,
      planVersions: [version],
      records: recordsFromInitialPlan(startDate, endDate, committedWeeks),
      events: [event('committed', `已承諾 ${draft.cycleWeeks} 週跑步計畫，目標完成率 ${Math.round(draft.targetRate * 100)}%。`, now)],
    };
    return {
      ok: true,
      value: { ...account, goals: [goal, ...account.goals], drafts: account.drafts.filter((item) => item.id !== draft.id) },
      message: '跑步承諾已啟動。',
    };
  }

  checkIn(account: Account, goalId: string, uri: string, encouragement: string, analysis: CheckInPhoto['analysis'], now: Date): WorkflowResult<Account> {
    const goal = account.goals.find((item) => item.id === goalId);
    if (!goal || goal.status !== 'active') return { ok: false, message: '目前沒有可打卡的進行中目標。' };
    const today = dateKeyInZone(now, account.timezone);
    const record = goal.records.find((item) => item.date === today);
    if (!record) return { ok: false, message: '今天不是計畫中的跑步日。' };
    if (record.status === 'completed') return { ok: false, message: '今天的兩次打卡已完成。' };
    if (record.status === 'absent' || record.status === 'skipped') return { ok: false, message: '今天的紀錄已結算，不能新增相片。' };
    if (!record.photos.length && minutesInZone(now, account.timezone) > 23 * 60 + 45) {
      return { ok: false, message: '已超過 23:45，今天沒有足夠時間完成兩次打卡。' };
    }
    if (record.photos.length === 1) {
      const elapsed = now.getTime() - new Date(record.photos[0].uploadedAt).getTime();
      if (elapsed < 15 * 60_000) {
        const remaining = Math.ceil((15 * 60_000 - elapsed) / 60_000);
        return { ok: false, message: `第二張相片還需等待 ${remaining} 分鐘。` };
      }
      if (dateKeyInZone(new Date(record.photos[0].uploadedAt), account.timezone) !== today) {
        return { ok: false, message: '兩張相片必須在同一個曆日上傳。' };
      }
    }
    const photo: CheckInPhoto = { id: id('photo'), uri, uploadedAt: now.toISOString(), encouragement, analysis };
    const updated = mapGoal(account, goalId, (item) => ({
      ...item,
      records: item.records.map((entry) => entry.id === record.id ? {
        ...entry,
        photos: [...entry.photos, photo],
        status: entry.photos.length === 1 ? 'completed' : 'in_progress',
      } : entry),
      events: [
        ...item.events,
        event(record.photos.length === 1 ? 'completed_run' : 'check_in', record.photos.length === 1 ? '完成今天的雙相片跑步打卡。' : '已上傳第一張跑步打卡相片。', now),
      ],
    }));
    return updated ? { ok: true, value: updated, message: record.photos.length === 1 ? '今天的跑步已完成。' : '第一張已記錄，15 分鐘後可上傳第二張。' } : { ok: false, message: '找不到目標。' };
  }

  settleAbsences(account: Account, now: Date): Account {
    const today = dateKeyInZone(now, account.timezone);
    return {
      ...account,
      goals: account.goals.map((goal) => {
        if (goal.status !== 'active') return goal;
        const newlyAbsent = goal.records.filter((record) => record.date < today && (record.status === 'planned' || record.status === 'in_progress'));
        if (!newlyAbsent.length) return goal;
        const absentIds = new Set(newlyAbsent.map((record) => record.id));
        return {
          ...goal,
          records: goal.records.map((record) => absentIds.has(record.id) ? { ...record, status: 'absent' } : record),
          events: [...goal.events, ...newlyAbsent.map((record) => event('absent', `${record.date} 未完成跑步承諾，已標記缺席。`, now))],
        };
      }),
    };
  }

  removePhoto(account: Account, goalId: string, date: string, photoId: string): WorkflowResult<Account> {
    const goal = account.goals.find((item) => item.id === goalId);
    const record = goal?.records.find((item) => item.date === date);
    if (!goal || !record || !record.photos.some((photo) => photo.id === photoId)) return { ok: false, message: '找不到這張相片。' };
    const updated = mapGoal(account, goalId, (item) => ({
      ...item,
      records: item.records.map((entry) => {
        if (entry.id !== record.id) return entry;
        const photos = entry.photos.filter((photo) => photo.id !== photoId);
        return {
          ...entry,
          photos,
          status: entry.status === 'completed' ? 'completed' : photos.length ? 'in_progress' : 'planned',
          note: entry.status === 'completed' ? '原始相片已由使用者刪除；完成文字紀錄保留。' : entry.note,
        };
      }),
    }));
    return updated ? { ok: true, value: updated, message: '相片已刪除；完成與缺席文字紀錄不受影響。' } : { ok: false, message: '找不到目標。' };
  }

  recoverAbsence(account: Account, goalId: string, date: string, type: RecoveryType, reason: string, rescheduledDate: string | undefined, now: Date): WorkflowResult<Account> {
    if (!reason.trim()) return { ok: false, message: '請填寫處理缺席的原因。' };
    const goal = account.goals.find((item) => item.id === goalId);
    const record = goal?.records.find((item) => item.date === date);
    if (!goal || !record || record.status !== 'absent') return { ok: false, message: '找不到可處理的缺席紀錄。' };
    if (type === 'reschedule' && !rescheduledDate) return { ok: false, message: '請選擇重新安排的日期。' };
    const updated = mapGoal(account, goalId, (item) => {
      let records: RunRecord[] = item.records.map((entry) => entry.id === record.id ? {
        ...entry,
        recovery: { type, reason: reason.trim(), resolvedAt: now.toISOString(), rescheduledDate },
      } : entry);
      if (type === 'reschedule' && rescheduledDate && !records.some((entry) => entry.date === rescheduledDate)) {
        const rescheduled: RunRecord = { id: id('run'), date: rescheduledDate, status: 'planned', photos: [], note: `由 ${date} 重新安排` };
        records = [...records, rescheduled].sort((a, b) => a.date.localeCompare(b.date));
      }
      return { ...item, records, events: [...item.events, event('recovered', `已處理 ${date} 的缺席：${reason.trim()}`, now)] };
    });
    return updated ? { ok: true, value: updated, message: '缺席處理已記錄，原始缺席仍保留。' } : { ok: false, message: '找不到目標。' };
  }

  revise(account: Account, goalId: string, weekdays: Weekday[], minutesPerRun: number, summary: string, reason: string, now: Date): WorkflowResult<Account> {
    if (!reason.trim()) return { ok: false, message: '修改計畫必須填寫原因。' };
    if (!weekdays.length) return { ok: false, message: '請至少選擇一個跑步日。' };
    const effectiveFrom = nextMonday(dateKeyInZone(now, account.timezone));
    const updated = mapGoal(account, goalId, (goal) => {
      if (goal.status !== 'active') return goal;
      const previousVersion = goal.planVersions[goal.planVersions.length - 1];
      const versionId = id('plan');
      const version: RunningPlanVersion = {
        id: versionId,
        schemaVersion: previousVersion?.schemaVersion,
        version: (previousVersion?.version ?? goal.planVersions.length) + 1,
        status: 'COMMITTED',
        createdAt: now.toISOString(),
        committedAt: now.toISOString(),
        effectiveFrom,
        source: previousVersion?.source,
        weekdays,
        minutesPerRun,
        summary,
        reason: reason.trim(),
        goalSummary: previousVersion?.goalSummary,
        coachingSummary: previousVersion?.coachingSummary,
        reasoningSummary: previousVersion?.reasoningSummary,
        phases: previousVersion?.phases,
        weeks: revisePlanWeeks(previousVersion?.weeks, weekdays, minutesPerRun),
      };
      const historical = goal.records.filter((record) => record.date < effectiveFrom);
      const future = recordsBetween(effectiveFrom, goal.endDate, weekdays);
      const versions = goal.planVersions.map((item, index) => index === goal.planVersions.length - 1 ? { ...item, supersededBy: versionId } : item);
      return { ...goal, planVersions: [...versions, version], records: [...historical, ...future], events: [...goal.events, event('revised', `計畫將於 ${effectiveFrom} 更新：${reason.trim()}`, now)] };
    });
    if (!updated) return { ok: false, message: '找不到目標。' };
    const goal = updated.goals.find((item) => item.id === goalId);
    if (goal?.status !== 'active') return { ok: false, message: '只有進行中的目標可以修改計畫。' };
    return { ok: true, value: updated, message: `新計畫會在 ${effectiveFrom} 生效。` };
  }

  pause(account: Account, goalId: string, reason: string, resumeDate: string, now: Date): WorkflowResult<Account> {
    if (!reason.trim()) return { ok: false, message: '暫停目標必須填寫原因。' };
    const today = dateKeyInZone(now, account.timezone);
    if (resumeDate <= today || resumeDate > addDays(today, 30)) return { ok: false, message: '恢復日期必須在未來 30 天內。' };
    const updated = mapGoal(account, goalId, (goal) => goal.status === 'active' ? {
      ...goal,
      status: 'paused',
      pause: { reason: reason.trim(), resumeDate, pausedAt: now.toISOString() },
      records: goal.records.map((record) => record.date >= today && record.date < resumeDate && record.status === 'planned' ? { ...record, status: 'skipped', note: `目標暫停：${reason.trim()}` } : record),
      events: [...goal.events, event('paused', `暫停至 ${resumeDate}：${reason.trim()}`, now)],
    } : goal);
    if (!updated) return { ok: false, message: '找不到目標。' };
    const goal = updated.goals.find((item) => item.id === goalId);
    return goal?.status === 'paused' ? { ok: true, value: updated, message: `目標已暫停至 ${resumeDate}。` } : { ok: false, message: '只有進行中的目標可以暫停。' };
  }

  resume(account: Account, goalId: string, now: Date): WorkflowResult<Account> {
    const updated = mapGoal(account, goalId, (goal) => goal.status === 'paused' ? {
      ...goal,
      status: 'active',
      pause: undefined,
      events: [...goal.events, event('resumed', '已恢復跑步承諾。', now)],
    } : goal);
    if (!updated) return { ok: false, message: '找不到目標。' };
    const goal = updated.goals.find((item) => item.id === goalId);
    return goal?.status === 'active' ? { ok: true, value: updated, message: '跑步承諾已恢復。' } : { ok: false, message: '只有暫停中的目標可以恢復。' };
  }

  abandon(account: Account, goalId: string, reason: string, now: Date): WorkflowResult<Account> {
    if (!reason.trim()) return { ok: false, message: '放棄目標必須填寫原因。' };
    const updated = mapGoal(account, goalId, (goal) => goal.status === 'active' || goal.status === 'paused' ? {
      ...goal,
      status: 'abandoned',
      pause: undefined,
      archivedReason: reason.trim(),
      events: [...goal.events, event('abandoned', `已放棄並歸檔：${reason.trim()}`, now)],
    } : goal);
    if (!updated) return { ok: false, message: '找不到目標。' };
    const goal = updated.goals.find((item) => item.id === goalId);
    return goal?.status === 'abandoned' ? { ok: true, value: updated, message: '目標已放棄並歸檔。' } : { ok: false, message: '這個目標不能放棄。' };
  }

  progress(goal: RunningGoal): { completed: number; planned: number; rate: number; eligible: boolean } {
    const planned = goal.records.filter((record) => record.status !== 'skipped').length;
    const completed = goal.records.filter((record) => record.status === 'completed').length;
    const rate = planned ? completed / planned : 0;
    return { completed, planned, rate, eligible: rate >= goal.targetRate };
  }

  complete(account: Account, goalId: string, now: Date): WorkflowResult<Account> {
    const goal = account.goals.find((item) => item.id === goalId);
    if (!goal || (goal.status !== 'active' && goal.status !== 'paused')) return { ok: false, message: '這個目標不能完成。' };
    const progress = this.progress(goal);
    const today = dateKeyInZone(now, account.timezone);
    if (today <= goal.endDate || !progress.eligible) return { ok: false, message: `目前完成率為 ${Math.round(progress.rate * 100)}%，需在週期結束後達到 ${Math.round(goal.targetRate * 100)}% 才可完成。` };
    const updated = mapGoal(account, goalId, (item) => ({ ...item, status: 'completed', pause: undefined, events: [...item.events, event('goal_completed', `以 ${Math.round(progress.rate * 100)}% 完成率達標並歸檔。`, now)] }));
    return updated ? { ok: true, value: updated, message: '恭喜，目標已完成並歸檔。' } : { ok: false, message: '找不到目標。' };
  }
}
