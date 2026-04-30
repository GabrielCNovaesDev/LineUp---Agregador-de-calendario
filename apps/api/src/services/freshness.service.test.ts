import assert from 'node:assert/strict';
import { FreshnessService, isStale } from './freshness.service.js';

interface RecordedQuery {
  sql: string;
  values?: unknown[];
}

class FakeDb {
  readonly queries: RecordedQuery[] = [];
  rowsBySlug = new Map<string, Date | null>();

  async query<R = Record<string, unknown>>(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });
    if (sql.includes('FROM sync_log')) {
      const slugs = (values?.[0] ?? []) as string[];
      const rows = slugs
        .filter((slug) => this.rowsBySlug.has(slug))
        .map((slug) => ({ sport_slug: slug, last_success: this.rowsBySlug.get(slug) ?? null }));
      return { rows: rows as R[], rowCount: rows.length };
    }
    return { rows: [] as R[], rowCount: 0 };
  }
}

async function testIsStaleConsidersNoSyncStale() {
  assert.equal(isStale(null, 360, new Date()), true);
}

async function testIsStaleWithinWindow() {
  const now = new Date('2026-04-30T12:00:00Z');
  const lastSync = new Date('2026-04-30T07:00:00Z'); // 5h ago
  assert.equal(isStale(lastSync, 360, now), false);
}

async function testIsStaleBeyondTwoIntervals() {
  const now = new Date('2026-04-30T12:00:00Z');
  const lastSync = new Date('2026-04-30T00:00:00Z'); // 12h ago, 2x interval
  // 12h is exactly 2x 360min — must be > to count as stale
  assert.equal(isStale(lastSync, 360, now), false);

  const olderSync = new Date('2026-04-29T23:00:00Z'); // 13h ago
  assert.equal(isStale(olderSync, 360, now), true);
}

async function testIsStaleReturnsFalseWhenIntervalIsZero() {
  // intervalMinutes=0 means "no scheduled sync" — never flag stale
  assert.equal(isStale(new Date('2020-01-01'), 0, new Date()), false);
}

async function testGetFreshnessReturnsAllConfiguredSports() {
  const db = new FakeDb();
  const now = new Date('2026-04-30T12:00:00Z');
  db.rowsBySlug.set('f1', new Date('2026-04-30T11:00:00Z')); // 1h ago — fresh
  // wec missing — should appear with null + stale=true
  const service = new FreshnessService(db, () => now);

  const result = await service.getFreshness([
    { sportSlug: 'f1', expectedIntervalMinutes: 360 },
    { sportSlug: 'wec', expectedIntervalMinutes: 720 }
  ]);

  assert.equal(result.sports.length, 2);
  const f1 = result.sports.find((s) => s.slug === 'f1');
  const wec = result.sports.find((s) => s.slug === 'wec');
  assert.ok(f1);
  assert.ok(wec);
  assert.equal(f1!.stale, false);
  assert.equal(f1!.lastSuccessfulSync, '2026-04-30T11:00:00.000Z');
  assert.equal(wec!.stale, true);
  assert.equal(wec!.lastSuccessfulSync, null);
  assert.equal(result.generatedAt, '2026-04-30T12:00:00.000Z');
}

async function testGetFreshnessHandlesEmptyJobList() {
  const db = new FakeDb();
  const service = new FreshnessService(db);
  const result = await service.getFreshness([]);
  assert.deepEqual(result.sports, []);
  assert.equal(db.queries.length, 0);
}

const tests = [
  ['isStale considers absent sync stale', testIsStaleConsidersNoSyncStale],
  ['isStale within 2x interval window', testIsStaleWithinWindow],
  ['isStale strictly beyond 2x interval', testIsStaleBeyondTwoIntervals],
  ['isStale returns false when interval is 0', testIsStaleReturnsFalseWhenIntervalIsZero],
  ['getFreshness returns all configured sports', testGetFreshnessReturnsAllConfiguredSports],
  ['getFreshness handles empty job list', testGetFreshnessHandlesEmptyJobList]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - FreshnessService ${name}`);
}
