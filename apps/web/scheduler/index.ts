import cron from 'node-cron';
import { getDbPool } from '@/lib/db';
import { CacheService } from '@/lib/cache';
import { AlertsService } from '@/services/alerts.service';
import { EventsService } from '@/services/events.service';
import { TheSportsDBAdapter, OpenF1Adapter, getLeagueId } from '@sports-calendar/adapters';
import { SyncRunner, type SyncJob, type StartedSyncJob, startJob } from './sync-runner';
import { runNotificationsJob } from './jobs/notifications.job';

interface SchedulerHandle {
  stop: () => void;
  triggerAll: () => Promise<void>;
}

// Frequências de sync por categoria de esporte
const SYNC_INTERVALS: Record<string, { schedule: string; intervalMinutes: number }> = {
  // Futebol: jogos diários, sync a cada 4h
  football: { schedule: '0 */4 * * *', intervalMinutes: 240 },
  // Motorsport: eventos semanais, sync a cada 12h
  motorsport: { schedule: '0 */12 * * *', intervalMinutes: 720 },
  // MMA/Boxing/Kickboxing: eventos semanais, sync a cada 8h
  mma: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  boxing: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  kickboxing: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  grappling: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  // Basketball/Tennis: jogos frequentes, sync a cada 6h
  basketball: { schedule: '0 */6 * * *', intervalMinutes: 360 },
  tennis: { schedule: '0 */6 * * *', intervalMinutes: 360 },
  volleyball: { schedule: '0 */6 * * *', intervalMinutes: 360 },
  // American Football: jogos semanais, sync a cada 8h
  'american-football': { schedule: '0 */8 * * *', intervalMinutes: 480 },
  // Outros: sync a cada 8h
  cycling: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  rugby: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  esports: { schedule: '0 */6 * * *', intervalMinutes: 360 },
  surfing: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  'ice-hockey': { schedule: '0 */6 * * *', intervalMinutes: 360 },
  golf: { schedule: '0 */8 * * *', intervalMinutes: 480 },
  'strength-sports': { schedule: '0 */12 * * *', intervalMinutes: 720 },
};

const DEFAULT_INTERVAL = { schedule: '0 */8 * * *', intervalMinutes: 480 };

// Slugs que usam adapters específicos (não TheSportsDB)
const CUSTOM_ADAPTER_SLUGS = new Set(['f1']);

let dynamicJobs: SyncJob[] = [];

function createAdapterForSport(slug: string, apiKey: string) {
  // F1 usa OpenF1Adapter
  if (slug === 'f1') {
    return new OpenF1Adapter();
  }

  // Todos os outros usam TheSportsDB
  const leagueId = getLeagueId(slug);
  if (!leagueId) {
    return null;
  }
  return new TheSportsDBAdapter(slug, apiKey);
}

async function loadDynamicJobs(): Promise<SyncJob[]> {
  const db = getDbPool();
  const apiKey = process.env.THESPORTSDB_API_KEY || '';

  const result = await db.query<{ slug: string; category: string }>(
    `SELECT slug, category FROM sports WHERE is_active = TRUE ORDER BY category, slug`
  );

  const jobs: SyncJob[] = [];
  const sportsPerCategory: Record<string, number> = {};

  for (const row of result.rows) {
    const adapter = createAdapterForSport(row.slug, apiKey);
    if (!adapter) {
      console.log(`[scheduler] skipping ${row.slug}: no adapter available`);
      continue;
    }

    const interval = SYNC_INTERVALS[row.category] ?? DEFAULT_INTERVAL;

    // Escalonar jobs da mesma categoria para não bater rate limit
    const categoryIndex = sportsPerCategory[row.category] ?? 0;
    sportsPerCategory[row.category] = categoryIndex + 1;

    // Offset de minutos para escalonar (2 min entre cada job da mesma categoria)
    const minuteOffset = categoryIndex * 2;
    const schedule = addMinuteOffset(interval.schedule, minuteOffset);

    jobs.push({
      name: `${row.slug} sync`,
      sportSlug: row.slug,
      schedule,
      intervalMinutes: interval.intervalMinutes,
      adapter,
    });
  }

  return jobs;
}

