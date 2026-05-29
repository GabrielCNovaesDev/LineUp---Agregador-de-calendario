import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!isAuthorized(authorization)) {
    return NextResponse.json(
      { error: 'Nao autorizado' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseLimit(searchParams.get('limit'));

  if (limit === null) {
    return NextResponse.json(
      { error: 'limit must be a positive integer between 1 and 100' },
      { status: 400 }
    );
  }

  try {
    const db = getDbPool();
    const logs = await db.query(
      `
        SELECT *
        FROM sync_log
        ORDER BY started_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return NextResponse.json({ data: logs.rows });
  } catch (error) {
    console.error('GET /api/admin/sync-log failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isAuthorized(authorization: string | null): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  return authorization === `Bearer ${adminSecret}`;
}

function parseLimit(value: string | null): number | null {
  if (value === null) return 50;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return null;
  return parsed;
}
