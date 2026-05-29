import { connectRedis } from './redis';

export class CacheService {
  private static instance: CacheService;
  private redisClient: ReturnType<typeof connectRedis>;

  private constructor() {
    this.redisClient = connectRedis();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get(key: string): Promise<unknown> {
    try {
      const client = await this.redisClient;
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const client = await this.redisClient;
      const serialized = JSON.stringify(value);
      if (ttl) {
        await client.setEx(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = await this.redisClient;
      await client.del(key);
    } catch (error) {
      console.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const client = await this.redisClient;
      await client.flushDb();
    } catch (error) {
      console.error('Cache CLEAR error:', error);
    }
  }
}

export const cacheService = CacheService.getInstance();