import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Event, EventStatus, Sport, SportCategory } from '../lib/types';
import { dayjs, formatEventTime, formatTimezoneName, getTimeUntilEvent } from '../lib/timezone';
import { useTimezone } from '../app/TimezoneContext';

const PAGE_SIZE = 30;

const CATEGORY_STYLES: Record<SportCategory, { active: string; emoji: string }> = {
  motorsport: { active: 'border-red-400 bg-red-500/20 text-red-100', emoji: '🏎️' },
  mma: { active: 'border-orange-300 bg-orange-400/20 text-orange-100', emoji: '🥊' },
  tennis: { active: 'border-emerald-300 bg-emerald-400/20 text-emerald-100', emoji: '🎾' }
};

const STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: '',
  live: 'AO VIVO',
  completed: 'CONCLUIDO',
  cancelled: 'CANCELADO',
  postponed: 'ADIADO'
};

interface SportFilterChipProps {
  sport: Sport;
  isActive: boolean;
  onToggle: (slug: string) => void;
}

interface EventCardProps {
  event: Event;
  userTimezone: string;
  onClick: (id: string) => void;
}

export function CalendarPage() {
  const { timezone } = useTimezone();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSports = parseSportsParam(searchParams.get('sports'));
  const month = normalizeMonth(searchParams.get('month'));

  const sportsQuery = useQuery({
    queryKey: ['sports'],
    queryFn: () => api.getSports(),
    staleTime: 30 * 60 * 1000
  });

  const eventsQuery = useInfiniteQuery({
    queryKey: ['events', activeSports.join(','), month, timezone],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.getEvents({
        sports: activeSports,
        from: dayjs(month).startOf('month').toISOString(),
        to: dayjs(month).endOf('month').toISOString(),
        tz: timezone,
        page: pageParam,
        limit: PAGE_SIZE
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    staleTime: 5 * 60 * 1000
  });

  const events = eventsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const groupedEvents = groupEventsByDate(events, timezone);
  const isFirstLoad = eventsQuery.isLoading && events.length === 0;
  const monthLabel = dayjs(month).format('MMMM YYYY');

  function updateParams(next: { sports?: string[]; month?: string }) {
    const params = new URLSearchParams(searchParams);
    const nextSports = next.sports ?? activeSports;
    const nextMonth = next.month ?? month;

    if (nextSports.length > 0) params.set('sports', nextSports.join(','));
    else params.delete('sports');

    params.set('month', nextMonth);
    setSearchParams(params, { replace: false });
  }

  function toggleSport(slug: string) {
    const nextSports = activeSports.includes(slug)
      ? activeSports.filter((item) => item !== slug)
      : [...activeSports, slug];

    updateParams({ sports: nextSports });
  }

  function changeMonth(amount: number) {
    updateParams({ month: dayjs(month).add(amount, 'month').format('YYYY-MM') });
  }

  return (
    <section className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Sports Calendar</h1>
            <p className="text-xs text-[var(--color-fg-muted)]">
              Horarios em {formatTimezoneName(timezone)}
            </p>
          </div>
          <Link
            to="/settings"
            aria-label="Abrir ajustes"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-lg"
          >
            ⚙
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {sportsQuery.isLoading && <FilterSkeleton />}
            {sportsQuery.data?.data.map((sport) => (
              <SportFilterChip
                key={sport.slug}
                sport={sport}
                isActive={activeSports.includes(sport.slug)}
                onToggle={toggleSport}
              />
            ))}
          </div>
          {activeSports.length > 0 && (
            <button
              type="button"
              onClick={() => updateParams({ sports: [] })}
              className="shrink-0 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-fg-muted)]"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Mes anterior"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xl"
        >
          ‹
        </button>
        <h2 className="text-sm font-semibold capitalize text-[var(--color-fg)]">{monthLabel}</h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Proximo mes"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xl"
        >
          ›
        </button>
      </div>

      {sportsQuery.error instanceof Error && (
        <ErrorMessage message={`Nao foi possivel carregar os esportes: ${sportsQuery.error.message}`} />
      )}

      {eventsQuery.error instanceof Error && (
        <ErrorMessage message={`Nao foi possivel carregar os eventos: ${eventsQuery.error.message}`} />
      )}

      {isFirstLoad && <LoadingList />}

      {!isFirstLoad && events.length === 0 && !eventsQuery.error && (
        <EmptyState />
      )}

      {groupedEvents.size > 0 && (
        <div className="space-y-6">
          {[...groupedEvents.entries()].map(([dateKey, dateEvents]) => (
            <section key={dateKey} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-fg-muted)]">
                {formatDateLabel(dateKey, timezone)}
              </h3>
              <div className="space-y-3">
                {dateEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userTimezone={timezone}
                    onClick={(id) => navigate(`/events/${id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {eventsQuery.hasNextPage && (
        <button
          type="button"
          onClick={() => void eventsQuery.fetchNextPage()}
          disabled={eventsQuery.isFetchingNextPage}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {eventsQuery.isFetchingNextPage ? 'Carregando...' : 'Carregar mais eventos'}
        </button>
      )}
    </section>
  );
}

function SportFilterChip({ sport, isActive, onToggle }: SportFilterChipProps) {
  const category = CATEGORY_STYLES[sport.category] ?? CATEGORY_STYLES.motorsport;

  return (
    <button
      type="button"
      onClick={() => onToggle(sport.slug)}
      aria-pressed={isActive}
      className={[
        'shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition',
        isActive
          ? category.active
          : 'border-[var(--color-border)] bg-transparent text-[var(--color-fg-muted)]'
      ].join(' ')}
    >
      {sport.name}
    </button>
  );
}

function EventCard({ event, userTimezone, onClick }: EventCardProps) {
  const category = CATEGORY_STYLES[event.sport.category] ?? CATEGORY_STYLES.motorsport;
  const isCancelled = event.status === 'cancelled';
  const relative = getRelativeStatus(event);
  const badge = STATUS_LABELS[event.status] || relative;

  return (
    <button
      type="button"
      onClick={() => onClick(event.id)}
      className={[
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-sm transition active:scale-[0.99]',
        isCancelled ? 'opacity-55' : 'hover:border-slate-400'
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold leading-snug text-[var(--color-fg)]">
            <span aria-hidden="true">{category.emoji}</span>
            <span className="truncate">{event.title}</span>
          </p>
          {event.subtitle && (
            <p className="mt-0.5 text-sm text-[var(--color-fg-muted)]">{event.subtitle}</p>
          )}
        </div>
        {badge && <StatusBadge status={event.status} label={badge} />}
      </div>

      <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
        {event.sport.name}
        {event.venue ? ` · ${event.venue}` : ''}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--color-fg)]">
        {formatEventTime(event.startsAt, userTimezone)}
      </p>
      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
        horario local: {formatTimezoneName(userTimezone)}
      </p>
    </button>
  );
}

function StatusBadge({ status, label }: { status: EventStatus; label: string }) {
  const className =
    status === 'live'
      ? 'bg-red-500 text-white animate-pulse'
      : status === 'scheduled'
        ? 'bg-amber-400/20 text-amber-100'
        : status === 'completed'
          ? 'bg-slate-500/25 text-slate-200'
          : status === 'cancelled'
            ? 'bg-slate-500/25 text-slate-300'
            : 'bg-indigo-400/20 text-indigo-100';

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function FilterSkeleton() {
  return (
    <>
      <span className="h-9 w-16 shrink-0 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
      <span className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
      <span className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
    </>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
      <p className="text-sm text-[var(--color-fg-muted)]">
        Nenhum evento encontrado para os filtros selecionados.
      </p>
      <Link
        to="/settings"
        className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
      >
        Selecionar outros esportes
      </Link>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
      {message}
    </div>
  );
}

function parseSportsParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((sport) => sport.trim())
    .filter(Boolean);
}

function normalizeMonth(value: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value) && dayjs(value).isValid()) return value;
  return dayjs().format('YYYY-MM');
}

function groupEventsByDate(events: Event[], timezone: string): Map<string, Event[]> {
  const groups = new Map<string, Event[]>();

  for (const event of events) {
    const dateKey = dayjs(event.localTime ?? event.startsAt).tz(timezone).format('YYYY-MM-DD');
    const current = groups.get(dateKey) ?? [];
    current.push(event);
    groups.set(dateKey, current);
  }

  return new Map(
    [...groups.entries()]
      .map(([dateKey, dateEvents]) => [
        dateKey,
        dateEvents.sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf())
      ] as const)
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function formatDateLabel(dateKey: string, userTimezone: string): string {
  const today = dayjs().tz(userTimezone).format('YYYY-MM-DD');
  const tomorrow = dayjs().tz(userTimezone).add(1, 'day').format('YYYY-MM-DD');

  if (dateKey === today) return 'Hoje';
  if (dateKey === tomorrow) return 'Amanha';
  return dayjs(dateKey).format('ddd, DD MMM').toUpperCase();
}

function getRelativeStatus(event: Event): string {
  if (event.status !== 'scheduled') return STATUS_LABELS[event.status];
  const relative = getTimeUntilEvent(event.startsAt);
  return relative === 'Encerrado' || relative.includes('dias') ? '' : relative.toUpperCase();
}
