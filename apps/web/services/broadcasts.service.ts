import { getDbPool } from '@/lib/db';

export interface BroadcastInput {
  channel: string;
  type: 'tv' | 'streaming' | 'ppv';
  country: string;
  logoUrl?: string;
  source: string;
}

export interface Broadcast {
  id: string;
  eventId: string;
  channel: string;
  type: string;
  country: string;
  logoUrl: string | null;
  source: string;
  fetchedAt: string;
}

interface BroadcastRow {
  id: string;
  event_id: string;
  channel: string;
  type: string;
  country: string;
  logo_url: string | null;
  source: string;
  fetched_at: Date;
}

export class BroadcastsService {
  async upsertBroadcasts(eventId: string, broadcasts: BroadcastInput[]): Promise<number> {
    const pool = getDbPool();
    let upserted = 0;

    for (const b of broadcasts) {
      const result = await pool.query(
        `
        INSERT INTO broadcasts (event_id, channel, type, country, logo_url, source, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (event_id, channel, source) DO UPDATE SET
          type       = EXCLUDED.type,
          country    = EXCLUDED.country,
          logo_url   = EXCLUDED.logo_url,
          fetched_at = NOW()
        `,
        [eventId, b.channel, b.type, b.country, b.logoUrl ?? null, b.source]
      );

      if ((result.rowCount ?? 0) > 0) {
        upserted += 1;
      }
    }

    return upserted;
  }

  async getByEventId(eventId: string): Promise<Broadcast[]> {
    const pool = getDbPool();

    const result = await pool.query<BroadcastRow>(
      `SELECT id, event_id, channel, type, country, logo_url, source, fetched_at
       FROM broadcasts
       WHERE event_id = $1
       ORDER BY channel ASC`,
      [eventId]
    );

    return result.rows.map((row) => this.toDto(row));
  }

  async getByEventIds(eventIds: string[]): Promise<Map<string, Broadcast[]>> {
    const map = new Map<string, Broadcast[]>();

    if (eventIds.length === 0) return map;

    const pool = getDbPool();

    const result = await pool.query<BroadcastRow>(
      `SELECT id, event_id, channel, type, country, logo_url, source, fetched_at
       FROM broadcasts
       WHERE event_id = ANY($1::text[])
       ORDER BY event_id, channel ASC`,
      [eventIds]
    );

    for (const row of result.rows) {
      const dto = this.toDto(row);
      const existing = map.get(dto.eventId);
      if (existing) {
        existing.push(dto);
      } else {
        map.set(dto.eventId, [dto]);
      }
    }

    return map;
  }

  private toDto(row: BroadcastRow): Broadcast {
    return {
      id: row.id,
      eventId: row.event_id,
      channel: row.channel,
      type: row.type,
      country: row.country,
      logoUrl: row.logo_url,
      source: row.source,
      fetchedAt: new Date(row.fetched_at).toISOString(),
    };
  }
}
