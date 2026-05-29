import { createClient } from 'redis';

// Singleton pattern para evitar reconexões em dev
let redisClient: any;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });
  }
  return redisClient;
}

export async function connectRedis() {
  const client = getRedisClient();
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

export async function disconnectRedis() {
  const client = getRedisClient();
  if (client.isOpen) {
    await client.disconnect();
  }
}