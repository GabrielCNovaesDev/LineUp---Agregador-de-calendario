import type { EventStatus } from '@sports-calendar/shared';
import type { ListEventsFilter } from '../services/events.service.js';

const VALID_STATUS: ReadonlySet<EventStatus> = new Set([
  'scheduled',
  'live',
  'completed',
  'cancelled',
  'postponed'
]);

export type ParseResult =
  | { ok: true; filter: ListEventsFilter }
  | { ok: false; errors: string[] };

export function parseListEventsQuery(query: Record<string, unknown>): ParseResult {
  const errors: string[] = [];
  const filter: ListEventsFilter = {};

  const sports = readString(query.sports);
  if (sports !== undefined) {
    const slugs = sports
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    if (slugs.length === 0) {
      errors.push('sports must contain at least one slug');
    } else {
      filter.sports = slugs;
    }
  }

  const from = readString(query.from);
  if (from !== undefined) {
    const date = new Date(from);
    if (Number.isNaN(date.getTime())) {
      errors.push('from is not a valid ISO 8601 date');
    } else {
      filter.from = date;
    }
  }

  const to = readString(query.to);
  if (to !== undefined) {
    const date = new Date(to);
    if (Number.isNaN(date.getTime())) {
      errors.push('to is not a valid ISO 8601 date');
    } else {
      filter.to = date;
    }
  }

  if (filter.from && filter.to && filter.to < filter.from) {
    errors.push('to must be after from');
  }

  const status = readString(query.status);
  if (status !== undefined) {
    if (!VALID_STATUS.has(status as EventStatus)) {
      errors.push(`status must be one of: ${[...VALID_STATUS].join(', ')}`);
    } else {
      filter.status = status as EventStatus;
    }
  }

  const page = readInteger(query.page, 'page');
  if (page.error) errors.push(page.error);
  else if (page.value !== undefined) filter.page = page.value;

  const limit = readInteger(query.limit, 'limit');
  if (limit.error) errors.push(limit.error);
  else if (limit.value !== undefined) filter.limit = limit.value;

  const timezone = readString(query.timezone);
  if (timezone !== undefined) {
    if (!isValidTimezone(timezone)) {
      errors.push(`timezone "${timezone}" is not a valid IANA timezone`);
    } else {
      filter.timezone = timezone;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, filter };
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readInteger(
  value: unknown,
  field: string
): { value?: number; error?: string } {
  const raw = readString(value);
  if (raw === undefined) return {};

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return { error: `${field} must be a positive integer` };
  }
  return { value: parsed };
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
