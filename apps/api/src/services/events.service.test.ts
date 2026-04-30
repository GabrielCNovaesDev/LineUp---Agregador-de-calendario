import assert from 'node:assert/strict';
import type { NormalizedEvent } from '@sports-calendar/adapters';
import { EventsService, validateNormalizedEvent } from './events.service.js';

interface RecordedQuery {
  sql: string;
  values?: unknown[];
}

class FakeDb {
  readonly queries: RecordedQuery[] = [];
  sportIds = new Map<string, string>([['f1', 'sport-f1']]);
  nextRowCount = 1;
  failNextEventQuery = false;

  // Hooks for listEvents tests.
  countResult = '0';
  listRows: unknown[] = [];

  async query<R = Record<string, unknown>>(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });

    if (sql.includes('SELECT id FROM sports')) {
      return {
        rows: (this.sportIds.has(String(values?.[0])) ? [{ id: this.sportIds.get(String(values?.[0])) }] : []) as R[],
        rowCount: 1
      };
    }

    if (sql.includes('SELECT COUNT(*)::text AS count')) {
      return { rows: [{ count: this.countResult }] as R[], rowCount: 1 };
    }

    if (sql.includes('FROM events e')) {
      return { rows: this.listRows as R[], rowCount: this.listRows.length };
    }

    if (this.failNextEventQuery) {
      this.failNextEventQuery = false;
      throw new Error('insert failed');
    }

    return { rows: [] as R[], rowCount: this.nextRowCount };
  }
}

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    externalId: 'openf1:9158',
    source: 'openf1',
    sportSlug: 'f1',
    title: 'Australian Grand Prix',
    subtitle: 'Corrida',
    venue: 'Albert Park Circuit',
    country: 'Australia',
    roundNumber: 3,
    startsAt: new Date('2025-03-16T05:00:00Z'),
    endsAt: new Date('2025-03-16T07:00:00Z'),
    durationMinutes: 120,
    status: 'scheduled',
    rawData: { fixture: true },
    ...overrides
  };
}

async function testValidationRejectsInvalidEvents() {
  const validation = validateNormalizedEvent(
    makeEvent({
      title: '',
      startsAt: new Date('2019-01-01T00:00:00Z'),
      endsAt: new Date('2018-01-01T00:00:00Z')
    })
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('title is required'));
  assert.ok(validation.errors.includes('endsAt must be after startsAt'));
  assert.ok(validation.errors.includes('startsAt looks incorrect: year < 2020'));
}

async function testUpsertsValidEvents() {
  const db = new FakeDb();
  const service = new EventsService(db);
  const result = await service.upsertEvents([makeEvent()]);

  assert.deepEqual(result, { upserted: 1, skipped: 0, errors: [] });
  assert.equal(db.queries.length, 2);
  assert.ok(db.queries[1]?.sql.includes('ON CONFLICT (source, external_id) DO UPDATE'));
  assert.equal(db.queries[1]?.values?.[0], 'sport-f1');
  assert.equal(db.queries[1]?.values?.[1], 'openf1:9158');
}

async function testSkipsUnknownSportsWithoutBreakingBatch() {
  const db = new FakeDb();
  const service = new EventsService(db);
  const result = await service.upsertEvents([makeEvent({ sportSlug: 'unknown' }), makeEvent()]);

  assert.equal(result.upserted, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0]?.error ?? '', /Unknown sport slug/);
}

async function testCollectsErrorsAndContinuesBatch() {
  const db = new FakeDb();
  db.failNextEventQuery = true;
  const service = new EventsService(db);
  const result = await service.upsertEvents([
    makeEvent({ externalId: 'openf1:1' }),
    makeEvent({ externalId: 'openf1:2' })
  ]);

  assert.equal(result.upserted, 1);
  assert.equal(result.skipped, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0]?.error, 'insert failed');
}

async function testListEventsBuildsQueryWithFilters() {
  const db = new FakeDb();
  db.countResult = '12';
  db.listRows = [
    {
      id: 'evt-1',
      title: 'Australian Grand Prix',
      subtitle: 'Corrida',
      venue: 'Albert Park Circuit',
      country: 'Australia',
      round_number: 3,
      starts_at: new Date('2025-03-16T05:00:00Z'),
      ends_at: new Date('2025-03-16T07:00:00Z'),
      duration_minutes: 120,
      status: 'scheduled',
      sport_slug: 'f1',
      sport_name: 'Fórmula 1',
      sport_category: 'motorsport'
    }
  ];

  const service = new EventsService(db);
  const result = await service.listEvents({
    sports: ['f1', 'wec'],
    from: new Date('2025-01-01T00:00:00Z'),
    to: new Date('2025-12-31T23:59:59Z'),
    status: 'scheduled',
    page: 2,
    limit: 25,
    timezone: 'America/Sao_Paulo'
  });

  assert.equal(result.total, 12);
  assert.equal(result.page, 2);
  assert.equal(result.limit, 25);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0]?.id, 'evt-1');
  assert.deepEqual(result.events[0]?.sport, {
    slug: 'f1',
    name: 'Fórmula 1',
    category: 'motorsport'
  });
  assert.equal(result.events[0]?.startsAt, '2025-03-16T05:00:00.000Z');
  assert.equal(result.events[0]?.localTime, '2025-03-16T02:00:00-03:00');

  const listQuery = db.queries.find((q) => q.sql.includes('FROM events e\n        JOIN sports'));
  assert.ok(listQuery, 'expected list query');
  assert.ok(listQuery!.sql.includes('s.slug = ANY('));
  assert.ok(listQuery!.sql.includes('e.starts_at >= '));
  assert.ok(listQuery!.sql.includes('e.starts_at <= '));
  assert.ok(listQuery!.sql.includes('e.status = '));
  assert.ok(listQuery!.sql.includes('LIMIT'));
  assert.ok(listQuery!.sql.includes('OFFSET'));
  assert.deepEqual(listQuery!.values?.[0], ['f1', 'wec']);
  assert.equal(listQuery!.values?.at(-2), 25); // limit
  assert.equal(listQuery!.values?.at(-1), 25); // offset = (page-1) * limit = 25
}

async function testListEventsAppliesDefaultFromWindow() {
  const db = new FakeDb();
  db.countResult = '0';
  db.listRows = [];

  const service = new EventsService(db);
  await service.listEvents({});

  const listQuery = db.queries.find((q) => q.sql.includes('FROM events e\n        JOIN sports'));
  assert.ok(listQuery);
  assert.ok(
    listQuery!.sql.includes("e.starts_at >= NOW() - INTERVAL '1 day'"),
    'expected default time window'
  );
}

async function testListEventsClampsLimit() {
  const db = new FakeDb();
  const service = new EventsService(db);
  const result = await service.listEvents({ limit: 9999 });
  assert.equal(result.limit, 100);
}

const tests = [
  ['validation rejects invalid events', testValidationRejectsInvalidEvents],
  ['upserts valid events', testUpsertsValidEvents],
  ['skips unknown sports without breaking batch', testSkipsUnknownSportsWithoutBreakingBatch],
  ['collects errors and continues batch', testCollectsErrorsAndContinuesBatch],
  ['listEvents builds query with filters', testListEventsBuildsQueryWithFilters],
  ['listEvents applies default time window', testListEventsAppliesDefaultFromWindow],
  ['listEvents clamps limit to 100', testListEventsClampsLimit]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - EventsService ${name}`);
}
