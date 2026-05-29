import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET() {
  try {
    const db = getDbPool();
    const result = await db.query<{ slug: string; name: string; category: string }>(
      `
        SELECT slug, name, category
        FROM sports
        WHERE is_active = TRUE
        ORDER BY category, name
      `
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('GET /api/sports failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
