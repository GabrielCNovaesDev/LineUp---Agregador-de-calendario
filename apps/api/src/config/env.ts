export const env = {
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/sportscalendar',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  adminSecret: process.env.ADMIN_SECRET,
  thesportsdbApiKey: process.env.THESPORTSDB_API_KEY ?? '3',
  schedulerEnabled: (process.env.SCHEDULER_ENABLED ?? 'true').toLowerCase() !== 'false',
  schedulerRunOnStart: (process.env.SCHEDULER_RUN_ON_START ?? 'true').toLowerCase() !== 'false'
};
