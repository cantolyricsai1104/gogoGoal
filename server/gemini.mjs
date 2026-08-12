import { GoogleGenAI } from '@google/genai';

const planSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    weekdays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
    minutesPerRun: { type: 'integer', minimum: 15, maximum: 120 },
    cycleWeeks: { type: 'integer', minimum: 2, maximum: 16 },
    targetRate: { type: 'number', minimum: 0.5, maximum: 1 },
  },
  required: ['title', 'summary', 'weekdays', 'minutesPerRun', 'cycleWeeks', 'targetRate'],
};

const sessionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    weekday: { type: 'integer', minimum: 0, maximum: 6 },
    type: { type: 'string', enum: ['RUN_WALK', 'EASY_RUN', 'LONG_EASY_RUN', 'REST'] },
    title: { type: 'string' },
    totalMinutes: { type: 'integer', minimum: 1, maximum: 120 },
    instructions: { type: 'array', minItems: 3, items: { type: 'string' } },
    rpe: {
      type: 'object',
      additionalProperties: false,
      properties: { min: { type: 'integer', minimum: 1, maximum: 10 }, max: { type: 'integer', minimum: 1, maximum: 10 } },
      required: ['min', 'max'],
    },
    talkTest: { type: 'string' },
    focus: { type: 'string' },
    easierFallback: { type: 'string' },
    coachingReason: { type: 'string' },
  },
  required: ['weekday', 'type', 'title', 'totalMinutes', 'instructions', 'rpe', 'talkTest', 'focus', 'easierFallback', 'coachingReason'],
};

const initialPlanSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    goalSummary: { type: 'string' },
    feasibility: {
      type: 'object',
      additionalProperties: false,
      properties: { status: { type: 'string', enum: ['REALISTIC', 'ADJUSTED'] }, message: { type: 'string' } },
      required: ['status', 'message'],
    },
    coachingSummary: { type: 'string' },
    reasoningSummary: { type: 'string' },
    recommendedDays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
    estimatedWeeklyMinutes: { type: 'integer', minimum: 1, maximum: 600 },
    phases: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          startWeek: { type: 'integer', minimum: 1, maximum: 8 },
          endWeek: { type: 'integer', minimum: 1, maximum: 8 },
          name: { type: 'string' },
          purpose: { type: 'string' },
          progressionSummary: { type: 'string' },
        },
        required: ['startWeek', 'endWeek', 'name', 'purpose', 'progressionSummary'],
      },
    },
    weeks: {
      type: 'array',
      minItems: 8,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          weekNumber: { type: 'integer', minimum: 1, maximum: 8 },
          focus: { type: 'string' },
          sessions: { type: 'array', minItems: 1, maxItems: 5, items: sessionSchema },
        },
        required: ['weekNumber', 'focus', 'sessions'],
      },
    },
  },
  required: ['title', 'summary', 'goalSummary', 'feasibility', 'coachingSummary', 'reasoningSummary', 'recommendedDays', 'estimatedWeeklyMinutes', 'phases', 'weeks'],
};

const personalGrowthTaskSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    weekday: { type: 'integer', minimum: 0, maximum: 6 },
    startTime: { type: 'string' },
    title: { type: 'string' },
    totalMinutes: { type: 'integer', minimum: 1, maximum: 600 },
    instructions: { type: 'array', minItems: 3, items: { type: 'string' } },
    completionCriteria: { type: 'string' },
    easierFallback: { type: 'string' },
    coachingReason: { type: 'string' },
  },
  required: ['weekday', 'title', 'totalMinutes', 'instructions', 'completionCriteria', 'easierFallback', 'coachingReason'],
};

const personalGrowthPlanSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    goalSummary: { type: 'string' },
    feasibility: {
      type: 'object',
      additionalProperties: false,
      properties: { status: { type: 'string', enum: ['REALISTIC', 'ADJUSTED'] }, message: { type: 'string' } },
      required: ['status', 'message'],
    },
    coachingSummary: { type: 'string' },
    reasoningSummary: { type: 'string' },
    milestones: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { weekNumber: { type: 'integer', minimum: 1 }, title: { type: 'string' }, purpose: { type: 'string' }, successSignal: { type: 'string' } },
        required: ['weekNumber', 'title', 'purpose', 'successSignal'],
      },
    },
    weeks: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          weekNumber: { type: 'integer', minimum: 1 },
          focus: { type: 'string' },
          tasks: { type: 'array', minItems: 1, maxItems: 5, items: personalGrowthTaskSchema },
        },
        required: ['weekNumber', 'focus', 'tasks'],
      },
    },
  },
  required: ['title', 'summary', 'goalSummary', 'feasibility', 'coachingSummary', 'reasoningSummary', 'milestones', 'weeks'],
};

const personalGrowthWeeklyPlanSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    goalSummary: { type: 'string' },
    feasibility: {
      type: 'object',
      additionalProperties: false,
      properties: { status: { type: 'string', enum: ['REALISTIC', 'ADJUSTED'] }, message: { type: 'string' } },
      required: ['status', 'message'],
    },
    coachingSummary: { type: 'string' },
    reasoningSummary: { type: 'string' },
    week: {
      type: 'object',
      additionalProperties: false,
      properties: {
        weekNumber: { type: 'integer', minimum: 1 },
        focus: { type: 'string' },
        tasks: { type: 'array', minItems: 1, maxItems: 5, items: personalGrowthTaskSchema },
      },
      required: ['weekNumber', 'focus', 'tasks'],
    },
  },
  required: ['title', 'summary', 'goalSummary', 'feasibility', 'coachingSummary', 'reasoningSummary', 'week'],
};

const encouragementSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { text: { type: 'string' } },
  required: ['text'],
};

function geminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== 'object') return schema;
  return Object.fromEntries(Object.entries(schema)
    .filter(([key]) => !['additionalProperties', 'minItems', 'maxItems'].includes(key))
    .map(([key, value]) => [key, geminiSchema(value)]));
}

function jsonGenerationConfig(schema, maxOutputTokens = 512) {
  return {
    temperature: 0.4,
    maxOutputTokens,
    responseMimeType: 'application/json',
    responseSchema: geminiSchema(schema),
  };
}

