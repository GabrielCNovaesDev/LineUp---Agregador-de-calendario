import { OpenF1Adapter, TheSportsDBAdapter } from '@sports-calendar/adapters';
import type { SportAdapter } from '@sports-calendar/adapters';
import cron from 'node-cron';
import { env } from '../config/env.js';
import { db } from '../lib/db.js';
import { EventsService } from '../services/events.service.js';
import { SyncRunner } from './sync-runner.js';

export interface ScheduledJob {
  name: string;
  schedule: string;
  adapter: SportAdapter;
}

interface SchedulerHandle {
  stop: () => void;
  triggerAll: () => Promise<void>;
}

export function startScheduler(): SchedulerHandle {
  const eventsService = new EventsService(db);
  const runner = new SyncRunner({ db, eventsService });

  const jobs: ScheduledJob[] = [
    {
      name: 'openf1-f1',
      schedule: '0 */6 * * *', // every 6 hours
      adapter: new OpenF1Adapter()
    },
    {
      name: 'thesportsdb-wec',
      schedule: '0 */12 * * *', // every 12 hours
      adapter: new TheSportsDBAdapter('wec', env.thesportsdbApiKey)
    },
    {
      name: 'thesportsdb-motogp',
      schedule: '30 */12 * * *', // every 12 hours, offset 30 min from WEC
      adapter: new TheSportsDBAdapter('motogp', env.thesportsdbApiKey)
    }
  ];

  const tasks = jobs.map((job) => {
    const task = cron.schedule(job.schedule, () => {
      void runJob(runner, job);
    });
    console.log(`[scheduler] registered ${job.name} (${job.schedule})`);
    return task;
  });

  if (env.schedulerRunOnStart) {
    void runAll(runner, jobs);
  }

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop();
      }
    },
    triggerAll: () => runAll(runner, jobs)
  };
}

async function runAll(runner: SyncRunner, jobs: ScheduledJob[]): Promise<void> {
  // Run jobs sequentially to avoid bursting the upstream APIs at startup.
  for (const job of jobs) {
    await runJob(runner, job);
  }
}

async function runJob(runner: SyncRunner, job: ScheduledJob): Promise<void> {
  const season = new Date().getUTCFullYear();
  try {
    await runner.run(job.adapter, season);
  } catch (error) {
    console.error(`[scheduler] job ${job.name} threw an unexpected error:`, error);
  }
}
