import { Pool } from 'pg';

// Singleton pattern para evitar reconexões em dev
let dbPool: Pool;

export function getDbPool() {
  if (!dbPool) {
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'sports_calendar',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return dbPool;
}

export async function query(text: string, params?: any[]) {
  const pool = getDbPool();
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Query ${text} executed in ${duration}ms`);
    return result;
  } catch (error) {
    console.error(`Error executing query ${text}:`, error);
    throw error;
  }
}

export async function closeDbPool() {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
  }
}