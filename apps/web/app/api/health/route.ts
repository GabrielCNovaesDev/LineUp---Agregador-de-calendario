import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET() {
  try {
    const db = getDbPool();

    const result = await db.query('SELECT 1');
    const dbStatus = result ? 'connected' : 'error';

    return NextResponse.json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      db: dbStatus,
      version: '1.0.0',
    });
  } catch (error) {
    console.error('GET /api/health failed:', error);
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'error',
        version: '1.0.0',
      },
      { status: 503 }
    );
  }
}
