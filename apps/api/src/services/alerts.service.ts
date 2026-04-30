import type { Queryable } from './events.service.js';

export type AlertKind = 'silent_failure';

export interface Alert {
  id: string;
  sportSlug: string;
  kind: AlertKind;
  message: string;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface AlertsLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void;
}

interface AlertRow {
  id: string;
  sport_slug: string;
  kind: AlertKind;
  message: string;
  detected_at: Date;
  resolved_at: Date | null;
}

const SILENT_FAILURE_WINDOW = 3;

const defaultLogger: AlertsLogger = {
  warn: (msg, meta) => console.warn(`[alert] ${msg}`, meta ?? '')
};

export class AlertsService {
  constructor(
    private readonly db: Queryable,
    private readonly logger: AlertsLogger = defaultLogger
  ) {}

  // Called after every successful sync. If the most recent N successful syncs
  // for this sport all produced zero events (and zero validation skips), opens
  // a silent_failure alert. If the current sync actually upserted rows, any
  // open alert for this sport is resolved.
  async reconcileAfterSync(
    sportSlug: string,
    currentResult: { upserted: number; skipped: number }
  ): Promise<{ raised: boolean; resolved: boolean }> {
    if (currentResult.upserted > 0 || currentResult.skipped > 0) {
      const resolved = await this.resolve(sportSlug, 'silent_failure');
      return { raised: false, resolved };
    }

    const recentZeros = await this.countRecentZeroResults(sportSlug, SILENT_FAILURE_WINDOW);
    if (recentZeros < SILENT_FAILURE_WINDOW) {
      return { raised: false, resolved: false };
    }

    const raised = await this.raise(
      sportSlug,
      'silent_failure',
      `${SILENT_FAILURE_WINDOW} consecutive successful syncs for ${sportSlug} produced zero events. Likely an adapter regression — investigate the upstream API response shape.`
    );
    return { raised, resolved: false };
  }

  async listActive(): Promise<Alert[]> {
    const result = await this.db.query<AlertRow>(`
      SELECT id, sport_slug, kind, message, detected_at, resolved_at
      FROM alerts
      WHERE resolved_at IS NULL
      ORDER BY detected_at DESC
    `);
    return result.rows.map(toAlert);
  }

  async listAll(limit = 100): Promise<Alert[]> {
    const result = await this.db.query<AlertRow>(
      `
        SELECT id, sport_slug, kind, message, detected_at, resolved_at
        FROM alerts
        ORDER BY detected_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(toAlert);
  }

  private async countRecentZeroResults(sportSlug: string, window: number): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count FROM (
          SELECT events_upserted + events_skipped AS touched
          FROM sync_log
          WHERE sport_slug = $1 AND status = 'success' AND finished_at IS NOT NULL
          ORDER BY started_at DESC
          LIMIT $2
        ) recent
        WHERE touched = 0
      `,
      [sportSlug, window]
    );

    // Only flag when we actually have N entries (avoid false positives on
    // freshly-deployed installs where there are < N successful syncs total).
    const totalRecent = await this.db.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count FROM (
          SELECT 1 FROM sync_log
          WHERE sport_slug = $1 AND status = 'success' AND finished_at IS NOT NULL
          ORDER BY started_at DESC
          LIMIT $2
        ) recent
      `,
      [sportSlug, window]
    );

    if (Number.parseInt(totalRecent.rows[0]?.count ?? '0', 10) < window) {
      return 0;
    }

    return Number.parseInt(result.rows[0]?.count ?? '0', 10);
  }

  private async raise(sportSlug: string, kind: AlertKind, message: string): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      `
        INSERT INTO alerts (sport_slug, kind, message)
        VALUES ($1, $2, $3)
        ON CONFLICT (sport_slug, kind) WHERE resolved_at IS NULL DO NOTHING
        RETURNING id
      `,
      [sportSlug, kind, message]
    );

    if (result.rows.length > 0) {
      this.logger.warn('alert raised', { sportSlug, kind, message });
      return true;
    }
    return false;
  }

  private async resolve(sportSlug: string, kind: AlertKind): Promise<boolean> {
    const result = await this.db.query(
      `
        UPDATE alerts
        SET resolved_at = NOW()
        WHERE sport_slug = $1 AND kind = $2 AND resolved_at IS NULL
      `,
      [sportSlug, kind]
    );

    const resolved = (result.rowCount ?? 0) > 0;
    if (resolved) {
      this.logger.warn('alert resolved', { sportSlug, kind });
    }
    return resolved;
  }
}

function toAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    sportSlug: row.sport_slug,
    kind: row.kind,
    message: row.message,
    detectedAt: row.detected_at.toISOString(),
    resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null
  };
}
