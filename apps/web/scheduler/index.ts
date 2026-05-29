import cron from 'node-cron';
import { getDbPool } from '@/lib/db';
import { CacheService } from '@/lib/cache';
import { AlertsService } from '@/services/alerts.service';
import { EventsService } from '@/services/events.service';
import { SyncRunner, type SyncJob, type StartedSyncJob, startJob } from './sync-runner';
import { f1Job } from './jobs/f1.job';
import { motogpJob } from './jobs/motogp.job';
import { wecJob } from './jobs/wec.job';
import { runNotificationsJob } from './jobs/notifications.job';

interface SchedulerHandle {
  stop: () => void;
  triggerAll: () => Promise<void>;
}

export const jobs: SyncJob[] = [f1Job, wecJob, motogpJob];

export function startScheduler(): SchedulerHandle {
  const db = getDbPool();
  const eventsService = new EventsService(db);
  const runner = new SyncRunner({
    db,
    eventsService,
    cache: CacheService.getInstance(),
    alerts: new AlertsService(db),
  });

  const tasks = jobs.map((job) => {
    const task = cron.schedule(job.schedule, () => {
      void safeRunJob(runner, job);
    });
    console.log(`[scheduler] job scheduled: ${job.name} (${job.schedule})`);
    return task;
  });

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

export function findJobBySportSlug(sportSlug: string): SyncJob | undefined {
  return jobs.find((job) => job.sportSlug === sportSlug);
}

export function triggerJob(job: SyncJob): Promise<StartedSyncJob> {
  return startJob(job);
}

async function runAll(runner: SyncRunner): Promise<void> {
  for (const job of jobs) {
    await safeRunJob(runner, job);
  }
}

async function safeRunJob(runner: SyncRunner, job: SyncJob): Promise<void> {
  try {
    await runner.runJob(job);
  } catch (error) {
    console.error(`[scheduler] job ${job.name} threw an unexpected error:`, error);
  }
}
