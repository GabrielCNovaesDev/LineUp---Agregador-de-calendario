import { APISportsBaseAdapter, type APISportsBaseAdapterOptions } from './base.adapter.js';

export class TennisAdapter extends APISportsBaseAdapter {
  readonly sportSlug = 'tennis';
  readonly leagueId = 0;

  protected override get defaultApiHost(): string {
    return 'v1.tennis.api-sports.io';
  }

  constructor(apiKey: string, options: APISportsBaseAdapterOptions = {}) {
    super(apiKey, options);
  }
}
