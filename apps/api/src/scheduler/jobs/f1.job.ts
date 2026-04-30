import { OpenF1Adapter } from '@sports-calendar/adapters';
import type { SyncJob } from '../runner.js';

export const f1Job: SyncJob = {
  name: 'F1 Sync',
  sportSlug: 'f1',
  schedule: '0 */6 * * *',
  intervalMinutes: 360,
  adapter: new OpenF1Adapter()
};
