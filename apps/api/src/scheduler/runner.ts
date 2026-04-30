import type { Redis } from 'ioredis';
import type { SportAdapter } from '@sports-calendar/adapters';
import { EventsService, type Queryable, type UpsertResult } from '../services/events.service.js';

export interface SyncRunnerLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface SyncJob {
  name: string;
  sportSlug: string;
  schedule: string;
  adapter: SportAdapter;
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

export interface StartedSyncJob {
  syncLogId: string;
  completion: Promise<SyncJobResult>;
}

const defaultLogger: SyncRunnerLogger = {
  info: (msg, meta) => console.log(`[sync] ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[sync] ${msg}`, meta ?? ''),
  error: (msg, meta) => console.error(`[sync] ${msg}`, meta ?? '')
};

export async function runJob(job: SyncJob, db: Queryable, _redis?: Redis): Promise<SyncJobResult> {
  const runner = new SyncRunner({ db, eventsService: new EventsService(db) });
  return runner.runJob(job);
}

export async function startJob(
  job: SyncJob,
  db: Queryable,
  _redis?: Redis,
  logger: SyncRunnerLogger = defaultLogger
): Promise<StartedSyncJob> {
  const runner = new SyncRunner({ db, eventsService: new EventsService(db), logger });
  return runner.startJob(job);
}

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
    return this.runJob({
      name: `${adapter.sourceId}-${adapter.sportSlug}`,
      sportSlug: adapter.sportSlug,
      schedule: '',
      adapter
    }, season);
  }

  async runJob(job: SyncJob, season = getCurrentSeason()): Promise<SyncJobResult> {
    const startedAt = this.now();
    const logId = await this.createSyncLog(job, startedAt);
    return this.finishJob(job, logId, startedAt, season);
  }

  async startJob(job: SyncJob, season = getCurrentSeason()): Promise<StartedSyncJob> {
    const startedAt = this.now();
    const syncLogId = await this.createSyncLog(job, startedAt);
    const completion = this.finishJob(job, syncLogId, startedAt, season);
    return { syncLogId, completion };
  }

  private async finishJob(
    job: SyncJob,
    logId: string,
    startedAt: Date,
    season: number
  ): Promise<SyncJobResult> {
    this.logger.info('sync started', {
      job: job.name,
      source: job.adapter.sourceId,
      sportSlug: job.sportSlug,
      season
    });

    let upsertResult: UpsertResult;

    try {
      const events = await job.adapter.fetchEvents(season);
      upsertResult = await this.eventsService.upsertEvents(events);
    } catch (error) {
      const finishedAt = this.now();
      const message = error instanceof Error ? error.message : String(error);

      await this.updateSyncLog(logId, {
        finishedAt,
        status: 'failed',
        upserted: 0,
        skipped: 0,
        error: message
      });

      this.logger.error('sync failed', {
        job: job.name,
        source: job.adapter.sourceId,
        sportSlug: job.sportSlug,
        error: message
      });

      return {
        source: job.adapter.sourceId,
        sportSlug: job.sportSlug,
        startedAt,
        finishedAt,
        status: 'failed',
        upserted: 0,
        skipped: 0,
        error: message
      };
    }

    const finishedAt = this.now();
    const errorSummary = upsertResult.errors.length > 0 ? summarizeErrors(upsertResult) : undefined;

    await this.updateSyncLog(logId, {
      finishedAt,
      status: 'success',
      upserted: upsertResult.upserted,
      skipped: upsertResult.skipped,
      error: errorSummary
    });

    this.logger.info('sync completed', {
      job: job.name,
      source: job.adapter.sourceId,
      sportSlug: job.sportSlug,
      upserted: upsertResult.upserted,
      skipped: upsertResult.skipped,
      validationErrors: upsertResult.errors.length
    });

    return {
      source: job.adapter.sourceId,
      sportSlug: job.sportSlug,
      startedAt,
      finishedAt,
      status: 'success',
      upserted: upsertResult.upserted,
      skipped: upsertResult.skipped
    };
  }

  private async createSyncLog(job: SyncJob, startedAt: Date): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `
        INSERT INTO sync_log (source, sport_slug, started_at, status)
        VALUES ($1, $2, $3, 'running')
        RETURNING id
      `,
      [job.adapter.sourceId, job.sportSlug, startedAt]
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new Error(`Failed to create sync_log entry for ${job.name}`);
    }

    return id;
  }

  private async updateSyncLog(
    logId: string,
    update: {
      finishedAt: Date;
      status: 'success' | 'failed';
      upserted: number;
      skipped: number;
      error?: string;
    }
  ): Promise<void> {
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
        jobLogId: logId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export function getCurrentSeason(): number {
  return new Date().getUTCFullYear();
}

function summarizeErrors(result: UpsertResult): string {
  const sample = result.errors
    .slice(0, 3)
    .map((e) => `${e.event.externalId}: ${e.error}`)
    .join(' | ');
  const suffix = result.errors.length > 3 ? ` (+${result.errors.length - 3} more)` : '';
  return `${result.errors.length} item errors. Sample: ${sample}${suffix}`;
}
