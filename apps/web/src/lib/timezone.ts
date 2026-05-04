import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('pt-br');

const STORAGE_KEY = 'lineup.timezone';

export const COMMON_TIMEZONES = [
  { label: 'Brasilia / Sao Paulo (UTC-3)', value: 'America/Sao_Paulo' },
  { label: 'Fortaleza / Aracaju (UTC-3)', value: 'America/Fortaleza' },
  { label: 'Manaus (UTC-4)', value: 'America/Manaus' },
  { label: 'Lisboa / Portugal (UTC+0/+1)', value: 'Europe/Lisbon' },
  { label: 'Londres (UTC+0/+1)', value: 'Europe/London' },
  { label: 'UTC', value: 'UTC' }
];

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getUserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isValidTimezone(stored)) return stored;
  return detectTimezone();
}

export function setUserTimezone(tz: string): void {
  window.localStorage.setItem(STORAGE_KEY, tz);
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function formatTimezoneName(tz: string): string {
  return COMMON_TIMEZONES.find((item) => item.value === tz)?.label ?? tz.replace(/_/g, ' ');
}

export function formatEventTime(isoDate: string, tz: string): string {
  return dayjs(isoDate).tz(tz).format('ddd, DD MMM · HH[h]mm');
}

export function getTimeUntilEvent(isoDate: string): string {
  const diff = dayjs(isoDate).diff(dayjs(), 'minute');

  if (diff < 0) return 'Encerrado';
  if (diff < 60) return `Em ${diff}min`;
  if (diff < 1440) return `Em ${Math.floor(diff / 60)}h`;
  return `Em ${Math.floor(diff / 1440)} dias`;
}

export { dayjs };
