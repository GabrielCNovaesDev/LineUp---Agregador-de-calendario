import type { TheSportsDBEventsResponse } from './types.js';

export const wecEventsFixture: TheSportsDBEventsResponse = {
  events: [
    {
      idEvent: '1234567',
      strEvent: '2025 WEC Round 1 - 1000 Miles of Sebring',
      strVenue: 'Sebring International Raceway',
      strCountry: 'United States',
      dateEvent: '2025-03-15',
      strTime: '15:00:00',
      strTimestamp: '2025-03-15T15:00:00+00:00',
      strStatus: 'Not Started',
      intRound: '1'
    }
  ]
};

export const motogpEventsFixture: TheSportsDBEventsResponse = {
  events: [
    {
      idEvent: '7654321',
      strEvent: 'MotoGP Qatar Grand Prix',
      strVenue: 'Lusail International Circuit',
      strCountry: 'Qatar',
      dateEvent: '2025-04-13',
      strTime: '18:00:00',
      strTimestamp: null,
      strStatus: 'In Progress',
      intRound: '4'
    }
  ]
};
