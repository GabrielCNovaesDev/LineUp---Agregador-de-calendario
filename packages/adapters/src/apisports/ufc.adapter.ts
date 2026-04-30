import { APISportsBaseAdapter, type APISportsBaseAdapterOptions } from './base.adapter.js';

export class UFCAdapter extends APISportsBaseAdapter {
  readonly sportSlug = 'ufc';
  readonly leagueId = 1;

  constructor(apiKey: string, options: APISportsBaseAdapterOptions = {}) {
    super(apiKey, options);
  }
}
