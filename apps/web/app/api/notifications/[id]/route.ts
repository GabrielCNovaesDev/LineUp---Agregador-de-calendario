import { NextRequest, NextResponse } from 'next/server';
import { NotificationsService } from '@/services';
import { getDbPool } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const db = getDbPool();
    const notificationsService = new NotificationsService(db);
    const deleted = await notificationsService.unsubscribe(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Inscricao nao encontrada' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`DELETE /api/notifications/${id} failed:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