/**
 * Adiciona offset de minutos ao cron schedule para escalonar jobs.
 * Ex: '0 *​/4 * * *' com offset 6 -> '6 *​/4 * * *'
 */
function addMinuteOffset(schedule: string, offsetMinutes: number): string {
  if (offsetMinutes === 0) return schedule;

  const parts = schedule.split(' ');
  const currentMinute = parseInt(parts[0], 10);
  const newMinute = (currentMinute + offsetMinutes) % 60;
  parts[0] = String(newMinute);
  return parts.join(' ');
}

export async function startScheduler(): Promise<SchedulerHandle> {
  const db = getDbPool();
  const eventsService = new EventsService(db);
  const runner = new SyncRunner({
    db,
    eventsService,
    cache: CacheService.getInstance(),
    alerts: new AlertsService(db),
  });

  // Carregar jobs dinamicamente do banco
  try {
    dynamicJobs = await loadDynamicJobs();
    console.log(`[scheduler] loaded ${dynamicJobs.length} dynamic jobs from database`);
  } catch (error) {
    console.error('[scheduler] failed to load dynamic jobs, falling back to static:', error);
    // Fallback: jobs estáticos mínimos
    const apiKey = process.env.THESPORTSDB_API_KEY || '';
    dynamicJobs = [
      {
        name: 'f1 sync',
        sportSlug: 'f1',
        schedule: '0 */6 * * *',
        intervalMinutes: 360,
        adapter: new OpenF1Adapter(),
      },
      {
        name: 'motogp sync',
        sportSlug: 'motogp',
        schedule: '30 */12 * * *',
        intervalMinutes: 720,
        adapter: new TheSportsDBAdapter('motogp', apiKey),
      },
      {
        name: 'wec sync',
        sportSlug: 'wec',
        schedule: '0 */12 * * *',
        intervalMinutes: 720,
        adapter: new TheSportsDBAdapter('wec', apiKey),
      },
    ];
  }

  const tasks = dynamicJobs.map((job) => {
    const task = cron.schedule(job.schedule, () => {
      void safeRunJob(runner, job);
    });
    console.log(`[scheduler] job scheduled: ${job.name} (${job.schedule})`);
    return task;
  });

  // Notifications job: a cada 5 minutos
  const notifTask = cron.schedule('*/5 * * * *', () => {
    void runNotificationsJob().catch((err) =>
      console.error('[scheduler] notifications job failed:', err)
    );
  });
  console.log('[scheduler] job scheduled: Notifications (*/5 * * * *)');

  const runOnStart = process.env.SCHEDULER_RUN_ON_START === 'true';
  if (runOnStart) {
    console.log('[scheduler] running initial sync');
    void runAll(runner);
  }

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop();
      }
      notifTask.stop();
    },
    triggerAll: () => runAll(runner),
  };
}

export function getJobs(): SyncJob[] {
  return dynamicJobs;
}

export function findJobBySportSlug(sportSlug: string): SyncJob | undefined {
  return dynamicJobs.find((job) => job.sportSlug === sportSlug);
}

export function triggerJob(job: SyncJob): Promise<StartedSyncJob> {
  return startJob(job);
}

async function runAll(runner: SyncRunner): Promise<void> {
  for (const job of dynamicJobs) {
    await safeRunJob(runner, job);
    // Pausa de 2s entre jobs para respeitar rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function safeRunJob(runner: SyncRunner, job: SyncJob): Promise<void> {
  try {
    await runner.runJob(job);
  } catch (error) {
    console.error(`[scheduler] job ${job.name} threw an unexpected error:`, error);
  }
}
