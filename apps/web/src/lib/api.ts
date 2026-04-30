import type { Event, EventStatus, FreshnessResponse, PaginatedEvents, Sport } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export interface EventsParams {
  sports?: string[];
  from?: string;
  to?: string;
  status?: EventStatus;
  page?: number;
  limit?: number;
  tz?: string;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(','));
      continue;
    }
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // body was not JSON; keep default message
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  baseUrl: BASE_URL,

  getEvents(params: EventsParams = {}): Promise<PaginatedEvents> {
    return request<PaginatedEvents>(`/api/events${buildQuery(params as Record<string, unknown>)}`);
  },

  getEvent(id: string, tz?: string): Promise<Event> {
    return request<Event>(`/api/events/${encodeURIComponent(id)}${buildQuery({ tz })}`);
  },

  getSports(): Promise<{ data: Sport[] }> {
    return request<{ data: Sport[] }>('/api/sports');
  },

  getFreshness(): Promise<FreshnessResponse> {
    return request<FreshnessResponse>('/api/events/freshness');
  },

  exportICalUrl(params: { sports?: string[]; from?: string; to?: string }): string {
    return `${BASE_URL}/api/events/export/ical${buildQuery(params as Record<string, unknown>)}`;
  }
};
