import {
  DailyTimeRange,
  defaultGoalClassification,
  GoalReason,
  OnboardingSubmission,
  PlanPhase,
  PlanSession,
  PlanSessionType,
  PlanWeek,
  RunningPlanDraft,
  RunningAssessment,
  Weekday,
} from './domain';

export type PlanValidation = { ok: boolean; errors: string[] };
export type PlanReview = {
  title: string;
  goalSummary: string;
  feasibility: RunningPlanDraft['feasibility'];
  coachingSummary: string;
  reasoningSummary: string;
  sourceLabel: string;
  trainingDays: Weekday[];
  estimatedWeeklyMinutes: number;
  phases: PlanPhase[];
  weeks: Array<PlanWeek & { expandedByDefault: boolean }>;
};

export type PlanFeedback = 'START_EASIER' | 'SUITABLE' | 'MORE_CHALLENGE' | 'ADJUST_DAY';
export type PlanDifference = {
  frequency: { before: number; after: number };
  totalMinutes: { before: number; after: number };
  trainingDays: { before: Weekday[]; after: Weekday[] };
  sessionChanges: string[];
};

const allowedTypes = new Set<PlanSessionType>(['RUN_WALK', 'EASY_RUN', 'LONG_EASY_RUN', 'REST']);
const timeLimit: Record<DailyTimeRange, number> = {
  '20_30': 30,
  '30_45': 45,
  '45_60': 60,
  '60_90': 90,
  '90_plus': 120,
  unknown: 30,
};

const makeId = (prefix: string, suffix: string | number) => `${prefix}-${suffix}`;

function safetyBlocked(submission: OnboardingSubmission): boolean {
  return Object.values(submission.safety).some(Boolean);
}

function isBeginner(submission: OnboardingSubmission): boolean {
  return ['none', 'occasional'].includes(submission.ability.recentRunningFrequency)
    || ['walk_30', 'under_5', '5_10', 'unknown'].includes(submission.ability.jogAbility);
}

function areAdjacent(a: Weekday, b: Weekday): boolean {
  const distance = Math.abs(a - b);
  return distance === 1 || distance === 6;
}

function chooseTrainingDays(submission: OnboardingSubmission): Weekday[] {
  const available = [...new Set(submission.availability.availableDays)].sort((a, b) => a - b);
  const requested = submission.availability.realisticFrequency === 'coach'
    ? Math.min(3, available.length)
    : Math.min(submission.availability.realisticFrequency, available.length);
  const beginner = isBeginner(submission);
  const candidates: Weekday[][] = [];
  for (let mask = 1; mask < (1 << available.length); mask += 1) {
    const days = available.filter((_, index) => mask & (1 << index));
    if (days.length > requested) continue;
    if (beginner && days.some((day, index) => days.slice(index + 1).some((other) => areAdjacent(day, other)))) continue;
    candidates.push(days);
  }
  candidates.sort((left, right) => right.length - left.length || left.join(',').localeCompare(right.join(',')));
  return candidates[0] ?? available.slice(0, 1);
}

function reasonLabel(reason: GoalReason): string {
  return {
    fat_loss: '以跑步支持減脂與健康習慣',
    health: '建立長期健康的跑步習慣',
    fitness: '逐步提升心肺體能',
    stress_relief: '用輕鬆跑步建立減壓空間',
    discipline: '建立穩定而可持續的紀律',
    race: '安全走向你的比賽目標',
    other: '建立適合目前生活的跑步習慣',
  }[reason];
}

function feasibility(submission: OnboardingSubmission, now: Date): RunningPlanDraft['feasibility'] {
  if (submission.goal.primaryReason !== 'race' || !submission.goal.raceDistance || !submission.goal.targetDate) {
    return { status: 'REALISTIC', message: '這個八週起始階段與你目前提供的時間及能力相符。' };
  }
  const target = new Date(`${submission.goal.targetDate}T00:00:00.000Z`);
  const weeksAvailable = Math.floor((target.getTime() - now.getTime()) / (7 * 24 * 60 * 60_000));
  const beginner = isBeginner(submission);
  const minimumWeeks = {
    '5k': beginner ? 8 : 4,
    '10k': beginner ? 12 : 8,
    half_marathon: beginner ? 16 : 12,
    marathon: beginner ? 24 : 18,
  }[submission.goal.raceDistance];
  if (!Number.isFinite(target.getTime()) || weeksAvailable < minimumWeeks) {
    return {
      status: 'ADJUSTED',
      message: `距離目標與日期只剩約 ${Math.max(0, weeksAvailable)} 週，對目前能力過於進取。這八週先完成安全的階段目標，再重新評估後續準備。`,
    };
  }
  const longGoal = ['half_marathon', 'marathon'].includes(submission.goal.raceDistance);
  return {
    status: 'REALISTIC',
    message: longGoal ? '時間可支援循序準備；這八週是第一個基礎階段，不代表完整備賽週期。' : '目標日期留有合理的起始準備時間；本計畫仍會先以舒服強度建立穩定性。',
  };
}

