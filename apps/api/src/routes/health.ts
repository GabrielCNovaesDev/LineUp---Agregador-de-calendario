import { Router } from 'express';
import { env } from '../config/env.js';
import { checkDbConnection } from '../lib/db.js';
import { checkRedisConnection, getRedisFailureDurationSeconds } from '../lib/redis.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const [db, redis] = await Promise.all([checkDbConnection(), checkRedisConnection()]);
  const redisFailureSeconds = redis === 'error' ? getRedisFailureDurationSeconds() : 0;

  const decision = decideHealthStatus({
    db,
    redis,
    redisFailureSeconds,
    gracePeriodSeconds: env.redisHealthGracePeriodSeconds
  });

  res.status(decision.httpStatus).json({
    status: decision.status,
    db,
    redis,
    redisFailureSeconds,
    version: '1.0.0'
  });
});

export interface HealthSnapshot {
  db: 'connected' | 'error';
  redis: 'connected' | 'error';
  redisFailureSeconds: number;
  gracePeriodSeconds: number;
}

export interface HealthDecision {
  status: 'ok' | 'degraded';
  httpStatus: 200 | 503;
}

// Pure: db down → 503; redis down within grace → 503 (let LB shift traffic);
// redis down past grace → 200 degraded (global outage, all instances same).
export function decideHealthStatus(snapshot: HealthSnapshot): HealthDecision {
  if (snapshot.db !== 'connected') {
    return { status: 'degraded', httpStatus: 503 };
  }
  if (snapshot.redis === 'connected') {
    return { status: 'ok', httpStatus: 200 };
  }
  if (snapshot.gracePeriodSeconds > 0 && snapshot.redisFailureSeconds > snapshot.gracePeriodSeconds) {
    return { status: 'degraded', httpStatus: 200 };
  }
  return { status: 'degraded', httpStatus: 503 };
}