function pick(value, keys) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]));
}

function sanitizeSubmission(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid onboarding submission');
  return {
    schemaVersion: value.schemaVersion,
    goal: pick(value.goal, ['classification', 'primaryReason', 'secondaryReasons', 'otherReason', 'raceDistance', 'targetDate', 'targetWeightChangeKg', 'specificTarget', 'desiredIdentityInThreeMonths', 'currentSituation']),
    ability: pick(value.ability, ['ageRange', 'recentRunningFrequency', 'recentRun', 'jogAbility', 'longestDistanceKm', 'hadRunningHabit', 'previousHabitDuration', 'previousRunsPerWeek']),
    recentActivity: pick(value.recentActivity, ['activeDays', 'weeklyTime', 'activityTypes', 'otherActivity']),
    availability: pick(value.availability, ['availableDays', 'realisticFrequency', 'timeByDay']),
    safety: pick(value.safety, ['hasChestPain', 'hasDizziness', 'hasHeartOrLungCondition', 'hasRunningPain', 'hasMedicalRestriction']),
  };
}

function sanitizePersonalGrowthSubmission(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid personal growth submission');
  const answerMap = (candidate) => {
    if (!candidate || typeof candidate !== 'object') return {};
    const result = {};
    Object.entries(candidate).forEach(([key, item]) => {
      if (key.length > 80) return;
      if (typeof item === 'string') result[key] = item.trim().slice(0, 160);
      else if (Array.isArray(item)) result[key] = item.filter((value) => typeof value === 'string').map((value) => value.trim().slice(0, 160)).filter(Boolean);
    });
    return result;
  };
  const customTimeMap = value.timeByDayCustom && typeof value.timeByDayCustom === 'object'
    ? Object.fromEntries(Object.entries(value.timeByDayCustom).filter(([key, item]) => ['0', '1', '2', '3', '4', '5', '6'].includes(key) && Number.isFinite(Number(item)) && Number(item) > 0).map(([key, item]) => [key, Number(item)]))
    : {};
  return {
    schemaVersion: value.schemaVersion,
    classification: value.classification,
    focus: { primary: value.focus?.primary, secondary: [] },
    otherFocus: value.otherFocus,
    outcome: value.outcome,
    successDefinition: value.successDefinition,
    currentLevel: value.currentLevel,
    currentSituation: value.currentSituation,
    cycleWeeks: value.cycleWeeks,
    targetDate: value.targetDate,
    weeklyMinutes: value.weeklyMinutes,
    availableDays: value.availableDays,
    timeByDay: value.timeByDay,
    timeByDayCustom: customTimeMap,
    preferredFormats: value.preferredFormats,
    preferredLanguage: value.preferredLanguage,
    constraints: value.constraints,
    obstacles: value.obstacles,
    desiredIdentity: value.desiredIdentity,
    templateAnswers: answerMap(value.templateAnswers),
    templateOtherAnswers: answerMap(value.templateOtherAnswers),
    startDate: value.startDate,
    preferredTimeSlot: value.preferredTimeSlot,
    preferredStartTime: value.preferredStartTime,
  };
}

function sanitizePlanForRevision(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid current plan');
  return {
    ...pick(value, ['title', 'summary', 'goalSummary', 'feasibility', 'coachingSummary', 'reasoningSummary', 'recommendedDays', 'estimatedWeeklyMinutes']),
    phases: Array.isArray(value.phases) ? value.phases.map((phase) => pick(phase, ['startWeek', 'endWeek', 'name', 'purpose', 'progressionSummary'])) : [],
    weeks: Array.isArray(value.weeks) ? value.weeks.map((week) => ({
      ...pick(week, ['weekNumber', 'focus']),
      sessions: Array.isArray(week.sessions) ? week.sessions.map((session) => pick(session, ['weekday', 'type', 'title', 'totalMinutes', 'instructions', 'rpe', 'talkTest', 'focus', 'easierFallback', 'coachingReason'])) : [],
    })) : [],
  };
}

function sanitizePersonalGrowthPlanForRevision(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid personal growth plan');
  return {
    ...pick(value, ['title', 'summary', 'goalSummary', 'feasibility', 'coachingSummary', 'reasoningSummary']),
    milestones: Array.isArray(value.milestones) ? value.milestones.map((milestone) => pick(milestone, ['weekNumber', 'title', 'purpose', 'successSignal'])) : [],
    weeks: Array.isArray(value.weeks) ? value.weeks.map((week) => ({
      ...pick(week, ['weekNumber', 'focus']),
      tasks: Array.isArray(week.tasks) ? week.tasks.map((task) => pick(task, ['weekday', 'startTime', 'title', 'totalMinutes', 'instructions', 'completionCriteria', 'easierFallback', 'coachingReason'])) : [],
    })) : [],
  };
}

function sanitizePersonalGrowthWeeklyReview(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid personal growth weekly review');
  const difficulty = ['easy', 'suitable', 'hard'].includes(value.difficulty) ? value.difficulty : 'suitable';
  const confidence = Math.min(5, Math.max(1, Number(value.confidence) || 3));
  return {
    weekNumber: Number(value.weekNumber),
    actualMinutes: Math.max(0, Math.min(600, Number(value.actualMinutes) || 0)),
    difficulty,
    obstacle: String(value.obstacle ?? '').trim().slice(0, 500),
    evidence: String(value.evidence ?? '').trim().slice(0, 700),
    confidence,
    reflection: String(value.reflection ?? '').trim().slice(0, 700),
  };
}