function sessionCopy(type: PlanSessionType, minutes: number, week: number): Pick<PlanSession, 'title' | 'instructions' | 'rpe' | 'talkTest' | 'focus' | 'easierFallback' | 'coachingReason'> {
  const workMinutes = Math.max(8, minutes - 10);
  if (type === 'RUN_WALK') {
    const run = week <= 2 ? 2 : week <= 5 ? 3 : 4;
    const walk = 2;
    const repeats = Math.max(2, Math.floor(workMinutes / (run + walk)));
    return {
      title: `輕鬆跑走交替 ${minutes} 分鐘`,
      instructions: ['先快步行 5 分鐘，讓呼吸和雙腿慢慢熱起來。', `慢跑 ${run} 分鐘，再步行 ${walk} 分鐘；重複 ${repeats} 次。慢跑時刻意放慢，不追速度。`, '最後慢步行 5 分鐘，等呼吸平穩後才結束。'],
      rpe: { min: 3, max: 4 },
      talkTest: '全程應該仍能說完整句子；如果只能說幾個字，請放慢或改為步行。',
      focus: '建立舒服開始與完成一課的節奏。',
      easierFallback: `改成快步行 ${Math.max(15, minutes - 10)} 分鐘，中間只加入幾段 30 秒慢跑。`,
      coachingReason: '跑走交替能控制衝擊和呼吸，讓身體在不硬撐的情況下適應跑步。',
    };
  }
  if (type === 'LONG_EASY_RUN') {
    return {
      title: `較長的輕鬆跑走 ${minutes} 分鐘`,
      instructions: ['先快步行 5 分鐘熱身。', `用能聊天的速度持續慢跑或跑走 ${workMinutes} 分鐘；每當呼吸變急，便步行 1–2 分鐘再開始。`, '最後慢步行 5 分鐘放鬆，不要用衝刺結束。'],
      rpe: { min: 3, max: 5 },
      talkTest: '大部分時間能說完整句子，最後仍應保留一些餘力。',
      focus: '延長輕鬆活動時間，而不是追求速度。',
      easierFallback: `總時間減少 10 分鐘，並固定每慢跑 3 分鐘便步行 2 分鐘。`,
      coachingReason: '每週只有一課稍長，讓耐力有小幅刺激，同時保留恢復空間。',
    };
  }
  return {
    title: `舒服連續慢跑 ${minutes} 分鐘`,
    instructions: ['先快步行 5 分鐘熱身。', `以能說完整句子的速度慢跑 ${workMinutes} 分鐘；不看速度，肩膀保持放鬆。`, '最後慢步行 5 分鐘，留意有沒有持續不適。'],
    rpe: { min: 3, max: 5 },
    talkTest: '你應該能說完整句子；如果做不到，立即降低速度或加入步行。',
    focus: '在舒服強度下延長連續慢跑。',
    easierFallback: `改為慢跑 3 分鐘、步行 2 分鐘，維持相同或少 5 分鐘的總時間。`,
    coachingReason: '這一課練習穩定節奏，不以速度或疲累程度判定成功。',
  };
}

function buildSession(submission: OnboardingSubmission, weekday: Weekday, week: number, index: number, count: number): PlanSession {
  const limit = timeLimit[submission.availability.timeByDay[weekday] ?? 'unknown'];
  const progression = [0, 0, 5, 5, 10, 10, 15, 10][week - 1] ?? 0;
  const beginner = isBeginner(submission);
  const requestedType: PlanSessionType = index === count - 1 && count > 1
    ? 'LONG_EASY_RUN'
    : beginner && week <= 3
      ? 'RUN_WALK'
      : index === 0
        ? 'RUN_WALK'
        : 'EASY_RUN';
  const minutes = Math.min(limit, 25 + progression + (requestedType === 'LONG_EASY_RUN' ? 5 : 0));
  return {
    id: makeId(`week-${week}-session`, index + 1),
    weekday,
    type: requestedType,
    status: 'DRAFT',
    totalMinutes: minutes,
    ...sessionCopy(requestedType, minutes, week),
  };
}

