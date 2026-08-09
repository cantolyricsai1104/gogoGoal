import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppData } from './domain';

const STORAGE_KEY = '@focus-goal/v1';

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { goals: [] };
  const parsed = JSON.parse(raw) as AppData;
  return { goals: Array.isArray(parsed.goals) ? parsed.goals : [] };
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
