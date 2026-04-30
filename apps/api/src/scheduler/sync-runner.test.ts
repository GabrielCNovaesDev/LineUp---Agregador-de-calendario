import assert from 'node:assert/strict';
import type { NormalizedEvent, SportAdapter } from '@sports-calendar/adapters';
import { EventsService } from '../services/events.service.js';
import { SyncRunner } from './sync-runner.js';

interface RecordedQuery {
  sql: string;
  values?: unknown[];
}

class FakeDb {
  readonly queries: RecordedQuery[] = [];
  private logCounter = 0;

  async query<R = Record<string, unknown>>(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });

    if (sql.includes('SELECT id FROM sports')) {
      return { rows: [{ id: `sport-${String(values?.[0])}` }] as R[], rowCount: 1 };
    }

    if (sql.includes('INSERT INTO sync_log')) {
      this.logCounter += 1;
      return { rows: [{ id: `log-${this.logCounter}` }] as R[], rowCount: 1 };
    }

    if (sql.includes('UPDATE sync_log')) {
      return { rows: [] as R[], rowCount: 1 };
    }

    if (sql.includes('INSERT INTO events')) {
      return { rows: [] as R[], rowCount: 1 };
    }

    return { rows: [] as R[], rowCount: 0 };
  }

  syncLogUpdates(): RecordedQuery[] {
    return this.queries.filter((q) => q.sql.includes('UPDATE sync_log'));
  }
}

class FakeAdapter implements SportAdapter {
  constructor(
    readonly sourceId: string,
    readonly sportSlug: string,
    private readonly events: NormalizedEvent[],
    private readonly error?: Error
  ) {}

  async fetchEvents(): Promise<NormalizedEvent[]> {
    if (this.error) throw this.error;
    return this.events;
  }
}

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    externalId: 'openf1:1',
    source: 'openf1',
    sportSlug: 'f1',
    title: 'Test GP',
    startsAt: new Date('2025-06-01T12:00:00Z'),
    status: 'scheduled',
    rawData: null,
    ...overrides
  };
}

async function testSuccessfulSyncWritesLogs() {
  const db = new FakeDb();
  const eventsService = new EventsService(db);
  const runner = new SyncRunner({ db, eventsService, logger: silentLogger });
  const adapter = new FakeAdapter('openf1', 'f1', [makeEvent(), makeEvent({ externalId: 'openf1:2' })]);

  const result = await runner.run(adapter, 2025);

  assert.equal(result.status, 'success');
  assert.equal(result.upserted, 2);
  assert.equal(result.skipped, 0);

  const inserts = db.queries.filter((q) => q.sql.includes('INSERT INTO sync_log'));
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0]?.values?.[0], 'openf1');
  assert.equal(inserts[0]?.values?.[1], 'f1');

  const updates = db.syncLogUpdates();
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.values?.[2], 'success');
  assert.equal(updates[0]?.values?.[3], 2); // events_upserted
  assert.equal(updates[0]?.values?.[4], 0); // events_skipped
}

async function testFailedSyncRecordsError() {
  const db = new FakeDb();
  const eventsService = new EventsService(db);
  const runner = new SyncRunner({ db, eventsService, logger: silentLogger });
  const adapter = new FakeAdapter('openf1', 'f1', [], new Error('boom'));

  const result = await runner.run(adapter, 2025);

  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'boom');

  const updates = db.syncLogUpdates();
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.values?.[2], 'failed');
  assert.equal(updates[0]?.values?.[5], 'boom');
}

const tests = [
  ['successful sync writes logs', testSuccessfulSyncWritesLogs],
  ['failed sync records error', testFailedSyncRecordsError]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - SyncRunner ${name}`);
}