function buildPhases(): PlanPhase[] {
  return [
    { id: 'phase-1', startWeek: 1, endWeek: 3, name: '建立穩定節奏', purpose: '先學會以舒服強度開始並完成每一課。', progressionSummary: '以跑走交替為主，訓練日之間保留恢復。' },
    { id: 'phase-2', startWeek: 4, endWeek: 6, name: '延長輕鬆活動', purpose: '逐步增加連續慢跑或總活動時間。', progressionSummary: '每次只增加少量時間，不同時大幅增加頻率與強度。' },
    { id: 'phase-3', startWeek: 7, endWeek: 8, name: '完成起始階段', purpose: '把八週累積轉成可持續的每週習慣。', progressionSummary: '第七週小幅延長，第八週保留空間穩定完成。' },
  ];
}

export function sanitiseCoachingSubmission(submission: OnboardingSubmission): OnboardingSubmission {
  const clean = JSON.parse(JSON.stringify(submission)) as OnboardingSubmission;
  return {
    ...clean,
    goal: {
      ...clean.goal,
      classification: clean.goal.classification ?? { ...defaultGoalClassification },
    },
  };
}

export function onboardingFromLegacyAssessment(assessment: RunningAssessment): OnboardingSubmission {
  const dailyRange: DailyTimeRange = assessment.minutesPerRun <= 30
    ? '20_30'
    : assessment.minutesPerRun <= 45
      ? '30_45'
      : assessment.minutesPerRun <= 60
        ? '45_60'
        : assessment.minutesPerRun <= 90
          ? '60_90'
          : '90_plus';
  const ageRange = assessment.ageRange.includes('18') ? '18_24'
    : assessment.ageRange.includes('35') ? '35_44'
      : assessment.ageRange.includes('45') ? '45_54'
        : assessment.ageRange.includes('55') ? '55_64'
          : assessment.ageRange.includes('65') ? '65_plus'
            : '25_34';
  return {
    schemaVersion: 'initial-coaching-onboarding/v1',
    goal: { classification: { ...defaultGoalClassification }, primaryReason: 'health', secondaryReasons: [], specificTarget: assessment.desiredAbility },
    ability: { ageRange, recentRunningFrequency: 'none', jogAbility: 'under_5', hadRunningHabit: false },
    recentActivity: { activeDays: 'unknown', weeklyTime: 'unknown', activityTypes: [] },
    availability: {
      availableDays: [...assessment.availableDays],
      realisticFrequency: Math.min(5, Math.max(2, assessment.availableDays.length)) as 2 | 3 | 4 | 5,
      timeByDay: Object.fromEntries(assessment.availableDays.map((day) => [day, dailyRange])),
    },
    safety: {
      hasChestPain: assessment.hasChestPain,
      hasDizziness: assessment.hasDizziness,
      hasHeartOrLungCondition: assessment.hasHeartOrLungCondition,
      hasRunningPain: assessment.hasJointProblem,
      hasMedicalRestriction: assessment.hasMedicalRestriction,
    },
  };
}

export class InitialCoachingWorkflow {
  createFallbackPlan(submission: OnboardingSubmission, now: Date): RunningPlanDraft {
    const cleanSubmission = sanitiseCoachingSubmission(submission);
    const days = chooseTrainingDays(cleanSubmission);
    const weeks: PlanWeek[] = Array.from({ length: 8 }, (_, index) => {
      const weekNumber = index + 1;
      const sessions = days.map((day, sessionIndex) => buildSession(cleanSubmission, day, weekNumber, sessionIndex, days.length));
      return {
        id: makeId('week', weekNumber),
        weekNumber,
        status: 'DRAFT',
        focus: weekNumber <= 3 ? '建立穩定出席與舒服強度' : weekNumber <= 6 ? '逐步延長輕鬆活動時間' : '穩定完成八週起始階段',
        estimatedTotalMinutes: sessions.reduce((total, session) => total + session.totalMinutes, 0),
        sessions,
      };
    });
    const estimatedWeeklyMinutes = weeks[0]?.estimatedTotalMinutes ?? 0;
    const goalSummary = cleanSubmission.goal.specificTarget?.trim() || reasonLabel(cleanSubmission.goal.primaryReason);
    return {
      id: `draft-${now.getTime()}`,
      schemaVersion: 'initial-coaching-plan/v1',
      classification: cleanSubmission.goal.classification,
      planVersion: 1,
      status: 'DRAFT',
      createdAt: now.toISOString(),
      source: 'fallback',
      submission: cleanSubmission,
      title: '你的八週跑步起始計畫',
      summary: `每週 ${days.length} 課，從跑走交替開始，逐步建立可以長期維持的節奏。`,
      goalSummary,
      feasibility: feasibility(cleanSubmission, now),
      coachingSummary: '先建立穩定出席，再小幅增加輕鬆活動時間；不追求速度，也不把疲累當成進步。',
      reasoningSummary: `從你有空的日子中選擇 ${days.length} 天並分開安排，讓身體有恢復時間。星期較長的可用窗口會承擔較長的一課。`,
      phases: buildPhases(),
      weeks,
      weekdays: days,
      minutesPerRun: Math.round(estimatedWeeklyMinutes / Math.max(1, days.length)),
      estimatedWeeklyMinutes,
      cycleWeeks: 8,
      targetRate: 0.8,
      safetyBlocked: safetyBlocked(cleanSubmission),
    };
  }

