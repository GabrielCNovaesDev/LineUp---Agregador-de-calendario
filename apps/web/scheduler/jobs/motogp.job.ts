import { TheSportsDBAdapter } from '@sports-calendar/adapters';
import type { SyncJob } from '../sync-runner';

export const motogpJob: SyncJob = {
  name: 'MotoGP Sync',
  sportSlug: 'motogp',
  schedule: '30 */12 * * *',
  intervalMinutes: 720,
  adapter: new TheSportsDBAdapter('motogp', process.env.THESPORTSDB_API_KEY || ''),
};
