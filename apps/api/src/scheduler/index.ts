import cron from 'node-cron';
import { env } from '../config/env.js';
import { db } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { EventsService } from '../services/events.service.js';
import { f1Job } from './jobs/f1.job.js';
import { motogpJob } from './jobs/motogp.job.js';
import { wecJob } from './jobs/wec.job.js';
import { startJob, SyncRunner, type StartedSyncJob, type SyncJob } from './runner.js';

interface SchedulerHandle {
  stop: () => void;
  triggerAll: () => Promise<void>;
}

export const jobs: SyncJob[] = [f1Job, wecJob, motogpJob];

export function startScheduler(): SchedulerHandle {
  const eventsService = new EventsService(db);
  const runner = new SyncRunner({ db, eventsService });

  const tasks = jobs.map((job) => {
    const task = cron.schedule(job.schedule, () => {
      void safeRunJob(runner, job);
    });
    console.log(`[scheduler] job scheduled: ${job.name} (${job.schedule})`);
    return task;
  });

  if (env.schedulerRunOnStart) {
    console.log('[scheduler] running initial sync');
    void runAll(runner);
  }

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop();
      }
    },
    triggerAll: () => runAll(runner)
  };
}

export function findJobBySportSlug(sportSlug: string): SyncJob | undefined {
  return jobs.find((job) => job.sportSlug === sportSlug);
}

export function triggerJob(job: SyncJob): Promise<StartedSyncJob> {
  return startJob(job, db, redis);
}

async function runAll(runner: SyncRunner): Promise<void> {
  // Run jobs sequentially to avoid bursting the upstream APIs at startup.
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
