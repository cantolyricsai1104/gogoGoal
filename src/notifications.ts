import { Platform } from 'react-native';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';

import { Account, RunningGoal } from './domain';
import { zonedDateTime } from './time';

setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<Account['notificationPermission']> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    if (Platform.OS === 'android') {
      await setNotificationChannelAsync('running-commitment', {
        name: '跑步承諾',
        importance: AndroidImportance.HIGH,
      });
    }
    const current = await getPermissionsAsync();
    const result = current.status === 'granted' ? current : await requestPermissionsAsync();
    return result.status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function scheduleRunningReminders(goal: RunningGoal, account: Account): Promise<void> {
  if (account.notificationPermission !== 'granted' || Platform.OS === 'web') return;
  const now = new Date();
  const upcoming = goal.records.filter((record) => record.date >= goal.startDate && record.status === 'planned').slice(0, 60);
  for (const record of upcoming) {
    const morning = zonedDateTime(record.date, 10, 0, account.timezone);
    const evening = zonedDateTime(record.date, 20, 0, account.timezone);
    if (morning > now) {
      await scheduleNotificationAsync({
        content: { title: 'Go Go Goal', body: '今天有跑步承諾。你可以自行選擇時間，但記得完成兩次相片打卡。', data: { goalId: goal.id, date: record.date } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: morning, channelId: 'running-commitment' },
      });
    }
    if (evening > now) {
      await scheduleNotificationAsync({
        content: { title: '今天的承諾仍未結束', body: '你今天有原定的跑步。請現在完成，或明天如實處理缺席；不要讓一次缺席變成放棄。', data: { goalId: goal.id, date: record.date } },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: evening, channelId: 'running-commitment' },
      });
    }
  }
}

export async function cancelRunningReminders(): Promise<void> {
  if (Platform.OS !== 'web') await cancelAllScheduledNotificationsAsync();
}
