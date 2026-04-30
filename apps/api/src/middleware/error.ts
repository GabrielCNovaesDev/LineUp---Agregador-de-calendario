import type { Response } from 'express';

// Postgres / pg connection-related SQLSTATE codes and Node errno strings.
// When any of these surface, the database is unreachable or refusing
// connections — the right semantic is 503 (Service Unavailable), not 500.
const DB_CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETUNREACH',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  '08000', // connection_exception
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08003', // connection_does_not_exist
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '08006', // connection_failure
  '08007', // transaction_resolution_unknown
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03'  // cannot_connect_now
]);

export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && DB_CONNECTION_CODES.has(code);
}

export function classifyError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : 'Internal server error';
  const status = isDbConnectionError(error) ? 503 : 500;
  return { status, message };
}

export function respondWithError(res: Response, error: unknown): void {
  const { status, message } = classifyError(error);
  res.status(status).json({ error: message });
}
