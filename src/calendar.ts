import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

import { Task } from './domain';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function getCalendarPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'unavailable';
  const result = await Calendar.getCalendarPermissionsAsync();
  return result.status as PermissionStatus;
}

export async function requestCalendarPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'unavailable';
  const result = await Calendar.requestCalendarPermissionsAsync();
  return result.status as PermissionStatus;
}

async function writableCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.find((calendar) => calendar.allowsModifications)?.id ?? null;
}

export type ExportResult = {
  created: number;
  failed: Task[];
  status: PermissionStatus;
};

export async function exportTasksToCalendar(tasks: Task[]): Promise<ExportResult> {
  let status = await getCalendarPermissionStatus();
  if (status !== 'granted') status = await requestCalendarPermission();
  if (status !== 'granted') return { created: 0, failed: tasks, status };
  const calendarId = await writableCalendarId();
  if (!calendarId) return { created: 0, failed: tasks, status };

  let created = 0;
  const failed: Task[] = [];
  for (const task of tasks) {
    try {
      await Calendar.createEventAsync(calendarId, {
        title: task.title,
        notes: task.description,
        startDate: new Date(task.startAt),
        endDate: new Date(task.endAt),
      });
      created += 1;
    } catch {
      failed.push(task);
    }
  }
  return { created, failed, status };
}
