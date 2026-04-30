import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import type { EventStatus } from '@sports-calendar/shared';
import { AdapterFetchError } from '../errors.js';
import type { NormalizedEvent, SportAdapter } from '../types.js';
import type { OpenF1Meeting, OpenF1Session } from './types.js';

dayjs.extend(utc);

const OPENF1_BASE_URL = 'https://api.openf1.org/v1';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BACKOFF_MS = [1_000, 2_000, 4_000] as const;

export interface OpenF1AdapterOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly backoffMs?: readonly number[];
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => Date;
}

export class OpenF1Adapter implements SportAdapter {
  readonly sourceId = 'openf1';
  readonly sportSlug = 'f1';

  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly backoffMs: readonly number[];
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => Date;

  constructor(options: OpenF1AdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? OPENF1_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = options.now ?? (() => new Date());
  }

  async fetchEvents(season: number): Promise<NormalizedEvent[]> {
    const [sessions, meetings] = await Promise.all([
      this.fetchSessions(season),
      this.fetchMeetings(season)
    ]);

    const meetingMap = new Map(meetings.map((meeting) => [meeting.meeting_key, meeting]));
    const eventsByExternalId = new Map<string, NormalizedEvent>();

    for (const session of sessions) {
      const event = this.normalize(session, meetingMap.get(session.meeting_key));
      eventsByExternalId.set(event.externalId, event);
    }

    return [...eventsByExternalId.values()];
  }

  private async fetchSessions(season: number): Promise<OpenF1Session[]> {
    return this.fetchJson<OpenF1Session[]>('/sessions', { year: String(season) });
  }

  private async fetchMeetings(season: number): Promise<OpenF1Meeting[]> {
    return this.fetchJson<OpenF1Meeting[]>('/meetings', { year: String(season) });
  }

  private async fetchJson<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchImpl(url, {
          signal: controller.signal,
          headers: { accept: 'application/json' }
        });

        if (!response.ok) {
          throw new AdapterFetchError(
            this.sourceId,
            `OpenF1 request failed with status ${response.status}`,
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

    throw new AdapterFetchError(this.sourceId, 'OpenF1 request failed after retries', {
      cause: lastError
    });
  }

  private normalize(session: OpenF1Session, meeting?: OpenF1Meeting): NormalizedEvent {
    const startsAt = this.parseDate(session.date_start, session.session_key, 'date_start');
    const endsAt = session.date_end
      ? this.parseDate(session.date_end, session.session_key, 'date_end')
      : undefined;

    // OpenF1's /sessions endpoint stopped returning meeting_name for some
    // seasons (notably 2026 pre-season). The /meetings endpoint always carries
    // it, so prefer that and fall back to the session field for older seasons.
    const title = meeting?.meeting_name ?? session.meeting_name;

    return {
      externalId: `openf1:${session.session_key}`,
      source: this.sourceId,
      sportSlug: this.sportSlug,
      title: title ?? '',
      subtitle: this.mapSessionName(session.session_name),
      venue: meeting?.circuit_short_name ?? session.circuit_short_name,
      country: meeting?.country_name ?? session.country_name,
      startsAt,
      endsAt,
      durationMinutes: endsAt ? dayjs(endsAt).diff(startsAt, 'minute') : undefined,
      status: this.mapStatus(startsAt, endsAt),
      rawData: { session, meeting }
    };
  }

  private parseDate(value: string, sessionKey: number, field: string): Date {
    const date = dayjs.utc(value);

    if (!date.isValid()) {
      throw new AdapterFetchError(
        this.sourceId,
        `OpenF1 session ${sessionKey} has invalid ${field}: ${value}`
      );
    }

    return date.toDate();
  }

  private mapSessionName(name: string): string {
    const map: Record<string, string> = {
      Race: 'Corrida',
      Qualifying: 'Qualificação',
      Sprint: 'Sprint',
      'Sprint Qualifying': 'Classificação Sprint',
      'Practice 1': 'Treino Livre 1',
      'Practice 2': 'Treino Livre 2',
      'Practice 3': 'Treino Livre 3'
    };

    return map[name] ?? name;
  }

  private mapStatus(startsAt: Date, endsAt?: Date): EventStatus {
    const now = this.now();

    if (endsAt && now >= endsAt) {
      return 'completed';
    }

    if (now >= startsAt && (!endsAt || now < endsAt)) {
      return 'live';
    }

    return 'scheduled';
  }
}
