import type { Queryable } from './events.service.js';

export interface FreshnessInput {
  sportSlug: string;
  expectedIntervalMinutes: number;
}

export interface SportFreshness {
  slug: string;
  lastSuccessfulSync: string | null;
  stale: boolean;
  expectedIntervalMinutes: number;
}

export interface FreshnessResponse {
  sports: SportFreshness[];
  generatedAt: string;
}

const STALE_FACTOR = 2;

export class FreshnessService {
  constructor(
    private readonly db: Queryable,
    private readonly now: () => Date = () => new Date()
  ) {}

  async getFreshness(inputs: FreshnessInput[]): Promise<FreshnessResponse> {
    const slugs = inputs.map((i) => i.sportSlug);
    const lastSuccessBySlug = await this.fetchLastSuccess(slugs);
    const generatedAt = this.now();

    const sports: SportFreshness[] = inputs.map((input) => {
      const lastSuccessful = lastSuccessBySlug.get(input.sportSlug) ?? null;
      const stale = isStale(lastSuccessful, input.expectedIntervalMinutes, generatedAt);

      return {
        slug: input.sportSlug,
        lastSuccessfulSync: lastSuccessful ? lastSuccessful.toISOString() : null,
        stale,
        expectedIntervalMinutes: input.expectedIntervalMinutes
      };
    });

    return {
      sports,
      generatedAt: generatedAt.toISOString()
    };
  }

  private async fetchLastSuccess(slugs: string[]): Promise<Map<string, Date>> {
    if (slugs.length === 0) return new Map();

    const result = await this.db.query<{ sport_slug: string; last_success: Date | null }>(
      `
        SELECT sport_slug, MAX(finished_at) AS last_success
        FROM sync_log
        WHERE sport_slug = ANY($1::text[]) AND status = 'success' AND finished_at IS NOT NULL
        GROUP BY sport_slug
      `,
      [slugs]
    );

    const map = new Map<string, Date>();
    for (const row of result.rows) {
      if (row.last_success) {
        map.set(row.sport_slug, new Date(row.last_success));
      }
    }
    return map;
  }
}

export function isStale(
  lastSuccessful: Date | null,
  expectedIntervalMinutes: number,
  now: Date
): boolean {
  if (!lastSuccessful) return true;
  if (expectedIntervalMinutes <= 0) return false;
  const ageMinutes = (now.getTime() - lastSuccessful.getTime()) / 60_000;
  return ageMinutes > STALE_FACTOR * expectedIntervalMinutes;
}
