import assert from 'node:assert/strict';
import { AlertsService } from './alerts.service.js';

interface RecordedQuery {
  sql: string;
  values?: unknown[];
}

interface FakeDbState {
  recentZeroCount: number; // how many of the last N successful syncs had touched=0
  recentTotalCount: number; // total successful syncs in the window
  insertReturnsRow: boolean; // false simulates ON CONFLICT DO NOTHING
  updateRowCount: number;
}

class FakeDb {
  readonly queries: RecordedQuery[] = [];
  state: FakeDbState = {
    recentZeroCount: 0,
    recentTotalCount: 0,
    insertReturnsRow: true,
    updateRowCount: 0
  };

  async query<R = Record<string, unknown>>(sql: string, values?: unknown[]) {
    this.queries.push({ sql, values });

    if (sql.includes('WHERE touched = 0')) {
      return {
        rows: [{ count: String(this.state.recentZeroCount) }] as R[],
        rowCount: 1
      };
    }

    if (sql.includes('SELECT 1 FROM sync_log')) {
      return {
        rows: [{ count: String(this.state.recentTotalCount) }] as R[],
        rowCount: 1
      };
    }

    if (sql.includes('INSERT INTO alerts')) {
      const row = this.state.insertReturnsRow ? [{ id: 'alert-1' }] : [];
      return { rows: row as R[], rowCount: row.length };
    }

    if (sql.includes('UPDATE alerts')) {
      return { rows: [] as R[], rowCount: this.state.updateRowCount };
    }

    if (sql.includes('SELECT id, sport_slug, kind, message')) {
      return { rows: [] as R[], rowCount: 0 };
    }

    return { rows: [] as R[], rowCount: 0 };
  }
}

const silentLogger = { warn: () => {} };

async function testRaisesAlertOnThreeConsecutiveZeros() {
  const db = new FakeDb();
  db.state.recentTotalCount = 3;
  db.state.recentZeroCount = 3;
  const service = new AlertsService(db, silentLogger);

  const result = await service.reconcileAfterSync('f1', { upserted: 0, skipped: 0 });

  assert.equal(result.raised, true);
  assert.equal(result.resolved, false);
  const inserts = db.queries.filter((q) => q.sql.includes('INSERT INTO alerts'));
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0]?.values?.[0], 'f1');
  assert.equal(inserts[0]?.values?.[1], 'silent_failure');
}

async function testDoesNotDuplicateActiveAlert() {
  const db = new FakeDb();
  db.state.recentTotalCount = 3;
  db.state.recentZeroCount = 3;
  db.state.insertReturnsRow = false; // ON CONFLICT DO NOTHING — already exists
  const service = new AlertsService(db, silentLogger);

  const result = await service.reconcileAfterSync('f1', { upserted: 0, skipped: 0 });

  assert.equal(result.raised, false);
  assert.equal(result.resolved, false);
}

async function testDoesNotRaiseWhenFewerThanThreeSuccessfulSyncs() {
  // Fresh install: only 1 successful sync so far, even if it had 0 touched
  const db = new FakeDb();
  db.state.recentTotalCount = 1;
  db.state.recentZeroCount = 1;
  const service = new AlertsService(db, silentLogger);

  const result = await service.reconcileAfterSync('f1', { upserted: 0, skipped: 0 });

  assert.equal(result.raised, false);
  const inserts = db.queries.filter((q) => q.sql.includes('INSERT INTO alerts'));
  assert.equal(inserts.length, 0);
}

async function testResolvesActiveAlertWhenSyncUpserts() {
  const db = new FakeDb();
  db.state.updateRowCount = 1; // an active alert was found and resolved
  const service = new AlertsService(db, silentLogger);

  const result = await service.reconcileAfterSync('f1', { upserted: 5, skipped: 0 });

  assert.equal(result.raised, false);
  assert.equal(result.resolved, true);
  const updates = db.queries.filter((q) => q.sql.includes('UPDATE alerts'));
  assert.equal(updates.length, 1);
}

async function testResolvesAlsoOnSkipsOnly() {
  // skipped > 0 means the adapter returned data but validator rejected it —
  // not silent failure (that's "different bug"). Still resolve any open alert.
  const db = new FakeDb();
  db.state.updateRowCount = 1;
  const service = new AlertsService(db, silentLogger);

  const result = await service.reconcileAfterSync('f1', { upserted: 0, skipped: 3 });

  assert.equal(result.resolved, true);
}

async function testListActiveExcludesResolved() {
  const db = new FakeDb();
  const service = new AlertsService(db, silentLogger);
  await service.listActive();
  const select = db.queries.find((q) => q.sql.includes('SELECT id, sport_slug'));
  assert.ok(select);
  assert.ok(select!.sql.includes('resolved_at IS NULL'));
}

const tests = [
  ['raises alert on three consecutive zeros', testRaisesAlertOnThreeConsecutiveZeros],
  ['does not duplicate active alert', testDoesNotDuplicateActiveAlert],
  ['does not raise when fewer than three successful syncs', testDoesNotRaiseWhenFewerThanThreeSuccessfulSyncs],
  ['resolves active alert when sync upserts', testResolvesActiveAlertWhenSyncUpserts],
  ['resolves also when validator skips events', testResolvesAlsoOnSkipsOnly],
  ['listActive excludes resolved alerts', testListActiveExcludesResolved]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - AlertsService ${name}`);
}
