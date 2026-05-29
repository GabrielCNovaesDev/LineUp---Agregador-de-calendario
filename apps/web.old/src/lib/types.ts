// Mirror of the API contract documented in apps/api/openapi.yaml.
// Kept hand-written for now; consider generating from the spec later.

export type EventStatus = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';

export type SportCategory = 'motorsport' | 'mma' | 'tennis';

export interface Sport {
  slug: string;
  name: string;
  category: SportCategory;
}

export interface Event {
  id: string;
  sport: Sport;
  title: string;
  subtitle: string | null;
  venue: string | null;
  country: string | null;
  roundNumber: number | null;
  startsAt: string;
  endsAt: string | null;
  durationMinutes: number | null;
  status: EventStatus;
  localTime?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

export interface PaginatedEvents {
  data: Event[];
  pagination: Pagination;
}

export interface SportFreshness {
  slug: string;
  lastSuccessfulSync: string | null;
  stale: boolean;
  expectedIntervalMinutes: number;
}

export interface FreshnessResponse {
  sports: SportFreshness[];
  generatedAt: string;
}
