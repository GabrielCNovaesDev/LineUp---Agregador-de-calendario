import type { NormalizedEvent } from '@sports-calendar/adapters';
import type { EventStatus } from '@sports-calendar/shared';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface UpsertError {
  event: NormalizedEvent;
  error: string;
}

export interface UpsertResult {
  upserted: number;
  skipped: number;
  errors: UpsertError[];
}

interface QueryResultLike<R> {
  rows: R[];
  rowCount?: number | null;
}

export interface Queryable {
  query<R = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<QueryResultLike<R>>;
}

export interface ListEventsFilter {
  sports?: string[];
  from?: Date;
  to?: Date;
  status?: EventStatus;
  page?: number;
  limit?: number;
  timezone?: string;
}

export interface EventSportDto {
  slug: string;
  name: string;
  category: string;
}

export interface EventDto {
  id: string;
  sport: EventSportDto;
  title: string;
  subtitle: string | null;
  venue: string | null;
  country: string | null;
  roundNumber: number | null;
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  status: EventStatus;
  localTime?: string;
}

export interface ListEventsResult {
  events: EventDto[];
  page: number;
  limit: number;
  total: number;
}

interface EventRow {
  id: string;
  title: string;
  subtitle: string | null;
  venue: string | null;
  country: string | null;
  round_number: number | null;
  starts_at: Date;
  ends_at: Date | null;
  duration_minutes: number | null;
  status: EventStatus;
  sport_slug: string;
  sport_name: string;
  sport_category: string;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function validateNormalizedEvent(event: NormalizedEvent): ValidationResult {
  const errors: string[] = [];

  if (!event.externalId) errors.push('externalId is required');
  if (!event.source) errors.push('source is required');
  if (!event.sportSlug) errors.push('sportSlug is required');
  if (!event.title || event.title.trim().length === 0) errors.push('title is required');
  if (!event.startsAt || Number.isNaN(event.startsAt.getTime())) errors.push('startsAt is invalid');
  if (event.endsAt && event.endsAt <= event.startsAt) errors.push('endsAt must be after startsAt');

  if (event.startsAt && !Number.isNaN(event.startsAt.getTime()) && event.startsAt.getFullYear() < 2020) {
    errors.push('startsAt looks incorrect: year < 2020');
  }

  return { valid: errors.length === 0, errors };
}

export class EventsService {
  private readonly sportIdBySlug = new Map<string, string | null>();

  constructor(private readonly db: Queryable) {}

