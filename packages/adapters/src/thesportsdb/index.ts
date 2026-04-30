import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import pThrottle from 'p-throttle';
import type { EventStatus } from '@sports-calendar/shared';
import { AdapterFetchError } from '../errors.js';
import type { NormalizedEvent, SportAdapter } from '../types.js';
import type { TheSportsDBEvent, TheSportsDBEventsResponse, TheSportsDBSportSlug } from './types.js';

dayjs.extend(utc);

const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BACKOFF_MS = [1_000, 2_000, 4_000] as const;

const LEAGUE_IDS: Record<TheSportsDBSportSlug, number> = {
  wec: 4370,
  motogp: 4497
};

export interface TheSportsDBAdapterOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly backoffMs?: readonly number[];
  readonly sleep?: (ms: number) => Promise<void>;
  readonly logger?: Pick<Console, 'warn'>;
}

export class TheSportsDBAdapter implements SportAdapter {
  readonly sourceId = 'thesportsdb';
  readonly sportSlug: TheSportsDBSportSlug;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly backoffMs: readonly number[];
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: Pick<Console, 'warn'>;
  private readonly throttledFetch: typeof fetch;

  constructor(sportSlug: TheSportsDBSportSlug, apiKey: string, options: TheSportsDBAdapterOptions = {}) {
    if (!LEAGUE_IDS[sportSlug]) {
      throw new Error(`No league ID for sport: ${sportSlug}`);
    }

    this.sportSlug = sportSlug;
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? THESPORTSDB_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.logger = options.logger ?? console;
    this.throttledFetch = pThrottle({ limit: 1, interval: 1_000 })((input, init) =>
      this.fetchImpl(input, init)
    );
  }

  async fetchEvents(season: number): Promise<NormalizedEvent[]> {
    const data = await this.fetchSeason(season);
    const events = data.events ?? [];

    return events.map((event) => this.normalize(event));
  }

  private async fetchSeason(season: number): Promise<TheSportsDBEventsResponse> {
    const leagueId = LEAGUE_IDS[this.sportSlug];
    return this.fetchJson<TheSportsDBEventsResponse>('/eventsseason.php', {
      id: String(leagueId),
      s: String(season)
    });
  }

  private async fetchJson<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${this.apiKey}${path}`);

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.throttledFetch(url, {
          signal: controller.signal,
          headers: { accept: 'application/json' }
        });

        if (!response.ok) {
          throw new AdapterFetchError(
            this.sourceId,
            `TheSportsDB request failed with status ${response.status}`,
            { statusCode: response.status }
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;

        if (attempt >= this.maxAttempts) {
          break;
        }

        await this.sleep(this.backoffMs[attempt - 1] ?? this.backoffMs.at(-1) ?? 1_000);
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastError instanceof AdapterFetchError) {
      throw lastError;
    }

    throw new AdapterFetchError(this.sourceId, 'TheSportsDB request failed after retries', {
      cause: lastError
    });
  }

  private normalize(event: TheSportsDBEvent): NormalizedEvent {
    const startsAt = this.parseDate(event);
    const title = event.strEvent?.trim();

    if (!title) {
      throw new AdapterFetchError(this.sourceId, `TheSportsDB event ${event.idEvent} has no title`);
    }

    return {
      externalId: `thesportsdb:${event.idEvent}`,
      source: this.sourceId,
      sportSlug: this.sportSlug,
      title,
      venue: event.strVenue?.trim() || undefined,
      country: event.strCountry?.trim() || undefined,
      roundNumber: this.parseRound(event.intRound),
      startsAt,
      status: this.mapStatus(event.strStatus),
      rawData: event
    };
  }

  private parseDate(event: TheSportsDBEvent): Date {
    const timestamp = event.strTimestamp?.trim();

    if (timestamp && this.hasTimezoneOffset(timestamp)) {
      const parsed = dayjs.utc(timestamp);

      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    const date = event.dateEvent?.trim();
    const time = event.strTime?.trim() || '00:00:00';

    if (!date) {
      throw new AdapterFetchError(this.sourceId, `TheSportsDB event ${event.idEvent} has no date`);
    }

    this.logger.warn(
      { eventId: event.idEvent, sportSlug: this.sportSlug },
      'TheSportsDB: date without timezone, assuming UTC'
    );

    const parsed = dayjs.utc(`${date}T${time.replace(/Z$/, '')}Z`);

    if (!parsed.isValid()) {
      throw new AdapterFetchError(this.sourceId, `TheSportsDB event ${event.idEvent} has invalid date`);
    }

    return parsed.toDate();
  }

  private hasTimezoneOffset(value: string): boolean {
    return /(?:Z|[+-]\d{2}:?\d{2})$/u.test(value);
  }

  private parseRound(value?: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const round = Number.parseInt(value, 10);
    return Number.isFinite(round) ? round : undefined;
  }

  private mapStatus(status?: string | null): EventStatus {
    const map: Record<string, EventStatus> = {
      'Not Started': 'scheduled',
      'In Progress': 'live',
      'Match Finished': 'completed',
      Postponed: 'postponed',
      Cancelled: 'cancelled',
      Canceled: 'cancelled'
    };

    return status ? (map[status] ?? 'scheduled') : 'scheduled';
  }
}
