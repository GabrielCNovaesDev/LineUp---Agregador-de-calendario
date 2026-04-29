import assert from 'node:assert/strict';
import { AdapterFetchError } from '../errors.js';
import { OpenF1Adapter } from './index.js';
import { openF1MeetingsFixture, openF1SessionsFixture } from './openf1.fixtures.js';

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

async function testNormalizesFetchedEvents() {
  const { calls, fetchImpl } = fetchMock([
    jsonResponse(openF1SessionsFixture),
    jsonResponse(openF1MeetingsFixture)
  ]);

  const adapter = new OpenF1Adapter({
    fetchImpl,
    sleep: async () => {},
    now: () => new Date('2025-03-14T12:00:00Z')
  });

  const events = await adapter.fetchEvents(2025);

  assert.equal(calls.length, 2);
  assert.equal(events.length, 2);
  assert.deepEqual(
    {
      externalId: events[0]?.externalId,
      source: events[0]?.source,
      sportSlug: events[0]?.sportSlug,
      title: events[0]?.title,
      subtitle: events[0]?.subtitle,
      venue: events[0]?.venue,
      country: events[0]?.country,
      durationMinutes: events[0]?.durationMinutes,
      status: events[0]?.status
    },
    {
      externalId: 'openf1:9158',
      source: 'openf1',
      sportSlug: 'f1',
      title: 'Australian Grand Prix',
      subtitle: 'Corrida',
      venue: 'Albert Park Circuit',
      country: 'Australia',
      durationMinutes: 120,
      status: 'scheduled'
    }
  );
  assert.equal(events[0]?.startsAt.toISOString(), '2025-03-16T05:00:00.000Z');
  assert.equal(events[0]?.endsAt?.toISOString(), '2025-03-16T07:00:00.000Z');
}

async function testMapsLiveStatus() {
  const { fetchImpl } = fetchMock([
    jsonResponse([openF1SessionsFixture[0]]),
    jsonResponse(openF1MeetingsFixture)
  ]);

  const adapter = new OpenF1Adapter({
    fetchImpl,
    sleep: async () => {},
    now: () => new Date('2025-03-16T06:00:00Z')
  });

  const [event] = await adapter.fetchEvents(2025);

  assert.equal(event?.status, 'live');
}

async function testDeduplicatesExternalIds() {
  const { fetchImpl } = fetchMock([
    jsonResponse([openF1SessionsFixture[0], openF1SessionsFixture[0]]),
    jsonResponse(openF1MeetingsFixture)
  ]);

  const adapter = new OpenF1Adapter({
    fetchImpl,
    sleep: async () => {},
    now: () => new Date('2025-03-14T12:00:00Z')
  });

  const events = await adapter.fetchEvents(2025);

  assert.equal(events.length, 1);
  assert.equal(new Set(events.map((event) => event.externalId)).size, events.length);
}

async function testRetriesTransientFailures() {
  const { calls, fetchImpl } = fetchMock([
    new Error('network down'),
    jsonResponse(openF1MeetingsFixture),
    jsonResponse(openF1SessionsFixture)
  ]);

  const adapter = new OpenF1Adapter({
    fetchImpl,
    sleep: async () => {},
    now: () => new Date('2025-03-14T12:00:00Z')
  });

  const events = await adapter.fetchEvents(2025);

  assert.equal(events.length, 2);
  assert.equal(calls.length, 3);
}

async function testThrowsAfterRetries() {
  const { fetchImpl } = fetchMock([
    jsonResponse({ message: 'bad' }, { status: 500 }),
    jsonResponse({ message: 'bad' }, { status: 500 }),
    jsonResponse({ message: 'bad' }, { status: 500 }),
    jsonResponse({ message: 'bad' }, { status: 500 })
  ]);
  const adapter = new OpenF1Adapter({
    fetchImpl,
    maxAttempts: 2,
    sleep: async () => {}
  });

  await assert.rejects(() => adapter.fetchEvents(2025), AdapterFetchError);
}

const tests = [
  ['normalizes fetched events', testNormalizesFetchedEvents],
  ['maps live status', testMapsLiveStatus],
  ['deduplicates external IDs', testDeduplicatesExternalIds],
  ['retries transient failures', testRetriesTransientFailures],
  ['throws after retries', testThrowsAfterRetries]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - OpenF1Adapter ${name}`);
}