  async upsertEvents(events: NormalizedEvent[]): Promise<UpsertResult> {
    const result: UpsertResult = { upserted: 0, skipped: 0, errors: [] };

    for (const event of events) {
      const validation = validateNormalizedEvent(event);

      if (!validation.valid) {
        result.skipped += 1;
        result.errors.push({ event, error: validation.errors.join('; ') });
        continue;
      }

      try {
        const sportId = await this.getSportId(event.sportSlug);

        if (!sportId) {
          result.skipped += 1;
          result.errors.push({ event, error: `Unknown sport slug: ${event.sportSlug}` });
          continue;
        }

        const queryResult = await this.db.query(
          `
            INSERT INTO events (
              sport_id,
              external_id,
              source,
              title,
              subtitle,
              venue,
              country,
              round_number,
              starts_at,
              ends_at,
              duration_minutes,
              status,
              raw_data
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
            ON CONFLICT (source, external_id) DO UPDATE SET
              title             = EXCLUDED.title,
              subtitle          = EXCLUDED.subtitle,
              venue             = EXCLUDED.venue,
              country           = EXCLUDED.country,
              round_number      = EXCLUDED.round_number,
              starts_at         = EXCLUDED.starts_at,
              ends_at           = EXCLUDED.ends_at,
              duration_minutes  = EXCLUDED.duration_minutes,
              status            = EXCLUDED.status,
              raw_data          = EXCLUDED.raw_data,
              updated_at        = NOW()
            WHERE events.updated_at < NOW() - INTERVAL '1 hour'
          `,
          [
            sportId,
            event.externalId,
            event.source,
            event.title.trim(),
            event.subtitle ?? null,
            event.venue ?? null,
            event.country ?? null,
            event.roundNumber ?? null,
            event.startsAt,
            event.endsAt ?? null,
            event.durationMinutes ?? null,
            event.status,
            JSON.stringify(event.rawData ?? null)
          ]
        );

        if ((queryResult.rowCount ?? 0) > 0) {
          result.upserted += 1;
        } else {
          result.skipped += 1;
        }
      } catch (error) {
        result.errors.push({
          event,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }

  async listEvents(filter: ListEventsFilter): Promise<ListEventsResult> {
    const page = Math.max(1, Math.floor(filter.page ?? 1));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(filter.limit ?? DEFAULT_LIMIT)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['s.is_active = TRUE'];
    const values: unknown[] = [];

    if (filter.sports && filter.sports.length > 0) {
      values.push(filter.sports);
      conditions.push(`s.slug = ANY($${values.length}::text[])`);
    }

    if (filter.from) {
      values.push(filter.from);
      conditions.push(`e.starts_at >= $${values.length}`);
    } else {
      // Default: hide events that finished more than a day ago, so the calendar
      // view stays focused on current and upcoming events. Clients can pass an
      // explicit `from` to access the full history.
      conditions.push(`e.starts_at >= NOW() - INTERVAL '1 day'`);
    }

    if (filter.to) {
      values.push(filter.to);
      conditions.push(`e.starts_at <= $${values.length}`);
    }

    if (filter.status) {
      values.push(filter.status);
      conditions.push(`e.status = $${values.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM events e JOIN sports s ON s.id = e.sport_id ${where}`,
      values
    );
    const total = Number.parseInt(totalResult.rows[0]?.count ?? '0', 10);

    values.push(limit);
    const limitPlaceholder = `$${values.length}`;
    values.push(offset);
    const offsetPlaceholder = `$${values.length}`;

    const eventsResult = await this.db.query<EventRow>(
      `
        SELECT
          e.id,
          e.title,
          e.subtitle,
          e.venue,
          e.country,
          e.round_number,
          e.starts_at,
          e.ends_at,
          e.duration_minutes,
          e.status,
          s.slug     AS sport_slug,
          s.name     AS sport_name,
          s.category AS sport_category
        FROM events e
        JOIN sports s ON s.id = e.sport_id
        ${where}
        ORDER BY e.starts_at ASC, e.id ASC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
      `,
      values
    );

    return {
      events: eventsResult.rows.map((row) => this.toDto(row, filter.timezone)),
      page,
      limit,
      total
    };
  }

  private toDto(row: EventRow, timezone?: string): EventDto {
    const startsAt = new Date(row.starts_at);
    const endsAt = row.ends_at ? new Date(row.ends_at) : null;

    const dto: EventDto = {
      id: row.id,
      sport: {
        slug: row.sport_slug,
        name: row.sport_name,
        category: row.sport_category
      },
      title: row.title,
      subtitle: row.subtitle,
      venue: row.venue,
      country: row.country,
      roundNumber: row.round_number,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      durationMinutes: row.duration_minutes,
      status: row.status
    };

    if (timezone) {
      const localTime = formatInTimezone(startsAt, timezone);
      if (localTime) dto.localTime = localTime;
    }

    return dto;
  }

  private async getSportId(sportSlug: string): Promise<string | null> {
    if (this.sportIdBySlug.has(sportSlug)) {
      return this.sportIdBySlug.get(sportSlug) ?? null;
    }

    const result = await this.db.query<{ id: string }>('SELECT id FROM sports WHERE slug = $1', [
      sportSlug
    ]);
    const sportId = result.rows[0]?.id ?? null;

    this.sportIdBySlug.set(sportSlug, sportId);
    return sportId;
  }
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
      timeZoneName: 'shortOffset'
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value])
    );

    if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute || !parts.second) {
      return undefined;
    }

    const stripped = parts.timeZoneName?.replace(/^GMT/, '') ?? '';
    const normalizedOffset = normalizeOffset(stripped);

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${normalizedOffset}`;
  } catch {
    return undefined;
  }
}

// Intl shortOffset can return "GMT-3" (one-digit hour) or "GMT-03:30"; the
// README documents ISO 8601 offsets as "±HH:MM", so pad missing digits.
function normalizeOffset(stripped: string): string {
  if (stripped === '') return 'Z';
  const match = stripped.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return stripped;
  const sign = match[1] ?? '+';
  const hours = (match[2] ?? '0').padStart(2, '0');
  const minutes = (match[3] ?? '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
