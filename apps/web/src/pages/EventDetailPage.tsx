import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Event, EventStatus, SportCategory } from '../lib/types';
import { dayjs, formatEventTime } from '../lib/timezone';
import { useTimezone } from '../app/TimezoneContext';

const CATEGORY_META: Record<SportCategory, { emoji: string; label: string }> = {
  motorsport: { emoji: '🏎️', label: 'Motorsport' },
  mma: { emoji: '🥊', label: 'MMA' },
  tennis: { emoji: '🎾', label: 'Tenis' }
};

const NOTIFICATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1h', value: 60 },
  { label: '1 dia', value: 1440 }
];

const STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: 'Confirmado',
  live: 'Ao vivo',
  completed: 'Concluido',
  cancelled: 'Cancelado',
  postponed: 'Adiado'
};

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { timezone } = useTimezone();
  const [showNotifyOptions, setShowNotifyOptions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['event', id, timezone],
    queryFn: () => api.getEvent(id!, timezone),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000
  });

  const event = eventQuery.data;
  const googleCalendarUrl = useMemo(
    () => (event ? getGoogleCalendarUrl(event) : '#'),
    [event]
  );

  async function handleCopyEventTime() {
    if (!event) return;
    const text = formatEventForShare(event, timezone);
    await navigator.clipboard.writeText(text);
    showToast('Copiado!');
  }

  async function handleNotifyClick() {
    if (!event) return;

    if (!('Notification' in window)) {
      showToast('Este navegador nao suporta notificacoes.');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Permissao de notificacao nao concedida.');
        return;
      }
    }

    if (Notification.permission === 'denied') {
      showToast('Notificacoes bloqueadas no navegador.');
      return;
    }

    setShowNotifyOptions((current) => !current);
  }

  async function subscribe(minutesBefore: number) {
    if (!event) return;
    setIsSubscribing(true);
    try {
      await api.subscribeToNotification({
        eventId: event.id,
        minutesBefore,
        timezone
      });
      showToast(`Voce sera notificado ${formatLeadTime(minutesBefore)} antes do evento.`);
      setShowNotifyOptions(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        showToast('Notificacoes entram na proxima etapa da API.');
      } else {
        showToast(error instanceof Error ? error.message : 'Nao foi possivel criar a notificacao.');
      }
    } finally {
      setIsSubscribing(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  if (eventQuery.isLoading) return <LoadingDetail />;

  if (eventQuery.error instanceof Error) {
    return (
      <section className="space-y-4">
        <BackButton onClick={() => navigate(-1)} />
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {eventQuery.error.message}
        </div>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="space-y-4">
        <BackButton onClick={() => navigate(-1)} />
        <p className="text-sm text-[var(--color-fg-muted)]">Evento nao encontrado.</p>
      </section>
    );
  }

  const category = CATEGORY_META[event.sport.category] ?? CATEGORY_META.motorsport;
  const endsAt = event.endsAt ?? dayjs(event.startsAt).add(event.durationMinutes ?? 120, 'minute').toISOString();

  return (
    <section className="space-y-5 pb-4">
      <BackButton onClick={() => navigate(-1)} />

      <article className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--color-fg-muted)]">
            <span aria-hidden="true">{category.emoji}</span> {event.sport.name}
          </p>
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight">{event.title}</h1>
            {event.subtitle && (
              <p className="mt-1 text-base text-[var(--color-fg-muted)]">{event.subtitle}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <DetailRow icon="📍" label="Local">
            <p>{event.venue ?? 'Local a confirmar'}</p>
            {event.country && <p className="text-[var(--color-fg-muted)]">{event.country}</p>}
          </DetailRow>

          <DetailRow icon="🕐" label="Horario">
            <p>{formatEventTime(event.startsAt, timezone)}</p>
            <p className="text-[var(--color-fg-muted)]">
              {dayjs(event.startsAt).utc().format('HH[h]mm [UTC]')}
              {event.roundNumber ? ` · Round ${event.roundNumber}` : ''}
            </p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              Exibido no seu fuso: {formatTimezoneLabel(timezone)}
            </p>
          </DetailRow>

          <DetailRow icon="⏱" label="Duracao">
            <p>{formatDuration(event, endsAt)}</p>
          </DetailRow>

          <DetailRow icon="●" label="Status">
            <StatusPill status={event.status} />
          </DetailRow>
        </div>
      </article>

      <div className="space-y-3 border-t border-[var(--color-border)] pt-5">
        <button
          type="button"
          onClick={() => void handleNotifyClick()}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm font-semibold"
        >
          🔔 Notificar antes
        </button>

        {showNotifyOptions && (
          <div className="grid grid-cols-4 gap-2">
            {NOTIFICATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={isSubscribing}
                onClick={() => void subscribe(option.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <a
          href={googleCalendarUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-semibold text-white"
        >
          📅 Adicionar ao Google Calendar
        </a>

        <button
          type="button"
          onClick={() => void handleCopyEventTime()}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-3 text-left text-sm font-semibold"
        >
          📋 Copiar horario
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
    >
      ← Voltar
    </button>
  );
}

function DetailRow({
  icon,
  label,
  children
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3 text-sm">
      <span className="pt-0.5 text-lg leading-none" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-fg-muted)]">
          {label}
        </p>
        <div className="space-y-1 text-[var(--color-fg)]">{children}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: EventStatus }) {
  const className =
    status === 'live'
      ? 'bg-red-500 text-white animate-pulse'
      : status === 'scheduled'
        ? 'bg-emerald-400/20 text-emerald-100'
        : status === 'completed'
          ? 'bg-slate-500/25 text-slate-200'
          : status === 'cancelled'
            ? 'bg-slate-500/25 text-slate-300'
            : 'bg-amber-400/20 text-amber-100';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function LoadingDetail() {
  return (
    <section className="space-y-5">
      <div className="h-5 w-20 animate-pulse rounded bg-[var(--color-surface-2)]" />
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-surface-2)]" />
        <div className="h-8 w-4/5 animate-pulse rounded bg-[var(--color-surface-2)]" />
        <div className="h-5 w-36 animate-pulse rounded bg-[var(--color-surface-2)]" />
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
    </section>
  );
}

function getGoogleCalendarUrl(event: Event): string {
  const end = event.endsAt ?? dayjs(event.startsAt).add(event.durationMinutes ?? 120, 'minute').toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${CATEGORY_META[event.sport.category]?.emoji ?? ''} ${event.title}${event.subtitle ? ` - ${event.subtitle}` : ''}`,
    dates: `${formatGCalDate(event.startsAt)}/${formatGCalDate(end)}`,
    details: [event.sport.name, event.roundNumber ? `Round ${event.roundNumber}` : null]
      .filter(Boolean)
      .join(' · '),
    location: [event.venue, event.country].filter(Boolean).join(', ')
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatGCalDate(date: string): string {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace('.000', '');
}

function formatEventForShare(event: Event, timezone: string): string {
  const title = `${CATEGORY_META[event.sport.category]?.emoji ?? ''} ${event.title}${event.subtitle ? ` - ${event.subtitle}` : ''}`;
  return `${title} (${event.sport.name})\n${formatEventTime(event.startsAt, timezone)} (${formatTimezoneLabel(timezone)})`;
}

function formatDuration(event: Event, endsAt: string): string {
  const minutes = event.durationMinutes ?? dayjs(endsAt).diff(dayjs(event.startsAt), 'minute');
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}min` : `${hours}h`;
}

function formatLeadTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  if (minutes === 1440) return '1 dia';
  return `${minutes / 60}h`;
}

function formatTimezoneLabel(timezone: string): string {
  return timezone.replace(/^America\//, '').replace(/_/g, ' ');
}
