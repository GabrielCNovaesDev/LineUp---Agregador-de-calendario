import { AdapterFetchError, RateLimitError } from '../errors.js';
import type { NormalizedEvent, SportAdapter } from '../types.js';

export interface APISportsBaseAdapterOptions {
  readonly fetchImpl?: typeof fetch;
  readonly apiHost?: string;
}

export abstract class APISportsBaseAdapter implements SportAdapter {
  abstract readonly sportSlug: string;
  abstract readonly leagueId: number;
  readonly sourceId = 'apisports';

  private readonly fetchImpl: typeof fetch;
  private readonly apiHost: string;

  constructor(private readonly apiKey: string, options: APISportsBaseAdapterOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiHost = options.apiHost ?? this.defaultApiHost;
  }

  protected get defaultApiHost(): string {
    return 'v1.mma.api-sports.io';
  }

  protected async fetchFromAPI<T>(path: string): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const response = await this.fetchImpl(`https://${this.apiHost}/${normalizedPath}`, {
      headers: {
        'x-apisports-key': this.apiKey,
        'x-rapidapi-host': this.apiHost
      }
    });

    if (response.status === 429) {
      throw new RateLimitError(this.sourceId);
    }

    if (!response.ok) {
      throw new AdapterFetchError(
        this.sourceId,
        `API-Sports request failed with status ${response.status}`,
        { statusCode: response.status }
      );
    }

    return (await response.json()) as T;
  }

  async fetchEvents(_season: number): Promise<NormalizedEvent[]> {
    throw new Error(`${this.constructor.name}.fetchEvents() is not implemented yet`);
  }
}
