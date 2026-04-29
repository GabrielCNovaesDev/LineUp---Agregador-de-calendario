import type { EventStatus } from '@sports-calendar/shared';

export interface SportAdapter {
  readonly sourceId: string;
  readonly sportSlug: string;
  fetchEvents(season: number): Promise<NormalizedEvent[]>;
}

export interface NormalizedEvent {
  externalId: string;
  source: string;
  sportSlug: string;
  title: string;
  subtitle?: string;
  venue?: string;
  country?: string;
  roundNumber?: number;
  startsAt: Date;
  endsAt?: Date;
  durationMinutes?: number;
  status: EventStatus;
  rawData: unknown;
}
