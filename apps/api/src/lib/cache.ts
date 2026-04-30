import type { Redis } from 'ioredis';

export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      const cached = await this.redis.get(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch (error) {
      this.logCacheError('get', key, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.ensureConnected();
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logCacheError('set', key, error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      await this.ensureConnected();
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logCacheError('invalidate', pattern, error);
    }
  }

  async getOrFetch<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  private async ensureConnected(): Promise<void> {
    if (this.redis.status === 'wait') {
      await this.redis.connect();
    }
  }

  private logCacheError(operation: string, key: string, error: unknown): void {
    console.warn(`[cache] ${operation} failed`, {
      key,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