function sanitizePersonalGrowthGoalForWeek(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid personal growth goal context');
  return {
    title: String(value.title ?? '').trim().slice(0, 160),
    goalSummary: String(value.goalSummary ?? '').trim().slice(0, 400),
    cycleWeeks: Number(value.cycleWeeks),
    weeklyMinutes: Number(value.weeklyMinutes),
    weeks: Array.isArray(value.weeks) ? value.weeks.map((week) => ({
      weekNumber: Number(week?.weekNumber),
      focus: String(week?.focus ?? '').trim().slice(0, 300),
      tasks: Array.isArray(week?.tasks) ? week.tasks.map((task) => ({
        title: String(task?.title ?? '').trim().slice(0, 160),
        totalMinutes: Number(task?.totalMinutes),
        status: ['PLANNED', 'COMPLETED', 'SKIPPED'].includes(task?.status) ? task.status : 'PLANNED',
        completionCriteria: String(task?.completionCriteria ?? '').trim().slice(0, 400),
      })) : [],
    })) : [],
    weeklyReviews: Array.isArray(value.weeklyReviews) ? value.weeklyReviews.map((review) => sanitizePersonalGrowthWeeklyReview(review)) : [],
  };
}

const dailyTimeLimit = { '20_30': 30, '30_45': 45, '45_60': 60, '60_90': 90, '90_plus': 120, unknown: 30 };

function dailyMinutes(submission, weekday) {
  const range = submission.timeByDay?.[weekday] ?? 'unknown';
  if (range === 'other') return Math.max(1, Number(submission.timeByDayCustom?.[weekday]) || 30);
  return dailyTimeLimit[range] ?? 30;
}
const supportedSessionTypes = new Set(['RUN_WALK', 'EASY_RUN', 'LONG_EASY_RUN', 'REST']);

function isBeginnerSubmission(submission) {
  return ['none', 'occasional'].includes(submission.ability?.recentRunningFrequency)
    || ['walk_30', 'under_5', '5_10', 'unknown'].includes(submission.ability?.jogAbility);
}

function adjacentWeekdays(a, b) {
  const distance = Math.abs(a - b);
  return distance === 1 || distance === 6;
}

function requiredText(value, field, maxLength = 800) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  if (!text) throw new Error(`Invalid Initial Plan: missing ${field}`);
  return text;
}

function cleanInitialPlan(value, submission) {
  if (!value || typeof value !== 'object') throw new Error('Invalid Initial Plan response');
  const available = new Set(Array.isArray(submission.availability?.availableDays) ? submission.availability.availableDays : []);
  const frequencyLimit = submission.availability?.realisticFrequency === 'coach' ? 3 : Number(submission.availability?.realisticFrequency);
  if (!available.size || !Number.isFinite(frequencyLimit)) throw new Error('Invalid onboarding availability');
  if (Object.values(submission.safety ?? {}).some(Boolean)) throw new Error('Safety blocked onboarding submission');
  if (!Array.isArray(value.weeks) || value.weeks.length !== 8) throw new Error('Invalid Initial Plan: exactly eight weeks are required');
  if (!Array.isArray(value.phases) || !value.phases.length) throw new Error('Invalid Initial Plan: phases are required');

  const coverage = [];
  const phases = value.phases.map((phase, index) => {
    const startWeek = Number(phase.startWeek);
    const endWeek = Number(phase.endWeek);
    if (!Number.isInteger(startWeek) || !Number.isInteger(endWeek) || startWeek < 1 || endWeek > 8 || endWeek < startWeek) throw new Error('Invalid Initial Plan: phase range');
    for (let week = startWeek; week <= endWeek; week += 1) coverage.push(week);
    return {
      id: `phase-${index + 1}`,
      startWeek,
      endWeek,
      name: requiredText(phase.name, 'phase name', 80),
      purpose: requiredText(phase.purpose, 'phase purpose', 300),
      progressionSummary: requiredText(phase.progressionSummary, 'phase progression', 300),
    };
  });
  if (coverage.join(',') !== '1,2,3,4,5,6,7,8') throw new Error('Invalid Initial Plan: phases must cover weeks 1 to 8 once');

  const weeks = value.weeks.map((week, weekIndex) => {
    const weekNumber = Number(week.weekNumber);
    if (weekNumber !== weekIndex + 1) throw new Error('Invalid Initial Plan: week numbering');
    if (!Array.isArray(week.sessions) || !week.sessions.length) throw new Error(`Invalid Initial Plan: week ${weekNumber} sessions`);
    const trainingCount = week.sessions.filter((session) => session.type !== 'REST').length;
    if (trainingCount > frequencyLimit) throw new Error(`Invalid Initial Plan: week ${weekNumber} exceeds realistic frequency`);
    const seenTrainingDays = new Set();
    const sessions = week.sessions.map((session, sessionIndex) => {
      const weekday = Number(session.weekday);
      const type = String(session.type ?? '');
      const totalMinutes = Number(session.totalMinutes);
      if (!supportedSessionTypes.has(type)) throw new Error(`Invalid Initial Plan: unsupported session type in week ${weekNumber}`);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error(`Invalid Initial Plan: invalid weekday in week ${weekNumber}`);
      if (!Number.isInteger(totalMinutes) || totalMinutes <= 0) throw new Error(`Invalid Initial Plan: invalid session time in week ${weekNumber}`);
      if (type !== 'REST') {
        if (!available.has(weekday)) throw new Error(`Invalid Initial Plan: week ${weekNumber} uses unavailable day`);
        if (seenTrainingDays.has(weekday)) throw new Error(`Invalid Initial Plan: duplicate weekday in week ${weekNumber}`);
        seenTrainingDays.add(weekday);
        const limit = dailyMinutes({ timeByDay: submission.availability?.timeByDay, timeByDayCustom: submission.availability?.timeByDayCustom }, weekday);
        if (totalMinutes > limit) throw new Error(`Invalid Initial Plan: session exceeds time limit in week ${weekNumber}`);
      }
      if (!Array.isArray(session.instructions) || session.instructions.length < 3) throw new Error(`Invalid Initial Plan: incomplete instructions in week ${weekNumber}`);
      const rpeMin = Number(session.rpe?.min);
      const rpeMax = Number(session.rpe?.max);
      if (!Number.isInteger(rpeMin) || !Number.isInteger(rpeMax) || rpeMin < 1 || rpeMax > 10 || rpeMin > rpeMax) throw new Error(`Invalid Initial Plan: RPE in week ${weekNumber}`);
      return {
        id: `week-${weekNumber}-session-${sessionIndex + 1}`,
        weekday,
        type,
        status: 'DRAFT',
        title: requiredText(session.title, 'session title', 120),
        totalMinutes,
        instructions: session.instructions.map((step, stepIndex) => requiredText(step, `instruction ${stepIndex + 1}`, 300)),
        rpe: { min: rpeMin, max: rpeMax },
        talkTest: requiredText(session.talkTest, 'talk test', 300),
        focus: requiredText(session.focus, 'session focus', 300),
        easierFallback: requiredText(session.easierFallback, 'easier fallback', 300),
        coachingReason: requiredText(session.coachingReason, 'coaching reason', 300),
      };
    });
    const trainingDays = [...seenTrainingDays];
    if (isBeginnerSubmission(submission) && trainingDays.some((day, index) => trainingDays.slice(index + 1).some((other) => adjacentWeekdays(day, other)))) {
      throw new Error(`Invalid Initial Plan: beginner recovery spacing in week ${weekNumber}`);
    }
    return {
      id: `week-${weekNumber}`,
      weekNumber,
      status: 'DRAFT',
      focus: requiredText(week.focus, 'week focus', 300),
      estimatedTotalMinutes: sessions.filter((session) => session.type !== 'REST').reduce((total, session) => total + session.totalMinutes, 0),
      sessions,
    };
  });
  const actualDays = [...new Set(weeks.flatMap((week) => week.sessions.filter((session) => session.type !== 'REST').map((session) => session.weekday)))].sort((a, b) => a - b);
  return {
    title: requiredText(value.title, 'title', 100),
    summary: requiredText(value.summary, 'summary', 600),
    goalSummary: requiredText(value.goalSummary, 'goal summary', 300),
    feasibility: {
      status: value.feasibility?.status === 'ADJUSTED' ? 'ADJUSTED' : 'REALISTIC',
      message: requiredText(value.feasibility?.message, 'feasibility message', 500),
    },
    coachingSummary: requiredText(value.coachingSummary, 'coaching summary', 600),
    reasoningSummary: requiredText(value.reasoningSummary, 'reasoning summary', 600),
    recommendedDays: actualDays,
    estimatedWeeklyMinutes: weeks[0].estimatedTotalMinutes,
    phases,
    weeks,
  };
}

