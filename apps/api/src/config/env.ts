export const env = {
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/sportscalendar',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development'
};