  validateSubmission(submission: OnboardingSubmission): PlanValidation {
    const errors: string[] = [];
    if (submission.ability.ageRange === 'under_18') errors.push('V1 暫時只支援 18 歲或以上使用者。');
    if (submission.goal.secondaryReasons.includes(submission.goal.primaryReason)) errors.push('主要原因不可重複為次要原因。');
    if (submission.goal.primaryReason === 'other' && !submission.goal.otherReason?.trim()) errors.push('請補充其他目標原因。');
    if (submission.goal.primaryReason === 'race' && (!submission.goal.raceDistance || !submission.goal.targetDate)) errors.push('比賽目標需要距離和日期。');
    if (submission.ability.recentRunningFrequency !== 'none' && !submission.ability.recentRun) errors.push('請選擇最近一次跑步資料的可信程度。');
    if (submission.ability.recentRun?.confidence === 'EXACT') {
      if (!Number.isFinite(submission.ability.recentRun.distanceKm) || submission.ability.recentRun.distanceKm <= 0) errors.push('最近跑步距離必須大於 0。');
      if (!Number.isFinite(submission.ability.recentRun.durationMinutes) || submission.ability.recentRun.durationMinutes <= 0) errors.push('最近跑步時間必須大於 0。');
      if (!Number.isFinite(submission.ability.recentRun.rpe) || submission.ability.recentRun.rpe < 0 || submission.ability.recentRun.rpe > 10) errors.push('最近跑步 RPE 必須在 0–10。');
    }
    if (submission.ability.hadRunningHabit && !submission.ability.previousHabitDuration) errors.push('請選擇過往固定跑步維持期間。');
    if (submission.ability.previousRunsPerWeek !== undefined && (!Number.isInteger(submission.ability.previousRunsPerWeek) || submission.ability.previousRunsPerWeek < 1 || submission.ability.previousRunsPerWeek > 7)) errors.push('過往每週跑步次數必須在 1–7。');
    if (!submission.availability.availableDays.length) errors.push('請至少選擇一個可跑日。');
    for (const day of submission.availability.availableDays) {
      if (!submission.availability.timeByDay[day]) errors.push(`請選擇星期 ${day} 的可投入時間。`);
    }
    if (safetyBlocked(submission)) errors.push('安全篩查尚未通過。');
    return { ok: errors.length === 0, errors };
  }

