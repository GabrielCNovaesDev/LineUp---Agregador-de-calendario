import { NextRequest, NextResponse } from 'next/server';
import { AlertsService } from '@/services';
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
  const includeResolved = searchParams.get('includeResolved') === 'true';

  try {
    const db = getDbPool();
    const alertsService = new AlertsService(db);

    const alerts = includeResolved
      ? await alertsService.listAll()
      : await alertsService.listActive();

    return NextResponse.json({ data: alerts });
  } catch (error) {
    console.error('GET /api/admin/alerts failed:', error);
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
