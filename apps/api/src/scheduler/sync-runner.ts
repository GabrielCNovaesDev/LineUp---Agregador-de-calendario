import type { SportAdapter } from '@sports-calendar/adapters';
import type { EventsService, Queryable, UpsertResult } from '../services/events.service.js';

export interface SyncRunnerLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface SyncRunnerOptions {
  db: Queryable;
  eventsService: EventsService;
  logger?: SyncRunnerLogger;
  now?: () => Date;
}

export interface SyncJobResult {
  source: string;
  sportSlug: string;
  startedAt: Date;
  finishedAt: Date;
  status: 'success' | 'failed';
  upserted: number;
  skipped: number;
  error?: string;
}

const defaultLogger: SyncRunnerLogger = {
  info: (msg, meta) => console.log(`[sync] ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[sync] ${msg}`, meta ?? ''),
  error: (msg, meta) => console.error(`[sync] ${msg}`, meta ?? '')
};

export class SyncRunner {
  private readonly db: Queryable;
  private readonly eventsService: EventsService;
  private readonly logger: SyncRunnerLogger;
  private readonly now: () => Date;

  constructor(options: SyncRunnerOptions) {
    this.db = options.db;
    this.eventsService = options.eventsService;
    this.logger = options.logger ?? defaultLogger;
    this.now = options.now ?? (() => new Date());
  }

  async run(adapter: SportAdapter, season: number): Promise<SyncJobResult> {
    const startedAt = this.now();
    const logId = await this.startLog(adapter, startedAt);

    this.logger.info('sync started', {
      source: adapter.sourceId,
      sportSlug: adapter.sportSlug,
      season
    });

    let upsertResult: UpsertResult;

    try {
      const events = await adapter.fetchEvents(season);
      upsertResult = await this.eventsService.upsertEvents(events);
    } catch (error) {
      const finishedAt = this.now();
      const message = error instanceof Error ? error.message : String(error);

      await this.finishLog(logId, {
        finishedAt,
        status: 'failed',
        upserted: 0,
        skipped: 0,
        error: message
      });

      this.logger.error('sync failed', {
        source: adapter.sourceId,
        sportSlug: adapter.sportSlug,
        error: message
      });

      return {
        source: adapter.sourceId,
        sportSlug: adapter.sportSlug,
        startedAt,
        finishedAt,
        status: 'failed',
        upserted: 0,
        skipped: 0,
        error: message
      };
    }

    const finishedAt = this.now();
    await this.finishLog(logId, {
      finishedAt,
      status: 'success',
      upserted: upsertResult.upserted,
      skipped: upsertResult.skipped,
      error: upsertResult.errors.length > 0 ? summarizeErrors(upsertResult) : undefined
    });

    this.logger.info('sync completed', {
      source: adapter.sourceId,
      sportSlug: adapter.sportSlug,
      upserted: upsertResult.upserted,
      skipped: upsertResult.skipped,
      validationErrors: upsertResult.errors.length
    });

    return {
      source: adapter.sourceId,
      sportSlug: adapter.sportSlug,
      startedAt,
      finishedAt,
      status: 'success',
      upserted: upsertResult.upserted,
      skipped: upsertResult.skipped
    };
  }

  private async startLog(adapter: SportAdapter, startedAt: Date): Promise<string | null> {
    try {
      const result = await this.db.query<{ id: string }>(
        `
          INSERT INTO sync_log (source, sport_slug, started_at, status)
          VALUES ($1, $2, $3, 'running')
          RETURNING id
        `,
        [adapter.sourceId, adapter.sportSlug, startedAt]
      );
      return result.rows[0]?.id ?? null;
    } catch (error) {
      this.logger.error('failed to insert sync_log entry', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async finishLog(
    logId: string | null,
    update: {
      finishedAt: Date;
      status: 'success' | 'failed';
      upserted: number;
      skipped: number;
      error?: string;
    }
  ): Promise<void> {
    if (!logId) return;

    try {
      await this.db.query(
        `
          UPDATE sync_log
          SET finished_at = $2,
              status = $3,
              events_upserted = $4,
              events_skipped = $5,
              error = $6
          WHERE id = $1
        `,
        [logId, update.finishedAt, update.status, update.upserted, update.skipped, update.error ?? null]
      );
    } catch (error) {
      this.logger.error('failed to update sync_log entry', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

function summarizeErrors(result: UpsertResult): string {
  const sample = result.errors
    .slice(0, 3)
    .map((e) => `${e.event.externalId}: ${e.error}`)
    .join(' | ');
  const suffix = result.errors.length > 3 ? ` (+${result.errors.length - 3} more)` : '';
  return `${result.errors.length} item errors. Sample: ${sample}${suffix}`;
}
