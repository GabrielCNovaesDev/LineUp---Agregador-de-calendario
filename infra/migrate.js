const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');
require('dotenv').config();

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/sportscalendar';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MAX_CONNECT_ATTEMPTS = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase(pool) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }

  throw lastError;
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.query('SELECT name FROM schema_migrations');
  return new Set(result.rows.map((row) => row.name));
}

async function getMigrationFiles() {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  return entries
    .filter((entry) => entry.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigration(pool, fileName) {
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const sql = await fs.readFile(filePath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [fileName]
    );
    await client.query('COMMIT');
    console.log(`Applied migration: ${fileName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
  });

  try {
    await waitForDatabase(pool);
    await ensureMigrationsTable(pool);

    const applied = await getAppliedMigrations(pool);
    const files = await getMigrationFiles();
    const pending = files.filter((fileName) => !applied.has(fileName));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const fileName of pending) {
      await applyMigration(pool, fileName);
    }

    console.log(`Migrations complete. Applied ${pending.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed.');
  console.error(error);
  process.exitCode = 1;
});