function cleanPersonalGrowthPlan(value, submission) {
  if (!value || typeof value !== 'object') throw new Error('Invalid personal growth plan response');
  const cycleWeeks = Number(submission.cycleWeeks);
  const availableDays = Array.isArray(submission.availableDays) ? submission.availableDays : [];
  const available = new Set(availableDays);
  const weeklyMinutes = Number(submission.weeklyMinutes);
  if (!Number.isInteger(cycleWeeks) || cycleWeeks <= 0 || !available.size || !Number.isFinite(weeklyMinutes)) throw new Error('Invalid personal growth availability');
  if (!Array.isArray(value.weeks) || value.weeks.length !== cycleWeeks) throw new Error('Invalid personal growth plan: week count');
  if (!Array.isArray(value.milestones) || !value.milestones.length) throw new Error('Invalid personal growth plan: milestones');

  const milestones = value.milestones.map((milestone, index) => ({
    id: `milestone-${index + 1}`,
    weekNumber: Math.min(cycleWeeks, Math.max(1, Number(milestone.weekNumber) || 1)),
    title: requiredText(milestone.title, 'milestone title', 120),
    purpose: requiredText(milestone.purpose, 'milestone purpose', 300),
    successSignal: requiredText(milestone.successSignal, 'milestone success signal', 300),
  }));
  const weeks = value.weeks.map((week, weekIndex) => {
    const weekNumber = weekIndex + 1;
    if (!Array.isArray(week.tasks) || !week.tasks.length) throw new Error(`Invalid personal growth plan: week ${weekNumber} tasks`);
    const tasks = week.tasks.map((task, taskIndex) => {
      const requestedWeekday = Number(task.weekday);
      const weekday = Number.isInteger(requestedWeekday) && available.has(requestedWeekday)
        ? requestedWeekday
        : availableDays[taskIndex % availableDays.length];
      const requestedMinutes = Number(task.totalMinutes);
      if (!Number.isFinite(requestedMinutes)) throw new Error(`Invalid personal growth plan: invalid task time in week ${weekNumber}`);
      const limit = dailyMinutes(submission, weekday);
      const totalMinutes = Math.min(limit, Math.max(1, Math.round(requestedMinutes)));
      return {
        id: `week-${weekNumber}-task-${taskIndex + 1}`,
        weekNumber,
        weekday,
        startTime: String(task.startTime ?? '').trim().slice(0, 5) || undefined,
        status: 'DRAFT',
        title: requiredText(task.title, 'task title', 120),
        totalMinutes,
        instructions: Array.isArray(task.instructions) && task.instructions.length >= 3 ? task.instructions.map((step, index) => requiredText(step, `task instruction ${index + 1}`, 300)) : (() => { throw new Error(`Invalid personal growth plan: incomplete instructions in week ${weekNumber}`); })(),
        completionCriteria: requiredText(task.completionCriteria, 'completion criteria', 300),
        easierFallback: requiredText(task.easierFallback, 'easier fallback', 300),
        coachingReason: requiredText(task.coachingReason, 'coaching reason', 300),
      };
    });
    const requestedWeeklyMinutes = tasks.reduce((total, task) => total + task.totalMinutes, 0);
    const scheduledTasks = requestedWeeklyMinutes > weeklyMinutes
      ? tasks.map((task) => ({ ...task, totalMinutes: Math.max(1, Math.floor(task.totalMinutes * weeklyMinutes / requestedWeeklyMinutes)) }))
      : tasks;
    return {
      id: `week-${weekNumber}`,
      weekNumber,
      status: 'DRAFT',
      focus: requiredText(week.focus, 'week focus', 300),
      estimatedTotalMinutes: scheduledTasks.reduce((total, task) => total + task.totalMinutes, 0),
      tasks: scheduledTasks,
    };
  });
  return {
    title: requiredText(value.title, 'title', 120),
    summary: requiredText(value.summary, 'summary', 700),
    goalSummary: requiredText(value.goalSummary, 'goal summary', 300),
    feasibility: { status: value.feasibility?.status === 'ADJUSTED' ? 'ADJUSTED' : 'REALISTIC', message: requiredText(value.feasibility?.message, 'feasibility message', 500) },
    coachingSummary: requiredText(value.coachingSummary, 'coaching summary', 700),
    reasoningSummary: requiredText(value.reasoningSummary, 'reasoning summary', 700),
    milestones,
    weeks,
  };
}

