import AsyncStorage from '@react-native-async-storage/async-storage';

import { Account, AppData, defaultGoalClassification, defaultOnboardingSubmission, GoalClassification, OnboardingSubmission, PersonalGrowthGoal, PersonalGrowthOnboardingDraft, PersonalGrowthPlanDraft, PersonalGrowthWeeklyReview, RunningPlanDraft } from './domain';
import { isValidTimezone } from './time';
import { normalisePersonalGrowthPlanDraft, normalisePersonalGrowthSubmission } from './personal-growth';

const STORAGE_KEY = '@go-go-goal/v1';

export const emptyAppData = (): AppData => ({ accounts: [] });

export function normaliseGoalClassification(value: unknown): GoalClassification {
  if (!value || typeof value !== 'object') return { ...defaultGoalClassification };
  const candidate = value as Partial<GoalClassification>;
  const category = ['health', 'wealth', 'career', 'relationships', 'personal_growth', 'leisure', 'environment', 'meaning'].includes(String(candidate.category))
    ? candidate.category as GoalClassification['category']
    : defaultGoalClassification.category;
  const subcategory = candidate.subcategory === 'exercise' ? 'exercise' : defaultGoalClassification.subcategory;
  const activity = ['running', 'strength_training', 'swimming', 'cycling', 'walking', 'ball_sports', 'other'].includes(String(candidate.activity))
    ? candidate.activity as GoalClassification['activity']
    : defaultGoalClassification.activity;
  return { category, subcategory, activity };
}

function normaliseSubmission(submission: OnboardingSubmission): OnboardingSubmission {
  const source = submission ?? defaultOnboardingSubmission;
  return { ...source, goal: { ...source.goal, classification: normaliseGoalClassification(source.goal?.classification) } };
}

/**
 * The first Personal Growth direction screen was removed from the onboarding
 * flow. Existing drafts still use the old five-step numbering, so map them to
 * the equivalent step in the new four-step flow when they are loaded.
 */
function normalisePersonalGrowthStep(value: unknown): PersonalGrowthOnboardingDraft['currentStep'] {
  const step = Number(value);
  if (!Number.isInteger(step) || step <= 1) return 0;
  if (step === 2) return 1;
  if (step === 3) return 2;
  return 3;
}

function normaliseWeeklyReview(value: unknown): PersonalGrowthWeeklyReview | null {
  if (!value || typeof value !== 'object') return null;
  const review = value as Partial<PersonalGrowthWeeklyReview>;
  const confidence = Math.min(5, Math.max(1, Number(review.confidence) || 3)) as PersonalGrowthWeeklyReview['confidence'];
  const difficulty = ['easy', 'suitable', 'hard'].includes(String(review.difficulty)) ? review.difficulty as PersonalGrowthWeeklyReview['difficulty'] : 'suitable';
  if (!Number.isInteger(Number(review.weekNumber)) || Number(review.weekNumber) < 1) return null;
  return {
    id: typeof review.id === 'string' ? review.id : `growth-review-${review.weekNumber}`,
    weekNumber: Number(review.weekNumber),
    createdAt: typeof review.createdAt === 'string' ? review.createdAt : new Date(0).toISOString(),
    actualMinutes: Math.max(0, Math.min(600, Number(review.actualMinutes) || 0)),
    difficulty,
    obstacle: String(review.obstacle ?? '').slice(0, 500),
    evidence: String(review.evidence ?? '').slice(0, 700),
    confidence,
    reflection: typeof review.reflection === 'string' ? review.reflection.slice(0, 700) : undefined,
  };
}

