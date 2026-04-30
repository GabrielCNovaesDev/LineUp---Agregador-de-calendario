import { TheSportsDBAdapter } from '@sports-calendar/adapters';
import { env } from '../../config/env.js';
import type { SyncJob } from '../runner.js';

export const wecJob: SyncJob = {
  name: 'WEC Sync',
  sportSlug: 'wec',
  schedule: '0 */12 * * *',
  adapter: new TheSportsDBAdapter('wec', env.thesportsdbApiKey)
};