function projectOutcomeTerms(submission) {
  const raw = String(submission.outcome ?? '').replace(/\s+/g, '').trim();
  const generic = new Set(['完成', '一個', '個人', '可以', '可展', '展示', '成果', '專案', '學習', '成長', '建立', '開始', '計畫']);
  const latin = raw.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [];
  const han = raw.match(/[\u4e00-\u9fff]+/g) ?? [];
  const pairs = han.flatMap((word) => Array.from({ length: Math.max(0, word.length - 1) }, (_, index) => word.slice(index, index + 2)));
  return [...new Set([...latin, ...pairs].filter((term) => !generic.has(term)))].slice(0, 24);
}

function isProjectBasedPersonalGrowthSubmission(submission) {
  const templateValues = Object.values(submission.templateAnswers ?? {}).flat();
  return submission.preferredFormats?.includes('project') || templateValues.includes('small_project');
}

function cleanPersonalGrowthWeek(value, submission, expectedWeekNumber) {
  const availableDays = Array.isArray(submission.availableDays) ? submission.availableDays : [];
  const available = new Set(availableDays);
  const weeklyMinutes = Number(submission.weeklyMinutes);
  if (!available.size || !Number.isFinite(weeklyMinutes)) throw new Error('Invalid personal growth availability');
  if (Number(value?.weekNumber) !== expectedWeekNumber) throw new Error('Invalid personal growth plan: unexpected week number');
  if (!Array.isArray(value.tasks) || value.tasks.length !== 3) throw new Error(`Invalid personal growth plan: week ${expectedWeekNumber} needs exactly three tasks`);
  const tasks = value.tasks.map((task, taskIndex) => {
    const requestedWeekday = Number(task.weekday);
    const weekday = Number.isInteger(requestedWeekday) && available.has(requestedWeekday)
      ? requestedWeekday
      : availableDays[taskIndex % availableDays.length];
    const requestedMinutes = Number(task.totalMinutes);
    if (!Number.isFinite(requestedMinutes)) throw new Error(`Invalid personal growth plan: invalid task time in week ${expectedWeekNumber}`);
    const totalMinutes = Math.min(dailyMinutes(submission, weekday), Math.max(1, Math.round(requestedMinutes)));
    if (!Array.isArray(task.instructions) || task.instructions.length !== 3) throw new Error(`Invalid personal growth plan: week ${expectedWeekNumber} needs exactly three instructions`);
    return {
      id: `week-${expectedWeekNumber}-task-${taskIndex + 1}`,
      weekNumber: expectedWeekNumber,
      weekday,
      startTime: String(task.startTime ?? '').trim().slice(0, 5) || undefined,
      status: 'DRAFT',
      title: requiredText(task.title, 'task title', 160),
      totalMinutes,
      instructions: task.instructions.map((step, index) => requiredText(step, `task instruction ${index + 1}`, 500)),
      completionCriteria: requiredText(task.completionCriteria, 'completion criteria', 500),
      easierFallback: requiredText(task.easierFallback, 'easier fallback', 500),
      coachingReason: requiredText(task.coachingReason, 'coaching reason', 500),
    };
  });
  const requestedWeeklyMinutes = tasks.reduce((total, task) => total + task.totalMinutes, 0);
  const scheduledTasks = requestedWeeklyMinutes > weeklyMinutes
    ? tasks.map((task) => ({ ...task, totalMinutes: Math.max(1, Math.floor(task.totalMinutes * weeklyMinutes / requestedWeeklyMinutes)) }))
    : tasks;
  if (isProjectBasedPersonalGrowthSubmission(submission)) {
    const terms = projectOutcomeTerms(submission);
    const finalTaskText = [scheduledTasks.at(-1)?.title, scheduledTasks.at(-1)?.completionCriteria].join(' ').toLowerCase();
    if (terms.length && !terms.some((term) => finalTaskText.includes(term))) {
      throw new Error(`Invalid personal growth plan: final task must be tied to the project outcome (${terms.slice(0, 6).join(', ')})`);
    }
    const successDefinition = String(submission.successDefinition ?? '').replace(/\s+/g, '').toLowerCase();
    if (successDefinition.length >= 4 && !finalTaskText.replace(/\s+/g, '').includes(successDefinition)) {
      throw new Error('Invalid personal growth plan: final task must state the user success definition');
    }
  }
  return {
    id: `week-${expectedWeekNumber}`,
    weekNumber: expectedWeekNumber,
    status: 'DRAFT',
    focus: requiredText(value.focus, 'week focus', 400),
    estimatedTotalMinutes: scheduledTasks.reduce((total, task) => total + task.totalMinutes, 0),
    tasks: scheduledTasks,
  };
}

function cleanPersonalGrowthWeeklyPlan(value, submission, expectedWeekNumber) {
  if (!value || typeof value !== 'object') throw new Error('Invalid personal growth weekly plan response');
  return {
    title: requiredText(value.title, 'title', 160),
    summary: requiredText(value.summary, 'summary', 900),
    goalSummary: requiredText(value.goalSummary, 'goal summary', 500),
    feasibility: { status: value.feasibility?.status === 'ADJUSTED' ? 'ADJUSTED' : 'REALISTIC', message: requiredText(value.feasibility?.message, 'feasibility message', 600) },
    coachingSummary: requiredText(value.coachingSummary, 'coaching summary', 900),
    reasoningSummary: requiredText(value.reasoningSummary, 'reasoning summary', 900),
    week: cleanPersonalGrowthWeek(value.week, submission, expectedWeekNumber),
  };
}

