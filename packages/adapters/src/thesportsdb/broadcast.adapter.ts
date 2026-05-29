import pThrottle from 'p-throttle';
import { AdapterFetchError } from '../errors.js';

const THESPORTSDB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BACKOFF_MS = [1_000, 2_000, 4_000] as const;

export interface BroadcastResult {
  eventId: string;
  channel: string;
  type: 'tv' | 'streaming' | 'ppv';
  country: string;
}

export interface TheSportsDBBroadcastAdapterOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly backoffMs?: readonly number[];
  readonly sleep?: (ms: number) => Promise<void>;
  readonly logger?: Pick<Console, 'warn'>;
}

interface TVEventEntry {
  idEvent?: string;
  strChannel?: string;
  strCountry?: string;
  strSport?: string;
}

interface TVEventsResponse {
  tvevent?: TVEventEntry[] | null;
}

export class TheSportsDBBroadcastAdapter {
  readonly sourceId = 'thesportsdb-broadcast';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly backoffMs: readonly number[];
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: Pick<Console, 'warn'>;
  private readonly throttledFetch: typeof fetch;

  constructor(apiKey: string, options: TheSportsDBBroadcastAdapterOptions = {}) {
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

  async fetchBroadcastsByDate(date: string): Promise<BroadcastResult[]> {
    const data = await this.fetchJson<TVEventsResponse>('/eventstv.php', {
      d: date,
      a: 'Brazil',
    });

    return this.mapEntries(data.tvevent);
  }

  async fetchBroadcastsByEventId(eventId: string): Promise<BroadcastResult[]> {
    const data = await this.fetchJson<TVEventsResponse>('/lookuptv.php', {
      id: eventId,
    });

    return this.mapEntries(data.tvevent);
  }

  private mapEntries(entries: TVEventEntry[] | null | undefined): BroadcastResult[] {
    if (!entries || entries.length === 0) {
      return [];
    }

    return entries
      .filter((entry) => entry.idEvent && entry.strChannel)
      .map((entry) => ({
        eventId: entry.idEvent!,
        channel: entry.strChannel!,
        type: this.inferType(entry.strChannel!),
        country: entry.strCountry ?? 'Brazil',
      }));
  }

  private inferType(channel: string): 'tv' | 'streaming' | 'ppv' {
    const lower = channel.toLowerCase();

    const streamingKeywords = [
      'star+', 'disney+', 'hbo max', 'max', 'paramount+', 'prime video',
      'amazon prime', 'dazn', 'globoplay', 'youtube', 'twitch', 'pluto',
      'peacock', 'espn+', 'apple tv',
    ];

    const ppvKeywords = ['ppv', 'pay-per-view', 'combate'];

    if (ppvKeywords.some((kw) => lower.includes(kw))) return 'ppv';
    if (streamingKeywords.some((kw) => lower.includes(kw))) return 'streaming';
    return 'tv';
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
          headers: { accept: 'application/json' },
        });

        if (!response.ok) {
          throw new AdapterFetchError(
            this.sourceId,
            `TheSportsDB broadcast request failed with status ${response.status}`,
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

    throw new AdapterFetchError(this.sourceId, 'TheSportsDB broadcast request failed after retries', {
      cause: lastError,
    });
  }
}
