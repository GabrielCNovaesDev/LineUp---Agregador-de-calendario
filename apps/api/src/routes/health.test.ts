import assert from 'node:assert/strict';
import { decideHealthStatus } from './health.js';

async function testAllConnectedReturnsOk() {
  const decision = decideHealthStatus({
    db: 'connected',
    redis: 'connected',
    redisFailureSeconds: 0,
    gracePeriodSeconds: 120
  });
  assert.deepEqual(decision, { status: 'ok', httpStatus: 200 });
}

async function testDbDownReturns503() {
  const decision = decideHealthStatus({
    db: 'error',
    redis: 'connected',
    redisFailureSeconds: 0,
    gracePeriodSeconds: 120
  });
  assert.deepEqual(decision, { status: 'degraded', httpStatus: 503 });
}

async function testRedisDownWithinGraceReturns503() {
  const decision = decideHealthStatus({
    db: 'connected',
    redis: 'error',
    redisFailureSeconds: 30,
    gracePeriodSeconds: 120
  });
  assert.deepEqual(decision, { status: 'degraded', httpStatus: 503 });
}

async function testRedisDownPastGraceReturns200Degraded() {
  const decision = decideHealthStatus({
    db: 'connected',
    redis: 'error',
    redisFailureSeconds: 121,
    gracePeriodSeconds: 120
  });
  assert.deepEqual(decision, { status: 'degraded', httpStatus: 200 });
}

async function testGracePeriodZeroAlwaysReturns503OnRedisFault() {
  const decision = decideHealthStatus({
    db: 'connected',
    redis: 'error',
    redisFailureSeconds: 9999,
    gracePeriodSeconds: 0
  });
  assert.deepEqual(decision, { status: 'degraded', httpStatus: 503 });
}

async function testDbDownAlwaysWinsOverGrace() {
  const decision = decideHealthStatus({
    db: 'error',
    redis: 'error',
    redisFailureSeconds: 9999,
    gracePeriodSeconds: 120
  });
  assert.deepEqual(decision, { status: 'degraded', httpStatus: 503 });
}

const tests = [
  ['all connected returns ok 200', testAllConnectedReturnsOk],
  ['db down returns 503', testDbDownReturns503],
  ['redis down within grace returns 503', testRedisDownWithinGraceReturns503],
  ['redis down past grace returns 200 degraded', testRedisDownPastGraceReturns200Degraded],
  ['grace period 0 always returns 503 on redis fault', testGracePeriodZeroAlwaysReturns503OnRedisFault],
  ['db down always wins over redis grace', testDbDownAlwaysWinsOverGrace]
] as const;

for (const [name, run] of tests) {
  await run();
  console.log(`ok - decideHealthStatus ${name}`);
}
