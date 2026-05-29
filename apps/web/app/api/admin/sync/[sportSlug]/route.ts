import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sportSlug: string }> }
) {
  const { sportSlug } = await params;
  const authorization = request.headers.get('authorization');

  if (!isAuthorized(authorization)) {
    return NextResponse.json(
      { error: 'Nao autorizado' },
      { status: 401 }
    );
  }

  try {
    const db = getDbPool();

    // Verify sport exists
    const sportResult = await db.query(
      `SELECT slug FROM sports WHERE slug = $1 AND is_active = TRUE`,
      [sportSlug]
    );

    if (sportResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Sport nao encontrado: ${sportSlug}` },
        { status: 404 }
      );
    }

    // Create a sync_log entry to track the manual sync request
    const logResult = await db.query(
      `
        INSERT INTO sync_log (sport_slug, status, started_at)
        VALUES ($1, 'pending', NOW())
        RETURNING id
      `,
      [sportSlug]
    );

    const syncLogId = logResult.rows[0]?.id;

    return NextResponse.json(
      { message: 'Sync iniciado', syncLogId },
      { status: 202 }
    );
  } catch (error) {
    console.error(`POST /api/admin/sync/${sportSlug} failed:`, error);
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
