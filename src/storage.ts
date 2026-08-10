import AsyncStorage from '@react-native-async-storage/async-storage';

import { Account, AppData, RunningPlanDraft } from './domain';
import { isValidTimezone } from './time';

const STORAGE_KEY = '@go-go-goal/v1';

export const emptyAppData = (): AppData => ({ accounts: [] });

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyAppData();
  const parsed = JSON.parse(raw) as Partial<AppData>;
  return {
    sessionAccountId: typeof parsed.sessionAccountId === 'string' ? parsed.sessionAccountId : undefined,
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map((account) => ({
      ...account,
      drafts: Array.isArray(account.drafts)
        ? account.drafts.filter((draft): draft is RunningPlanDraft => draft?.schemaVersion === 'initial-coaching-plan/v1' && Array.isArray(draft.weeks))
        : [],
      goals: Array.isArray(account.goals) ? account.goals : [],
    })) : [],
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
