import { NextRequest, NextResponse } from 'next/server';
import { EventsService, ListEventsFilter, ListEventsResult, EventDto } from '@/services';
import { getDbPool } from '@/lib/db';

const VALID_STATUS = new Set(['scheduled', 'live', 'completed', 'cancelled', 'postponed']);
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parseResult = parseListEventsQuery(searchParams);
  if (!parseResult.ok) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parseResult.errors },
      { status: 400 }
    );
  }

  try {
    const db = getDbPool();
    const eventsService = new EventsService(db);

    const timezone = parseResult.filter.timezone;
    const filter: ListEventsFilter = { ...parseResult.filter, timezone: undefined };

    const result = await eventsService.listEvents(filter);
    const responseResult = timezone ? addLocalTimeToResult(result, timezone) : result;

    return NextResponse.json(toPaginatedResponse(responseResult));
  } catch (error) {
    console.error('GET /api/events failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// --- Query parsing ---

type ParseResult =
  | { ok: true; filter: ListEventsFilter }
  | { ok: false; errors: string[] };

function parseListEventsQuery(params: URLSearchParams): ParseResult {
  const errors: string[] = [];
  const filter: ListEventsFilter = {};

  const sports = params.get('sports')?.trim();
  if (sports) {
    const slugs = sports.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
    if (slugs.length === 0) {
      errors.push('sports must contain at least one slug');
    } else {
      filter.sports = slugs;
    }
  }

  const from = params.get('from')?.trim();
  if (from) {
    const date = new Date(from);
    if (Number.isNaN(date.getTime())) {
      errors.push('from is not a valid ISO 8601 date');
    } else {
      filter.from = date;
    }
  }

  const to = params.get('to')?.trim();
  if (to) {
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

  const status = params.get('status')?.trim();
  if (status) {
    if (!VALID_STATUS.has(status)) {
      errors.push(`status must be one of: ${[...VALID_STATUS].join(', ')}`);
    } else {
      filter.status = status as ListEventsFilter['status'];
    }
  }

  const page = parsePositiveInt(params.get('page'), 'page');
  if (page.error) errors.push(page.error);
  else if (page.value !== undefined) filter.page = page.value;

  const limit = parsePositiveInt(params.get('limit'), 'limit');
  if (limit.error) errors.push(limit.error);
  else if (limit.value !== undefined) {
    if (limit.value > MAX_LIMIT) {
      errors.push(`limit must be less than or equal to ${MAX_LIMIT}`);
    } else {
      filter.limit = limit.value;
    }
  }

  const timezone = params.get('tz')?.trim() || params.get('timezone')?.trim();
  if (timezone) {
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

function parsePositiveInt(value: string | null, field: string): { value?: number; error?: string } {
  if (!value) return {};
  const parsed = Number.parseInt(value, 10);
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

// --- Response helpers ---

function toPaginatedResponse(result: ListEventsResult) {
  return {
    data: result.events,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasNextPage: result.page * result.limit < result.total,
    },
  };
}

function addLocalTimeToResult(result: ListEventsResult, timezone: string): ListEventsResult {
  return {
    ...result,
    events: result.events.map((event) => addLocalTime(event, timezone)),
  };
}

function addLocalTime(event: EventDto, timezone: string): EventDto {
  const localTime = formatInTimezone(new Date(event.startsAt), timezone);
  if (!localTime) return event;
  return { ...event, localTime };
}

function formatInTimezone(date: Date, timezone: string): string | undefined {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'shortOffset',
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value])
    );

    if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute || !parts.second) {
      return undefined;
    }

    const stripped = parts.timeZoneName?.replace(/^GMT/, '') ?? '';
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${normalizeOffset(stripped)}`;
  } catch {
    return undefined;
  }
}

function normalizeOffset(stripped: string): string {
  if (stripped === '') return 'Z';
  const match = stripped.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return stripped;
  const sign = match[1] ?? '+';
  const hours = (match[2] ?? '0').padStart(2, '0');
  const minutes = (match[3] ?? '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
