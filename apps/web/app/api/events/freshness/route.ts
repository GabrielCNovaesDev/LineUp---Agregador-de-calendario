import { NextResponse } from 'next/server';
import { FreshnessService } from '@/services';
import { getDbPool } from '@/lib/db';

export async function GET() {
  try {
    const db = getDbPool();
    const freshnessService = new FreshnessService(db);

    // Without the scheduler jobs context, we query freshness with empty inputs
    // and let the service determine staleness from DB timestamps
    const result = await freshnessService.getFreshness([]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/events/freshness failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
