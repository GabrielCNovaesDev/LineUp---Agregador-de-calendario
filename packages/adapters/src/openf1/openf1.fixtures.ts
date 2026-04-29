import type { OpenF1Meeting, OpenF1Session } from './types.js';

export const openF1SessionsFixture: OpenF1Session[] = [
  {
    session_key: 9158,
    session_name: 'Race',
    session_type: 'Race',
    meeting_key: 1229,
    meeting_name: 'Australian Grand Prix',
    circuit_short_name: 'Melbourne',
    country_name: 'Australia',
    date_start: '2025-03-16T05:00:00+00:00',
    date_end: '2025-03-16T07:00:00+00:00',
    year: 2025
  },
  {
    session_key: 9157,
    session_name: 'Qualifying',
    session_type: 'Qualifying',
    meeting_key: 1229,
    meeting_name: 'Australian Grand Prix',
    circuit_short_name: 'Melbourne',
    country_name: 'Australia',
    date_start: '2025-03-15T05:00:00+00:00',
    date_end: '2025-03-15T06:00:00+00:00',
    year: 2025
  }
];

export const openF1MeetingsFixture: OpenF1Meeting[] = [
  {
    meeting_key: 1229,
    meeting_name: 'Australian Grand Prix',
    circuit_short_name: 'Albert Park Circuit',
    country_name: 'Australia',
    location: 'Melbourne',
    year: 2025
  }
];
