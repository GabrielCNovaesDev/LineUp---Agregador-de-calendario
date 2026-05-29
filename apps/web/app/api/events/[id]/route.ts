import { NextRequest, NextResponse } from 'next/server';
import { EventsService, EventDto } from '@/services';
import { getDbPool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const timezone = searchParams.get('tz')?.trim() || searchParams.get('timezone')?.trim();

  if (timezone && !isValidTimezone(timezone)) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: [`timezone "${timezone}" is not a valid IANA timezone`] },
      { status: 400 }
    );
  }

  try {
    const db = getDbPool();
    const eventsService = new EventsService(db);
    const event = await eventsService.findById(id);

    if (!event) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    const responseEvent = timezone ? addLocalTime(event, timezone) : event;
    return NextResponse.json(responseEvent);
  } catch (error) {
    console.error(`GET /api/events/${id} failed:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function addLocalTime(event: EventDto, timezone: string): EventDto {
  const localTime = formatInTimezone(new Date(event.startsAt), timezone);
  if (!localTime) return event;
  return { ...event, localTime };
}

function formatInTimezone(date: Date, timezone: string): string | undefined {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'shortOffset',
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value])
    );

    if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute || !parts.second) {
      return undefined;
    }

    const stripped = parts.timeZoneName?.replace(/^GMT/, '') ?? '';
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${normalizeOffset(stripped)}`;
  } catch {
    return undefined;
  }
}

function normalizeOffset(stripped: string): string {
  if (stripped === '') return 'Z';
  const match = stripped.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return stripped;
  const sign = match[1] ?? '+';
  const hours = (match[2] ?? '0').padStart(2, '0');
  const minutes = (match[3] ?? '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
