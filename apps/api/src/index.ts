import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './lib/db.js';
import { redis } from './lib/redis.js';
import { startScheduler } from './scheduler/index.js';

const app = createApp();
const server = createServer(app);
const scheduler = env.schedulerEnabled ? startScheduler() : null;

server.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down API.`);

  scheduler?.stop();

  server.close(async () => {
    await Promise.allSettled([db.end(), redis.quit()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
