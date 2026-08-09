import { Weekday } from './domain';

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function zonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

export function dateKeyInZone(date: Date, timezone: string): string {
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function minutesInZone(date: Date, timezone: string): number {
  const parts = zonedParts(date, timezone);
  return parts.hour * 60 + parts.minute;
}

export function minutesUntilSecondPhoto(uploadedAt: string | undefined, now: Date): number {
  if (!uploadedAt) return 0;
  const elapsed = Math.max(0, now.getTime() - new Date(uploadedAt).getTime());
  return Math.max(0, Math.ceil((15 * 60_000 - elapsed) / 60_000));
}

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayForDateKey(dateKey: string): Weekday {
  return new Date(`${dateKey}T12:00:00.000Z`).getUTCDay() as Weekday;
}

export function nextMonday(dateKey: string): string {
  const weekday = weekdayForDateKey(dateKey);
  const distance = weekday === 0 ? 1 : 8 - weekday;
  return addDays(dateKey, distance);
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function zonedDateTime(dateKey: string, hour: number, minute: number, timezone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desiredUtc;
  for (let index = 0; index < 3; index += 1) {
    const parts = zonedParts(new Date(guess), timezone);
    const representedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    guess += desiredUtc - representedUtc;
  }
  return new Date(guess);
}
