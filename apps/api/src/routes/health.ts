import { Router } from 'express';
import { checkDbConnection } from '../lib/db.js';
import { checkRedisConnection } from '../lib/redis.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const [db, redis] = await Promise.all([checkDbConnection(), checkRedisConnection()]);
  const status = db === 'connected' && redis === 'connected' ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    db,
    redis,
    version: '1.0.0'
  });
});
