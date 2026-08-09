import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { Account } from './domain';

function storedPhotoDirectory(): Directory | null {
  if (Platform.OS === 'web') return null;
  return new Directory(Paths.document, 'go-go-goal-check-ins');
}

export async function pickAndStorePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('相片權限尚未允許，請到系統設定開啟後再試。');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.65,
  });
  if (result.canceled || !result.assets[0]) return null;
  if (Platform.OS === 'web') return result.assets[0].uri;
  const photoDirectory = storedPhotoDirectory();
  if (!photoDirectory) return result.assets[0].uri;
  photoDirectory.create({ idempotent: true, intermediates: true });
  const source = new File(result.assets[0].uri);
  const extension = source.extension || '.jpg';
  const destination = new File(photoDirectory, `check-in-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${extension}`);
  await source.copy(destination, { overwrite: false });
  return destination.uri;
}

export async function deleteStoredPhoto(uri: string): Promise<void> {
  try {
    const photoDirectory = storedPhotoDirectory();
    if (!photoDirectory) return;
    const file = new File(uri);
    if (file.exists && uri.startsWith(photoDirectory.uri)) file.delete();
  } catch {
    // Cleanup is idempotent; a missing file is already in the desired state.
  }
}

export async function cleanupExpiredPhotos(account: Account, now: Date): Promise<Account> {
  const cutoff = now.getTime() - 90 * 24 * 60 * 60_000;
  let changed = false;
  const goals = [] as Account['goals'];
  for (const goal of account.goals) {
    const records = [] as typeof goal.records;
    for (const record of goal.records) {
      const keep = [] as typeof record.photos;
      for (const photo of record.photos) {
        if (new Date(photo.uploadedAt).getTime() < cutoff) {
          changed = true;
          await deleteStoredPhoto(photo.uri);
        } else {
          keep.push(photo);
        }
      }
      records.push(keep.length === record.photos.length ? record : { ...record, photos: keep, note: record.note ?? '原始相片已依 90 天保存規則刪除。' });
    }
    goals.push(records === goal.records ? goal : { ...goal, records });
  }
  return changed ? { ...account, goals } : account;
}

export async function deleteAllAccountPhotos(account: Account): Promise<void> {
  for (const goal of account.goals) {
    for (const record of goal.records) {
      for (const photo of record.photos) await deleteStoredPhoto(photo.uri);
    }
  }
}
