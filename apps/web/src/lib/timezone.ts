import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('pt-br');

const STORAGE_KEY = 'lineup.timezone';

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getUserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  return window.localStorage.getItem(STORAGE_KEY) ?? detectTimezone();
}

export function setUserTimezone(tz: string): void {
  window.localStorage.setItem(STORAGE_KEY, tz);
}

// "Dom, 16 nov · 16h00"
export function formatEventTime(isoDate: string, tz: string): string {
  return dayjs(isoDate).tz(tz).format('ddd, DD MMM · HH[h]mm');
}

export { dayjs };
