import { TheSportsDBAdapter } from '@sports-calendar/adapters';
import type { SyncJob } from '../sync-runner';

export const wecJob: SyncJob = {
  name: 'WEC Sync',
  sportSlug: 'wec',
  schedule: '0 */12 * * *',
  intervalMinutes: 720,
  adapter: new TheSportsDBAdapter('wec', process.env.THESPORTSDB_API_KEY || ''),
};
