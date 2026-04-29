export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type?: string;
  meeting_key: number;
  meeting_name: string;
  circuit_short_name?: string;
  country_name?: string;
  date_start: string;
  date_end?: string | null;
  year: number;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  circuit_short_name?: string;
  country_name?: string;
  location?: string;
  year: number;
}
