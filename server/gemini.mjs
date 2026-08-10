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

const encouragementSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { text: { type: 'string' } },
  required: ['text'],
};

function jsonGenerationConfig(schema, maxOutputTokens = 512) {
  return {
    temperature: 0.4,
    maxOutputTokens,
    responseFormat: { text: { mimeType: 'application/json', schema } },
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
    goal: pick(value.goal, ['primaryReason', 'secondaryReasons', 'otherReason', 'raceDistance', 'targetDate', 'targetWeightChangeKg', 'specificTarget', 'desiredIdentityInThreeMonths', 'currentSituation']),
    ability: pick(value.ability, ['ageRange', 'recentRunningFrequency', 'recentRun', 'jogAbility', 'longestDistanceKm', 'hadRunningHabit', 'previousHabitDuration', 'previousRunsPerWeek']),
    recentActivity: pick(value.recentActivity, ['activeDays', 'weeklyTime', 'activityTypes', 'otherActivity']),
    availability: pick(value.availability, ['availableDays', 'realisticFrequency', 'timeByDay']),
    safety: pick(value.safety, ['hasChestPain', 'hasDizziness', 'hasHeartOrLungCondition', 'hasRunningPain', 'hasMedicalRestriction']),
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

const dailyTimeLimit = { '20_30': 30, '30_45': 45, '45_60': 60, '60_90': 90, '90_plus': 120, unknown: 30 };
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
        const limit = dailyTimeLimit[submission.availability?.timeByDay?.[weekday] ?? 'unknown'] ?? 30;
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

export function buildGeminiRequest(input) {
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
  const { apiKey, model = 'gemini-3.5-flash', fetchImpl = fetch } = options;
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
  const value = parseGeminiJson(await response.json());
  if (input.kind === 'initial-coaching-plan' || input.kind === 'initial-coaching-revision') {
    return cleanInitialPlan(value, sanitizeSubmission(input.submission));
  }
  if (input.kind === 'running-plan') return cleanPlan(value, input.assessment);
  const text = String(value.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!text) throw new Error('Gemini returned an empty encouragement');
  return { text };
}
