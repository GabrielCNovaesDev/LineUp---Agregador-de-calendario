import assert from 'node:assert/strict';
import { parseListEventsQuery } from './events.parser.js';

function expectOk(query: Record<string, unknown>) {
  const result = parseListEventsQuery(query);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error('unreachable');
  return result.filter;
}

function expectErrors(query: Record<string, unknown>) {
  const result = parseListEventsQuery(query);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('unreachable');
  return result.errors;
}

async function testEmptyQueryReturnsEmptyFilter() {
  const filter = expectOk({});
  assert.deepEqual(filter, {});
}

async function testParsesSportsCsv() {
  const filter = expectOk({ sports: 'f1, wec , MOTOGP' });
  assert.deepEqual(filter.sports, ['f1', 'wec', 'motogp']);
}

async function testRejectsEmptySportsList() {
  const errors = expectErrors({ sports: ', ,' });
  assert.ok(errors.some((e) => e.includes('sports')));
}

async function testParsesIsoDates() {
  const filter = expectOk({ from: '2025-01-01', to: '2025-12-31T23:59:59Z' });
  assert.equal(filter.from?.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(filter.to?.toISOString(), '2025-12-31T23:59:59.000Z');
}

async function testRejectsInvalidDates() {
  const errors = expectErrors({ from: 'not-a-date' });
  assert.ok(errors.some((e) => e.includes('from')));
}

async function testRejectsInvertedRange() {
  const errors = expectErrors({ from: '2025-12-01', to: '2025-01-01' });
  assert.ok(errors.some((e) => e.includes('to must be after from')));
}

async function testRejectsUnknownStatus() {
  const errors = expectErrors({ status: 'foo' });
  assert.ok(errors.some((e) => e.includes('status')));
}

async function testParsesPagination() {
  const filter = expectOk({ page: '2', limit: '25' });
  assert.equal(filter.page, 2);
  assert.equal(filter.limit, 25);
}

async function testRejectsNonPositivePagination() {
  const errors = expectErrors({ page: '0', limit: '-5' });
  assert.equal(errors.length, 2);
}

async function testRejectsInvalidTimezone() {
  const errors = expectErrors({ timezone: 'Mars/Olympus_Mons' });
  assert.ok(errors.some((e) => e.includes('timezone')));
}

const tests = [
  ['empty query returns empty filter', testEmptyQueryReturnsEmptyFilter],
  ['parses sports csv', testParsesSportsCsv],
  ['rejects empty sports list', testRejectsEmptySportsList],
  ['parses iso dates', testParsesIsoDates],
  ['rejects invalid dates', testRejectsInvalidDates],
  ['rejects inverted from/to range', testRejectsInvertedRange],
  ['rejects unknown status', testRejectsUnknownStatus],
  ['parses pagination', testParsesPagination],
  ['rejects non-positive pagination', testRejectsNonPositivePagination],
  ['rejects invalid timezone', testRejectsInvalidTimezone]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - parseListEventsQuery ${name}`);
}
