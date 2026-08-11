import AsyncStorage from '@react-native-async-storage/async-storage';

import { Account, AppData, defaultGoalClassification, defaultOnboardingSubmission, GoalClassification, OnboardingSubmission, PersonalGrowthPlanDraft, RunningPlanDraft } from './domain';
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
          classification: { category: 'personal_growth', subcategory: 'growth' },
        }))
      : [],
    personalGrowthGoals: Array.isArray(account.personalGrowthGoals)
      ? account.personalGrowthGoals.map((goal) => ({ ...goal, classification: { category: 'personal_growth' as const, subcategory: 'growth' as const }, plan: { ...normalisePersonalGrowthPlanDraft(goal.plan, goal.startDate), classification: { category: 'personal_growth' as const, subcategory: 'growth' as const } } }))
      : [],
    personalGrowthOnboardingDraft: account.personalGrowthOnboardingDraft ? { ...account.personalGrowthOnboardingDraft, submission: normalisePersonalGrowthSubmission(account.personalGrowthOnboardingDraft.submission) } : undefined,
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
