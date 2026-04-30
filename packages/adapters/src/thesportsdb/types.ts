export type TheSportsDBSportSlug = 'wec' | 'motogp';

export interface TheSportsDBEvent {
  idEvent: string;
  strEvent: string | null;
  strVenue?: string | null;
  strCountry?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strTimestamp?: string | null;
  strStatus?: string | null;
  intRound?: string | null;
}

export interface TheSportsDBEventsResponse {
  events?: TheSportsDBEvent[] | null;
}