  validatePlan(submission: OnboardingSubmission, plan: RunningPlanDraft): PlanValidation {
    const errors = [...this.validateSubmission(submission).errors];
    if (plan.schemaVersion !== 'initial-coaching-plan/v1') errors.push('計畫 schema version 不正確。');
    if (plan.status !== 'DRAFT' || plan.weeks.some((week) => week.status !== 'DRAFT' || week.sessions.some((session) => session.status !== 'DRAFT'))) errors.push('正式承諾前所有計畫內容必須保持草案狀態。');
    if (plan.cycleWeeks !== 8 || plan.weeks.length !== 8) errors.push('Initial Plan 必須完整包含八週。');
    if (plan.weeks.some((week, index) => week.weekNumber !== index + 1)) errors.push('週次必須由 1 至 8 連續排列。');
    const phaseCoverage = plan.phases.flatMap((phase) => Array.from({ length: phase.endWeek - phase.startWeek + 1 }, (_, index) => phase.startWeek + index));
    if (phaseCoverage.join(',') !== '1,2,3,4,5,6,7,8') errors.push('Phase 必須無重疊地覆蓋八週。');
    const frequencyLimit = submission.availability.realisticFrequency === 'coach' ? 3 : submission.availability.realisticFrequency;
    for (const week of plan.weeks) {
      const training = week.sessions.filter((session) => session.type !== 'REST');
      if (training.length > frequencyLimit) errors.push(`第 ${week.weekNumber} 週超過現實可維持頻率。`);
      const seen = new Set<Weekday>();
      for (const session of week.sessions) {
        if (!allowedTypes.has(session.type)) errors.push(`第 ${week.weekNumber} 週包含不支援的課堂類型。`);
        if (!Number.isInteger(session.weekday) || session.weekday < 0 || session.weekday > 6) errors.push(`第 ${week.weekNumber} 週星期資料不正確。`);
        if (!Number.isFinite(session.totalMinutes) || session.totalMinutes <= 0) errors.push(`第 ${week.weekNumber} 週課堂時間不符合限制。`);
        if (session.type !== 'REST') {
          if (!submission.availability.availableDays.includes(session.weekday)) errors.push(`第 ${week.weekNumber} 週安排在不可用日期。`);
          if (seen.has(session.weekday)) errors.push(`第 ${week.weekNumber} 週同一天有重複訓練。`);
          seen.add(session.weekday);
          const limit = timeLimit[submission.availability.timeByDay[session.weekday] ?? 'unknown'];
          if (session.totalMinutes > limit) errors.push(`第 ${week.weekNumber} 週課堂時間不符合限制。`);
        }
        if (session.instructions.length < 3 || !session.title.trim() || !session.talkTest.trim() || !session.easierFallback.trim() || !session.coachingReason.trim()) errors.push(`第 ${week.weekNumber} 週課堂說明不完整。`);
        if (session.rpe.min < 1 || session.rpe.max > 10 || session.rpe.min > session.rpe.max) errors.push(`第 ${week.weekNumber} 週 RPE 不正確。`);
      }
      const days = [...seen];
      if (isBeginner(submission) && days.some((day, index) => days.slice(index + 1).some((other) => areAdjacent(day, other)))) errors.push(`第 ${week.weekNumber} 週初學者訓練日沒有足夠恢復間距。`);
    }
    return { ok: errors.length === 0, errors: [...new Set(errors)] };
  }

  projectReview(plan: RunningPlanDraft): PlanReview {
    return {
      title: plan.title,
      goalSummary: plan.goalSummary,
      feasibility: plan.feasibility,
      coachingSummary: plan.coachingSummary,
      reasoningSummary: plan.reasoningSummary,
      sourceLabel: plan.source === 'gemini' ? 'Gemini 個人化起始計畫' : '安全基本計畫（Gemini 暫時不可用）',
      trainingDays: plan.weekdays,
      estimatedWeeklyMinutes: plan.estimatedWeeklyMinutes,
      phases: plan.phases,
      weeks: plan.weeks.map((week) => ({ ...week, expandedByDefault: week.weekNumber === 1 })),
    };
  }

  comparePlans(before: RunningPlanDraft, after: RunningPlanDraft): PlanDifference {
    const beforeMinutes = before.weeks.reduce((total, week) => total + week.estimatedTotalMinutes, 0);
    const afterMinutes = after.weeks.reduce((total, week) => total + week.estimatedTotalMinutes, 0);
    const changes: string[] = [];
    for (let weekIndex = 0; weekIndex < Math.max(before.weeks.length, after.weeks.length); weekIndex += 1) {
      const beforeWeek = before.weeks[weekIndex];
      const afterWeek = after.weeks[weekIndex];
      for (let index = 0; index < Math.max(beforeWeek?.sessions.length ?? 0, afterWeek?.sessions.length ?? 0); index += 1) {
        const left = beforeWeek?.sessions[index];
        const right = afterWeek?.sessions[index];
        const prefix = `第 ${weekIndex + 1} 週：`;
        if (!left && right) changes.push(`${prefix}新增 ${right.title}`);
        else if (left && !right) changes.push(`${prefix}移除 ${left.title}`);
        else if (left && right && (left.weekday !== right.weekday || left.totalMinutes !== right.totalMinutes || left.title !== right.title)) changes.push(`${prefix}${left.title} → ${right.title}`);
      }
    }
    return {
      frequency: { before: before.weekdays.length, after: after.weekdays.length },
      totalMinutes: { before: beforeMinutes, after: afterMinutes },
      trainingDays: { before: before.weekdays, after: after.weekdays },
      sessionChanges: changes,
    };
  }
}
