import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false
});

redis.on('error', () => {
  // Health checks report Redis status; suppressing the event prevents noisy dev crashes.
});

let firstFailureAt: number | null = null;
let now: () => number = Date.now;

export type RedisHealth = 'connected' | 'error';

export async function checkRedisConnection(): Promise<RedisHealth> {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }

    const response = await redis.ping();
    if (response === 'PONG') {
      firstFailureAt = null;
      return 'connected';
    }
    markFailure();
    return 'error';
  } catch {
    markFailure();
    return 'error';
  }
}

export function getRedisFailureDurationSeconds(): number {
  if (firstFailureAt === null) return 0;
  return Math.floor((now() - firstFailureAt) / 1000);
}

// Test seam: lets specs control the clock and reset the module-level state.
export function __setRedisHealthClockForTests(impl: () => number): void {
  now = impl;
}

export function __resetRedisHealthForTests(): void {
  firstFailureAt = null;
  now = Date.now;
}

function markFailure(): void {
  if (firstFailureAt === null) {
    firstFailureAt = now();
  }
}