const personalGrowthPlanInstruction = `You are Go Go Goal's senior personal-growth learning designer, not a generic motivational assistant. Generate one rigorous, compassionate and executable Personal Growth week in Traditional Chinese from the supplied submission only.

INPUT BOUNDARIES
- The submission is the only authority for the user's goal, current level, availability, preferences, constraints and success definition. Do not invent user facts, courses, credentials, outcomes or personal history.
- Do not diagnose, prescribe treatment, promise outcomes or require a paid resource. If the goal is too large for the cycle and capacity, set feasibility.status to ADJUSTED and state the smallest useful first milestone.
- Use only availableDays. Keep each task within that day's time window and the week's total at or below weeklyMinutes. Normally use 70 to 80% of weeklyMinutes to leave catch-up space.

WEEKLY PLANNING STANDARD
- Generate only the requested week. Do not create a roadmap, milestones, placeholder tasks, advice, or schedule for later weeks; later weeks will be planned after the user reports real progress.
- The week must build toward a visible success signal. Every task title must name an action plus a concrete decision, artifact, test, or deliverable—not merely a topic. Never use vague standalone tasks such as "learn", "practice", "research" or "stay motivated". For example, do not make "research programming languages" a task; make a bounded comparison with recorded decision criteria, then a small working or visible artifact.
- Week 1 must end with at least one visible artifact, demonstrated action, or recorded decision in the chosen goal. Setup, account creation, resource browsing, or environment installation may support an action but cannot be the only outcome of a task or the week's success signal.
- When the outcome is a project, use the outcome and successDefinition to make a minimum vertical slice during week 1. The three tasks should normally produce: (1) a small input/output or scope decision artifact, (2) the first concrete behaviour or content, and (3) an end-to-end check against one part of the success definition. Tool choice and setup may appear only as a short instruction inside a task; they must never be a task title or its primary completion criterion. A "Hello World" result alone is not a project slice.
- At least two task titles and every completionCriteria must name a noun or behaviour from the user's outcome or successDefinition. State any default tool choice as an editable recommendation, not as a fact about the user.
- Each task needs exactly three observable instructions: prepare, do focused work, then preserve a short record or review. completionCriteria must name visible evidence. easierFallback must be a real 10 to 15 minute version that preserves the next step. coachingReason explains why the task belongs in this particular week.
- When a resource helps, include it naturally in an instruction as an exploration suggestion: platform or resource type only when confident, a precise search phrase, why it fits the level, and likely free or paid status. Never write any URL, domain, hyperlink, course title, current availability or a YouTube channel. Do not output text such as ".com", "www", "http" or a Markdown link.
- Match preferred formats and language. Do not overload this week with resources: one core direction and at most two optional explorations.

INTERNAL QUALITY GATE
Before returning JSON, silently repair generic, duplicate, unsupported, over-budget, evidence-free, fallback-free, or abruptly difficult tasks. Do not reveal hidden reasoning.

OUTPUT CONTRACT
- Return only the supplied JSON schema and exactly one week object with the requested weekNumber. Do not add Markdown, citations, new fields, milestones, or future weeks.
- Keep summaries concise but make task instructions, completion criteria, fallback and coaching reason detailed enough to follow.`;

const personalGrowthNextWeekInstruction = `You are Go Go Goal's senior personal-growth learning designer. Generate exactly one next Personal Growth week in Traditional Chinese from the original submission, completed week history, and the latest weekly review.

Preserve the original goal and success definition. Use the review as evidence: adjust task amount, order, difficulty, and resource direction to respond to actual minutes, difficulty, obstacle, evidence, and confidence. Never silently change the target date or cycle length. Explain user-facing changes and the reason in reasoningSummary.

Use only availableDays, daily time windows, and at most weeklyMinutes; normally keep a 20 to 30% buffer. Produce exactly three observable instructions per task, visible completion evidence, a genuine 10 to 15 minute fallback, and a goal-specific coaching reason. Generate only the requested next week—never regenerate prior weeks, make a future roadmap, or invent facts, links, courses, channels, credentials, or personal history. Return only the supplied JSON schema.`;

function personalGrowthOutcomeAnchor(submission) {
  const projectBased = isProjectBasedPersonalGrowthSubmission(submission);
  const target = JSON.stringify({ outcome: submission.outcome, successDefinition: submission.successDefinition });
  if (!projectBased) return `OUTCOME ANCHOR: Keep every task directly tied to this user-defined outcome and success definition: ${target}`;
  return `NON-NEGOTIABLE PROJECT OUTCOME ANCHOR: ${target}\nThe user has already chosen this exact project in outcome. Never ask them to list project ideas, choose another project, or write a generic project definition. Do not substitute generic skill learning, language comparison, environment setup, tutorials, or Hello World for the user's project. If the tool is unspecified, choose one simple editable default inside the first task and use it immediately. Return exactly three sequential tasks. The final task must implement and test one working vertical slice of the stated success definition. Its completionCriteria must include this exact success definition verbatim: "${submission.successDefinition}". Every task title and completion criterion must name a decision, input, behaviour, or output from this specific project.`;
}

const personalGrowthRevisionInstruction = `You are Go Go Goal's senior personal-growth learning designer. Revise the supplied personal-growth plan in Traditional Chinese using only the submission, the current plan and the user's requested feedback.

Keep the user's goal, success definition, available days, time limits, preferences and constraints intact. Make the smallest useful change: preserve working progress, reduce or split work when the user needs an easier start, and never increase difficulty merely because the user asks for more challenge without clear evidence. If a date or capacity conflict would require changing the overall target, explain the trade-off in reasoningSummary instead of silently changing the goal.

Return the complete plan in the same schema. Keep week 1 or the next actionable work concrete: each task needs exactly three observable instructions, a visible completion criterion, a real 10 to 15 minute fallback and a goal-specific coaching reason. Keep later weeks as adaptable milestone checkpoints. Respect weeklyMinutes, daily time windows and availableDays; normally leave a 20 to 30% weekly buffer. Resource suggestions may appear only as careful exploration instructions with a search phrase and no invented links, courses or channels.

Before returning JSON, silently repair vague, duplicated, over-budget or unsupported tasks. Use reasoningSummary to state what changed and why in user-facing language; do not expose hidden reasoning. Return only valid JSON using the supplied schema and exactly cycleWeeks consecutive weeks.`;

