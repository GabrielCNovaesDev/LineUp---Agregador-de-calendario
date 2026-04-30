import assert from 'node:assert/strict';
import { AdapterFetchError } from '../errors.js';
import { TheSportsDBAdapter } from './index.js';
import { motogpEventsFixture, wecEventsFixture } from './thesportsdb.fixtures.js';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init
  });
}

function fetchMock(queue: Array<Response | Error>) {
  const calls: Array<[URL | RequestInfo, RequestInit | undefined]> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push([input, init]);
    const next = queue.shift();

    if (next instanceof Error) {
      throw next;
    }

    if (!next) {
      throw new Error('No mock response queued');
    }

    return next;
  };

  return { calls, fetchImpl };
}

function silentLogger() {
  const warnings: unknown[][] = [];

  return {
    warnings,
    logger: {
      warn: (...args: unknown[]) => {
        warnings.push(args);
      }
    }
  };
}

async function testNormalizesWecEvents() {
  const { calls, fetchImpl } = fetchMock([jsonResponse(wecEventsFixture)]);
  const { logger, warnings } = silentLogger();
  const adapter = new TheSportsDBAdapter('wec', 'test-key', {
    fetchImpl,
    logger,
    sleep: async () => {}
  });

  const events = await adapter.fetchEvents(2025);
  const url = calls[0]?.[0] as URL;

  assert.equal(url.pathname, '/api/v1/json/test-key/eventsseason.php');
  assert.equal(url.searchParams.get('id'), '4370');
  assert.equal(url.searchParams.get('s'), '2025');
  assert.equal(events.length, 1);
  assert.deepEqual(
    {
      externalId: events[0]?.externalId,
      source: events[0]?.source,
      sportSlug: events[0]?.sportSlug,
      title: events[0]?.title,
      venue: events[0]?.venue,
      country: events[0]?.country,
      roundNumber: events[0]?.roundNumber,
      status: events[0]?.status
    },
    {
      externalId: 'thesportsdb:1234567',
      source: 'thesportsdb',
      sportSlug: 'wec',
      title: '2025 WEC Round 1 - 1000 Miles of Sebring',
      venue: 'Sebring International Raceway',
      country: 'United States',
      roundNumber: 1,
      status: 'scheduled'
    }
  );
  assert.equal(events[0]?.startsAt.toISOString(), '2025-03-15T15:00:00.000Z');
  assert.equal(warnings.length, 0);
}

async function testNormalizesMotogpFallbackUtcDate() {
  const { fetchImpl } = fetchMock([jsonResponse(motogpEventsFixture)]);
  const { logger, warnings } = silentLogger();
  const adapter = new TheSportsDBAdapter('motogp', 'test-key', {
    fetchImpl,
    logger,
    sleep: async () => {}
  });

  const [event] = await adapter.fetchEvents(2025);

  assert.equal(event?.sportSlug, 'motogp');
  assert.equal(event?.externalId, 'thesportsdb:7654321');
  assert.equal(event?.status, 'live');
  assert.equal(event?.startsAt.toISOString(), '2025-04-13T18:00:00.000Z');
  assert.equal(warnings.length, 1);
}

async function testReturnsEmptyListWhenApiReturnsNoEvents() {
  const { fetchImpl } = fetchMock([jsonResponse({ events: null })]);
  const adapter = new TheSportsDBAdapter('wec', 'test-key', {
    fetchImpl,
    logger: silentLogger().logger,
    sleep: async () => {}
  });

  const events = await adapter.fetchEvents(2025);

  assert.deepEqual(events, []);
}

async function testRejectsMissingRequiredFields() {
  const { fetchImpl } = fetchMock([
    jsonResponse({
      events: [
        {
          idEvent: 'missing-title',
          strEvent: null,
          dateEvent: '2025-01-01',
          strTime: '00:00:00'
        }
      ]
    })
  ]);
  const adapter = new TheSportsDBAdapter('wec', 'test-key', {
    fetchImpl,
    logger: silentLogger().logger,
    sleep: async () => {}
  });

  await assert.rejects(() => adapter.fetchEvents(2025), AdapterFetchError);
}

async function testRetriesTransientFailures() {
  const { calls, fetchImpl } = fetchMock([new Error('network down'), jsonResponse(wecEventsFixture)]);
  const adapter = new TheSportsDBAdapter('wec', 'test-key', {
    fetchImpl,
    logger: silentLogger().logger,
    sleep: async () => {}
  });

  const events = await adapter.fetchEvents(2025);

  assert.equal(events.length, 1);
  assert.equal(calls.length, 2);
}

const tests = [
  ['normalizes WEC events', testNormalizesWecEvents],
  ['normalizes MotoGP fallback UTC date', testNormalizesMotogpFallbackUtcDate],
  ['returns empty list when API returns no events', testReturnsEmptyListWhenApiReturnsNoEvents],
  ['rejects missing required fields', testRejectsMissingRequiredFields],
  ['retries transient failures', testRetriesTransientFailures]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - TheSportsDBAdapter ${name}`);
}
