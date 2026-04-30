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

export async function checkRedisConnection(): Promise<'connected' | 'error'> {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }

    const response = await redis.ping();
    return response === 'PONG' ? 'connected' : 'error';
  } catch {
    return 'error';
  }
}