export function buildGeminiRequest(input) {
  if (input?.kind === 'personal-growth-revision') {
    const submission = sanitizePersonalGrowthSubmission(input.submission);
    const currentPlan = sanitizePersonalGrowthPlanForRevision(input.currentPlan);
    const allowedFeedback = new Set(['START_EASIER', 'MORE_CHALLENGE', 'ADJUST_DAY']);
    if (!allowedFeedback.has(input.feedback)) throw new Error('Invalid personal growth plan feedback');
    const reason = String(input.reason ?? '').trim().slice(0, 500);
    return {
      system_instruction: {
        parts: [{ text: personalGrowthRevisionInstruction }],
      },
      contents: [{ role: 'user', parts: [{ text: `Revise this personal growth draft only.\nFeedback: ${input.feedback}\nOptional reason: ${reason || '(none)'}\nSubmission:\n${JSON.stringify(submission)}\nCurrent plan:\n${JSON.stringify(currentPlan)}` }] }],
      generationConfig: jsonGenerationConfig(personalGrowthPlanSchema, 32768),
    };
  }

  if (input?.kind === 'personal-growth-plan') {
    const submission = sanitizePersonalGrowthSubmission(input.submission);
    return {
      system_instruction: {
        parts: [{ text: personalGrowthPlanInstruction }],
      },
      contents: [{ role: 'user', parts: [{ text: `Create only week 1 from this Personal Growth submission. Requested weekNumber: 1.\nSubmission:\n${JSON.stringify(submission)}\n${personalGrowthOutcomeAnchor(submission)}` }] }],
      generationConfig: jsonGenerationConfig(personalGrowthWeeklyPlanSchema, 8192),
    };
  }

  if (input?.kind === 'personal-growth-week-plan') {
    const submission = sanitizePersonalGrowthSubmission(input.submission);
    const goal = sanitizePersonalGrowthGoalForWeek(input.goal);
    const review = sanitizePersonalGrowthWeeklyReview(input.review);
    const expectedWeekNumber = goal.weeks.length + 1;
    if (!Number.isInteger(goal.cycleWeeks) || goal.cycleWeeks !== Number(submission.cycleWeeks) || expectedWeekNumber > goal.cycleWeeks) throw new Error('Invalid personal growth next-week context');
    if (review.weekNumber !== expectedWeekNumber - 1) throw new Error('Invalid personal growth weekly review week');
    return {
      system_instruction: {
        parts: [{ text: personalGrowthNextWeekInstruction }],
      },
      contents: [{ role: 'user', parts: [{ text: `Create only the requested next week. Requested weekNumber: ${expectedWeekNumber}.\nOriginal submission:\n${JSON.stringify(submission)}\n${personalGrowthOutcomeAnchor(submission)}\nGoal and completed week history:\n${JSON.stringify(goal)}\nLatest weekly review:\n${JSON.stringify(review)}` }] }],
      generationConfig: jsonGenerationConfig(personalGrowthWeeklyPlanSchema, 8192),
    };
  }

  if (input?.kind === 'initial-coaching-revision') {
    const submission = sanitizeSubmission(input.submission);
    const currentPlan = sanitizePlanForRevision(input.currentPlan);
    const allowedFeedback = new Set(['START_EASIER', 'MORE_CHALLENGE', 'ADJUST_DAY']);
    if (!allowedFeedback.has(input.feedback)) throw new Error('Invalid plan feedback');
    const reason = String(input.reason ?? '').trim().slice(0, 500);
    return {
      system_instruction: {
        parts: [{
          text: 'You revise a complete eight-week Go Go Goal beginner running plan in Traditional Chinese. Make the smallest useful change that answers the athlete feedback. Never treat MORE_CHALLENGE as an instruction to increase load: first evaluate the onboarding evidence and preserve safety, availability, realistic frequency, daily time limits, recovery spacing, and beginner-friendly progression. Return the entire revised plan using the same schema. Do not change or invent user facts. Do not diagnose, prescribe medical treatment, promise outcomes, add pace targets, or claim future adaptive coaching.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Revise this Draft only.\nFeedback: ${input.feedback}\nOptional reason: ${reason || '(none)'}\nNecessary onboarding submission:\n${JSON.stringify(submission)}\nCurrent plan:\n${JSON.stringify(currentPlan)}` }],
      }],
      generationConfig: jsonGenerationConfig(initialPlanSchema, 8192),
    };
  }

  if (input?.kind === 'initial-coaching-plan') {
    const submission = sanitizeSubmission(input.submission);
    return {
      system_instruction: {
        parts: [{
          text: 'You are the warm but serious running coach for Go Go Goal. Generate a complete conservative eight-week Initial Coaching Plan in Traditional Chinese. Availability is only a possible time window, not a commitment: choose a sustainable subset based on realistic frequency and recovery. Exact values may be used directly, approximate values must be interpreted conservatively, and unknown values must never be guessed. Every beginner-facing session must explain exactly what to do, include at least three steps, RPE, a talk test, focus, an easier fallback, and a coaching reason. Do not diagnose, prescribe medical treatment, promise weight loss, invent pace targets, or provide high-intensity intervals. If the requested race goal is unrealistic in eight weeks, set feasibility to ADJUSTED and give a safer first-block milestone. Future weeks are a roadmap, not adaptive promises.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Create the complete eight-week plan from this necessary coaching submission only:\n${JSON.stringify(submission)}` }],
      }],
      generationConfig: jsonGenerationConfig(initialPlanSchema, 8192),
    };
  }

  if (input?.kind === 'running-plan') {
    if (!input.assessment || typeof input.assessment !== 'object') throw new Error('Invalid running assessment');
    return {
      system_instruction: {
        parts: [{
          text: 'You create conservative, editable beginner running plan drafts. Reply in Traditional Chinese. Never diagnose, prescribe medical treatment, or override safety screening. Use only weekdays the user says are available. Keep the intensity conversational and the plan realistic.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Create a running plan draft from this assessment:\n${JSON.stringify(input.assessment)}` }],
      }],
      generationConfig: jsonGenerationConfig(planSchema),
    };
  }

  if (input?.kind === 'photo-encouragement') {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(input.mimeType)) {
      throw new Error('Unsupported image type');
    }
    if (typeof input.imageBase64 !== 'string' || !input.imageBase64.length) throw new Error('Missing image');
    return {
      system_instruction: {
        parts: [{
          text: 'Reply in Traditional Chinese with exactly one short, positive exercise encouragement. Do not identify anyone or infer age, gender, identity, body shape, health, disability, emotion, location, or whether exercise truly occurred. Do not mention other people. The photo is only context for a supportive message.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: input.mimeType, data: input.imageBase64 } },
          { text: 'Provide one brief positive encouragement for this private running check-in.' },
        ],
      }],
      generationConfig: jsonGenerationConfig(encouragementSchema),
    };
  }

  throw new Error('Unsupported request kind');
}

export function parseGeminiJson(response) {
  const text = response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

/** Maps the existing validated prompt and schema to the Vertex AI SDK shape. */
export function buildVertexRequest(input) {
  const request = buildGeminiRequest(input);
  const systemText = request.system_instruction?.parts?.map((part) => part.text ?? '').join('\n').trim();
  return {
    contents: request.contents.map((content) => ({
      role: content.role,
      parts: content.parts.map((part) => part.inline_data
        ? { inlineData: { mimeType: part.inline_data.mime_type, data: part.inline_data.data } }
        : { text: part.text ?? '' }),
    })),
    config: {
      ...request.generationConfig,
      responseJsonSchema: request.generationConfig.responseSchema,
      responseSchema: undefined,
      ...(systemText ? { systemInstruction: systemText } : {}),
    },
  };
}

function parseVertexJson(response) {
  const text = typeof response?.text === 'string'
    ? response.text.trim()
    : response?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) throw new Error('Vertex AI returned no text');
  return JSON.parse(text);
}

function cleanGeneratedValue(input, value) {
  if (input.kind === 'initial-coaching-plan' || input.kind === 'initial-coaching-revision') return cleanInitialPlan(value, sanitizeSubmission(input.submission));
  if (input.kind === 'personal-growth-plan') return cleanPersonalGrowthWeeklyPlan(value, sanitizePersonalGrowthSubmission(input.submission), 1);
  if (input.kind === 'personal-growth-week-plan') {
    const goal = sanitizePersonalGrowthGoalForWeek(input.goal);
    return cleanPersonalGrowthWeeklyPlan(value, sanitizePersonalGrowthSubmission(input.submission), goal.weeks.length + 1);
  }
  if (input.kind === 'personal-growth-revision') return cleanPersonalGrowthPlan(value, sanitizePersonalGrowthSubmission(input.submission));
  if (input.kind === 'running-plan') return cleanPlan(value, input.assessment);
  const text = String(value.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!text) throw new Error('Gemini returned an empty encouragement');
  return { text };
}

async function generateWithVertex(input, options) {
  const project = options.project?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!project) throw new Error('GOOGLE_CLOUD_PROJECT is required for Vertex AI');
  const location = options.location?.trim() || process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'global';
  const model = options.model || process.env.VERTEX_AI_MODEL?.trim() || 'gemini-2.5-flash';
  const client = options.vertexClient ?? new GoogleGenAI({ vertexai: true, project, location, apiVersion: 'v1' });
  const request = { model, ...buildVertexRequest(input) };
  const canRetry = input.kind === 'personal-growth-plan' || input.kind === 'personal-growth-week-plan' || input.kind === 'personal-growth-revision';
  const maxAttempts = canRetry ? 4 : 1;
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await client.models.generateContent(request);
      return cleanGeneratedValue(input, parseVertexJson(response));
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      const qualityRepairable = canRetry && /Invalid personal growth plan/i.test(message);
      if (qualityRepairable && attempt < maxAttempts - 1) {
        const repair = 'QUALITY REPAIR: The previous candidate was invalid. Return exactly three detailed sequential tasks. For a project outcome, use the exact user-selected project and success definition; do not output generic project ideas, tool comparison, setup-only work, tutorials, or Hello World.';
        request.contents = request.contents.map((content) => ({
          ...content,
          parts: content.parts.map((part) => part.text ? { ...part, text: `${part.text}\n${repair}` } : part),
        }));
        continue;
      }
      const permanent = /permission|credential|unauthenticated|forbidden|invalid argument|not found/i.test(message);
      const transient = /resource exhausted|429|503|unavailable|deadline exceeded|timeout/i.test(message);
      if (attempt === maxAttempts - 1 || permanent || !transient) throw error;
      const baseDelay = Number.isFinite(options.retryDelayMs) ? Math.max(0, options.retryDelayMs) : 1_000 * (2 ** attempt);
      const jitter = Number.isFinite(options.retryDelayMs) ? 0 : Math.floor(Math.random() * 300);
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }
  throw lastError ?? new Error('Vertex AI request failed');
}

