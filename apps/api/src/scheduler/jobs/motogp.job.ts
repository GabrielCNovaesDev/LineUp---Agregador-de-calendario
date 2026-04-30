import { TheSportsDBAdapter } from '@sports-calendar/adapters';
import { env } from '../../config/env.js';
import type { SyncJob } from '../runner.js';

export const motogpJob: SyncJob = {
  name: 'MotoGP Sync',
  sportSlug: 'motogp',
  schedule: '30 */12 * * *',
  adapter: new TheSportsDBAdapter('motogp', env.thesportsdbApiKey)
};
