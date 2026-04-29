import pg from 'pg';
import { env } from '../config/env.js';

export const db = new pg.Pool({
  connectionString: env.databaseUrl
});

export async function checkDbConnection(): Promise<'connected' | 'error'> {
  try {
    await db.query('SELECT 1');
    return 'connected';
  } catch {
    return 'error';
  }
}
