import { NextRequest, NextResponse } from 'next/server';
import { NotificationsService, EventsService } from '@/services';
import { getDbPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = getDbPool();
    const notificationsService = new NotificationsService(db);
    const eventsService = new EventsService(db);

    if (!notificationsService.vapidConfigured) {
      return NextResponse.json(
        { error: 'Push notifications not configured on this server' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { eventId, minutesBefore, subscription } = body ?? {};

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { error: 'eventId is required (UUID string)' },
        { status: 400 }
      );
    }

    const minutes = Number(minutesBefore);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      return NextResponse.json(
        { error: 'minutesBefore must be an integer between 5 and 1440' },
        { status: 400 }
      );
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'subscription with endpoint and keys (p256dh, auth) is required' },
        { status: 400 }
      );
    }

    const event = await eventsService.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (new Date(event.startsAt) < new Date()) {
      return NextResponse.json(
        { error: 'Evento ja aconteceu' },
        { status: 422 }
      );
    }

    const id = await notificationsService.subscribe({
      eventId,
      minutesBefore: minutes,
      pushEndpoint: subscription.endpoint,
      pushKeys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });

    return NextResponse.json(
      { id, message: 'Inscricao realizada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/notifications/subscribe failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