function cleanPlan(value, assessment) {
  const available = new Set(Array.isArray(assessment.availableDays) ? assessment.availableDays : []);
  const weekdays = Array.isArray(value.weekdays)
    ? [...new Set(value.weekdays.filter((day) => Number.isInteger(day) && available.has(day)))]
    : [];
  return {
    title: String(value.title ?? '').trim().slice(0, 80),
    summary: String(value.summary ?? '').trim().slice(0, 500),
    weekdays: weekdays.length ? weekdays : [...available],
    minutesPerRun: Math.min(120, Math.max(15, Number(value.minutesPerRun) || Number(assessment.minutesPerRun) || 30)),
    cycleWeeks: Math.min(16, Math.max(2, Number(value.cycleWeeks) || 8)),
    targetRate: Math.min(1, Math.max(0.5, Number(value.targetRate) || 0.8)),
  };
}

export async function generateWithGemini(input, options) {
  if (options.provider === 'vertex') return generateWithVertex(input, options);
  const { apiKey, model = 'gemini-3.1-flash-lite', fetchImpl = fetch } = options;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const request = buildGeminiRequest(input);
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini API ${response.status}: ${details.slice(0, 300)}`);
  }
  return cleanGeneratedValue(input, parseGeminiJson(await response.json()));
}
