import { File } from 'expo-file-system';

import { CheckInPhoto, OnboardingSubmission, PersonalGrowthGoal, PersonalGrowthPlanDraft, PersonalGrowthSubmission, PersonalGrowthWeeklyReview, PlanPhase, PlanWeek, RunningAssessment, RunningPlanDraft, Weekday } from './domain';
import { InitialCoachingWorkflow, PlanFeedback } from './coaching';
import { RemotePersonalGrowthPlan, RemotePersonalGrowthWeeklyPlan, mergeRemotePersonalGrowthPlan, mergeRemotePersonalGrowthWeeklyPlan } from './personal-growth';

type RemotePlan = Pick<RunningPlanDraft, 'title' | 'summary' | 'weekdays' | 'minutesPerRun' | 'cycleWeeks' | 'targetRate'>;
type EncouragementResult = { text: string; analysis: CheckInPhoto['analysis'] };
type RemoteInitialPlan = {
  title: string;
  summary: string;
  goalSummary: string;
  feasibility: RunningPlanDraft['feasibility'];
  coachingSummary: string;
  reasoningSummary: string;
  recommendedDays: Weekday[];
  estimatedWeeklyMinutes: number;
  phases: PlanPhase[];
  weeks: PlanWeek[];
};
const fallbackMessages = [
  '你已經出發了，今天的承諾正在成形。',
  '很好，保持舒服節奏，把今天完成。',
  '這一步有被記錄下來，繼續穩穩前進。',
  '你正在兌現對自己的承諾，做得好。',
];

function backendUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_GO_GOAL_AI_URL?.trim() || undefined;
}

export function isAiBackendConfigured(): boolean {
  return Boolean(backendUrl());
}

async function post<T>(body: object): Promise<T> {
  const url = backendUrl();
  if (!url) throw new Error('AI backend is not configured');
  const controller = new AbortController();
  // A detailed weekly plan can still need retries when Vertex's shared capacity is busy.
  // Keep this below common serverless request ceilings while allowing it to finish.
  const timeout = setTimeout(() => controller.abort(), 3 * 60_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { error?: unknown } | null;
      const message = typeof errorBody?.error === 'string' ? errorBody.error : `AI backend returned ${response.status}`;
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function improvePlanWithGemini(assessment: RunningAssessment, fallback: RunningPlanDraft): Promise<RunningPlanDraft> {
  try {
    const result = await post<RemotePlan>({ kind: 'running-plan', assessment });
    return {
      ...fallback,
      title: result.title?.trim() || fallback.title,
      summary: result.summary?.trim() || fallback.summary,
      weekdays: result.weekdays?.length ? result.weekdays : fallback.weekdays,
      minutesPerRun: Math.min(120, Math.max(15, Number(result.minutesPerRun) || fallback.minutesPerRun)),
      cycleWeeks: Math.min(16, Math.max(2, Number(result.cycleWeeks) || fallback.cycleWeeks)),
      targetRate: Math.min(1, Math.max(0.5, Number(result.targetRate) || fallback.targetRate)),
    };
  } catch {
    return fallback;
  }
}

function mergeInitialPlan(remote: RemoteInitialPlan, fallback: RunningPlanDraft, planVersion: number): RunningPlanDraft | null {
  const candidate: RunningPlanDraft = {
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
    phases: remote.phases,
    weeks: remote.weeks,
    weekdays: remote.recommendedDays,
    estimatedWeeklyMinutes: remote.estimatedWeeklyMinutes,
    minutesPerRun: Math.round(remote.estimatedWeeklyMinutes / Math.max(1, remote.recommendedDays.length)),
  };
  return new InitialCoachingWorkflow().validatePlan(candidate.submission, candidate).ok ? candidate : null;
}

export async function generateInitialPlanWithGemini(submission: OnboardingSubmission, fallback: RunningPlanDraft): Promise<RunningPlanDraft> {
  try {
    const remote = await post<RemoteInitialPlan>({ kind: 'initial-coaching-plan', submission });
    return mergeInitialPlan(remote, fallback, fallback.planVersion) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function generatePersonalGrowthPlanWithGemini(submission: PersonalGrowthSubmission, fallback: PersonalGrowthPlanDraft): Promise<PersonalGrowthPlanDraft> {
  const remote = await post<RemotePersonalGrowthWeeklyPlan>({ kind: 'personal-growth-plan', submission });
  const plan = mergeRemotePersonalGrowthWeeklyPlan(remote, fallback, fallback.planVersion);
  if (!plan) throw new Error('Gemini returned an incomplete personal growth plan');
  return plan;
}

export async function generateNextPersonalGrowthWeekWithGemini(
  goal: PersonalGrowthGoal,
  review: PersonalGrowthWeeklyReview,
  fallback: PersonalGrowthPlanDraft,
): Promise<PersonalGrowthPlanDraft> {
  const remote = await post<RemotePersonalGrowthWeeklyPlan>({
    kind: 'personal-growth-week-plan',
    submission: goal.plan.submission,
    goal: {
      title: goal.title,
      goalSummary: goal.plan.goalSummary,
      cycleWeeks: goal.cycleWeeks,
      weeklyMinutes: goal.plan.weeklyMinutes,
      weeks: goal.plan.weeks,
      weeklyReviews: goal.weeklyReviews,
    },
    review,
  });
  const plan = mergeRemotePersonalGrowthWeeklyPlan(remote, fallback, fallback.planVersion);
  if (!plan) throw new Error('Gemini returned an incomplete next-week plan');
  return plan;
}

export async function requestPersonalGrowthPlanRevision(
  draft: PersonalGrowthPlanDraft,
  feedback: 'START_EASIER' | 'MORE_CHALLENGE' | 'ADJUST_DAY',
  reason: string,
): Promise<PersonalGrowthPlanDraft | null> {
  try {
    const remote = await post<RemotePersonalGrowthPlan>({
      kind: 'personal-growth-revision',
      submission: draft.submission,
      currentPlan: draft,
      feedback,
      reason: reason.trim(),
    });
    return mergeRemotePersonalGrowthPlan(remote, draft, draft.planVersion + 1);
  } catch {
    return null;
  }
}

export async function requestInitialPlanRevision(
  draft: RunningPlanDraft,
  feedback: Exclude<PlanFeedback, 'SUITABLE'>,
  reason: string,
): Promise<RunningPlanDraft | null> {
  try {
    const remote = await post<RemoteInitialPlan>({
      kind: 'initial-coaching-revision',
      submission: draft.submission,
      currentPlan: draft,
      feedback,
      reason: reason.trim(),
    });
    return mergeInitialPlan(remote, draft, draft.planVersion + 1);
  } catch {
    return null;
  }
}

export async function encouragePhoto(uri: string, enabled: boolean): Promise<EncouragementResult> {
  if (!enabled) return { text: '相片已安全記錄。繼續完成今天的承諾。', analysis: 'disabled' };
  try {
    const file = new File(uri);
    const imageBase64 = await file.base64();
    const result = await post<{ text?: string }>({
      kind: 'photo-encouragement',
      imageBase64,
      mimeType: uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      constraints: 'Traditional Chinese. One short positive exercise encouragement. Do not infer identity, age, gender, body shape, health, emotion, or discuss other people.',
    });
    const text = result.text?.trim();
    if (!text) throw new Error('Empty encouragement');
    return { text: text.slice(0, 80), analysis: 'gemini' };
  } catch {
    return { text: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)], analysis: 'fallback' };
  }
}