function normalisePersonalGrowthGoal(goal: PersonalGrowthGoal): PersonalGrowthGoal {
  const plan = normalisePersonalGrowthPlanDraft(goal.plan, goal.startDate);
  const reviews = Array.isArray(goal.weeklyReviews) ? goal.weeklyReviews.map(normaliseWeeklyReview).filter((review): review is PersonalGrowthWeeklyReview => Boolean(review)) : [];
  // Older versions generated every future week at once. Keep only completed history
  // plus the first still-active week so the new adaptive cycle can take over safely.
  const firstActiveIndex = plan.weeks.findIndex((week) => week.status === 'PLANNED' || week.tasks.some((task) => task.status === 'PLANNED'));
  const adaptiveWeeks = reviews.length || firstActiveIndex < 0 ? plan.weeks : plan.weeks.slice(0, firstActiveIndex + 1);
  return {
    ...goal,
    classification: { category: 'personal_growth', subcategory: 'growth' },
    plan: { ...plan, weeks: adaptiveWeeks, classification: { category: 'personal_growth', subcategory: 'growth' } },
    weeklyReviews: reviews,
  };
}

export function normaliseAccount(account: Account): Account {
  return {
    ...account,
    drafts: Array.isArray(account.drafts)
      ? account.drafts.filter((draft): draft is RunningPlanDraft => draft?.schemaVersion === 'initial-coaching-plan/v1' && Array.isArray(draft.weeks)).map((draft) => ({
          ...draft,
          submission: normaliseSubmission(draft.submission),
          classification: normaliseGoalClassification(draft.classification ?? draft.submission?.goal?.classification),
        }))
      : [],
    goals: Array.isArray(account.goals) ? account.goals.map((goal) => ({ ...goal, classification: normaliseGoalClassification(goal.classification) })) : [],
    onboardingDraft: account.onboardingDraft ? { ...account.onboardingDraft, submission: normaliseSubmission(account.onboardingDraft.submission) } : undefined,
    personalGrowthDrafts: Array.isArray(account.personalGrowthDrafts)
      ? account.personalGrowthDrafts.filter((draft): draft is PersonalGrowthPlanDraft => draft?.schemaVersion === 'personal-growth-plan/v1' && Array.isArray(draft.weeks)).map((draft) => ({
          ...normalisePersonalGrowthPlanDraft(draft, String(draft.createdAt ?? '').slice(0, 10) || '2026-01-01'),
          weeks: draft.weeks.slice(0, 1),
          classification: { category: 'personal_growth', subcategory: 'growth' },
        }))
      : [],
    personalGrowthGoals: Array.isArray(account.personalGrowthGoals)
      ? account.personalGrowthGoals.map((goal) => normalisePersonalGrowthGoal(goal))
      : [],
    personalGrowthOnboardingDraft: account.personalGrowthOnboardingDraft ? {
      ...account.personalGrowthOnboardingDraft,
      currentStep: normalisePersonalGrowthStep(account.personalGrowthOnboardingDraft.currentStep),
      submission: normalisePersonalGrowthSubmission(account.personalGrowthOnboardingDraft.submission),
    } : undefined,
  };
}

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyAppData();
  const parsed = JSON.parse(raw) as Partial<AppData>;
  return {
    sessionAccountId: typeof parsed.sessionAccountId === 'string' ? parsed.sessionAccountId : undefined,
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map((account) => normaliseAccount(account)) : [],
  };
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loginLocally(data: AppData, rawEmail: string, timezone: string): { data: AppData; account: Account } {
  const email = rawEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('請輸入有效的電郵地址。');
  const safeTimezone = isValidTimezone(timezone) ? timezone : 'Asia/Hong_Kong';
  const existing = data.accounts.find((account) => account.email === email);
  const account: Account = existing ?? {
    id: `account-${Date.now()}`,
    email,
    timezone: safeTimezone,
    photoAnalysisConsent: false,
    notificationPermission: 'undetermined',
    drafts: [],
    goals: [],
    personalGrowthDrafts: [],
    personalGrowthGoals: [],
  };
  return {
    account,
    data: {
      ...data,
      sessionAccountId: account.id,
      accounts: existing ? data.accounts : [account, ...data.accounts],
    },
  };
}

export function replaceAccount(data: AppData, account: Account): AppData {
  return { ...data, accounts: data.accounts.map((item) => item.id === account.id ? account : item) };
}
