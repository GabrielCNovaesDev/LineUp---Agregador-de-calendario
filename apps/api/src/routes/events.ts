import { Router } from 'express';
import { db } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { CacheService } from '../lib/cache.js';
import { respondWithError } from '../middleware/error.js';
import { jobs } from '../scheduler/index.js';
import type { EventDto, ListEventsFilter, ListEventsResult } from '../services/events.service.js';
import { EventsService } from '../services/events.service.js';
import { FreshnessService } from '../services/freshness.service.js';
import { parseListEventsQuery } from './events.parser.js';

export const eventsRouter = Router();

const eventsService = new EventsService(db);
const freshnessService = new FreshnessService(db);
const cache = new CacheService(redis);

eventsRouter.get('/events/freshness', async (_req, res) => {
  try {
    const result = await cache.getOrFetch('events:freshness', 30, () =>
      freshnessService.getFreshness(
        jobs.map((job) => ({
          sportSlug: job.sportSlug,
          expectedIntervalMinutes: job.intervalMinutes
        }))
      )
    );
    res.json(result);
  } catch (error) {
    console.error('GET /api/events/freshness failed:', error);
    respondWithError(res, error);
  }
});

eventsRouter.get('/events', async (req, res) => {
  const parsed = parseListEventsQuery(req.query);

  if (!parsed.ok) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.errors });
    return;
  }

  try {
    const timezone = parsed.filter.timezone;
    const cacheableFilter: ListEventsFilter = { ...parsed.filter, timezone: undefined };
    const cacheKey = buildEventsListCacheKey(cacheableFilter);
    const ttlSeconds = parsed.filter.status === 'live' ? 60 : 1_800;

    const result = await cache.getOrFetch(cacheKey, ttlSeconds, () =>
      eventsService.listEvents(cacheableFilter)
    );

    res.json(timezone ? addLocalTimeToResult(result, timezone) : result);
  } catch (error) {
    console.error('GET /api/events failed:', error);
    respondWithError(res, error);
  }
});

eventsRouter.get('/sports', async (_req, res) => {
  try {
    const sports = await cache.getOrFetch('sports:list', 86_400, async () => {
      const result = await db.query<{ slug: string; name: string; category: string }>(
        `
          SELECT slug, name, category
          FROM sports
          WHERE is_active = TRUE
          ORDER BY category, name
        `
      );
      return result.rows;
    });

    res.json({ data: sports });
  } catch (error) {
    console.error('GET /api/sports failed:', error);
    respondWithError(res, error);
  }
});

function buildEventsListCacheKey(filter: ListEventsFilter): string {
  return [
    'events:list',
    filter.sports?.join('-') ?? 'all',
    filter.from?.toISOString() ?? 'none',
    filter.to?.toISOString() ?? 'none',
    filter.status ?? 'all',
    filter.page ?? 1,
    filter.limit ?? 50
  ].join(':');
}

function addLocalTimeToResult(result: ListEventsResult, timezone: string): ListEventsResult {
  return {
    ...result,
    events: result.events.map((event) => addLocalTime(event, timezone))
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
      timeZoneName: 'shortOffset'
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
