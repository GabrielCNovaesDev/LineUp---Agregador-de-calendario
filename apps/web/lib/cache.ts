import { getDbPool } from './db';
import { connectRedis } from './redis';

export class CacheService {
  private static instance: CacheService;
  private redisClient: any;

  private constructor() {
    this.redisClient = connectRedis();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redisClient.setEx(key, ttl, serialized);
      } else {
        await this.redisClient.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redisClient.flushDb();
    } catch (error) {
      console.error('Cache CLEAR error:', error);
    }
  }
}

export const cacheService = CacheService.getInstance();