"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ViewSwitch } from "@/components/calendar/ViewSwitch";
import { DateNav } from "@/components/calendar/DateNav";
import { FilterChips } from "@/components/calendar/FilterChips";
import { EventCard } from "@/components/calendar/EventCard";

type View = "agenda" | "semana" | "mes";

interface EventDto {
  id: string;
  sport: { slug: string; name: string; category: string };
  title: string;
  subtitle: string | null;
  venue: string | null;
  country: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  localTime?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CalendarioPage() {
  const [view, setView] = useState<View>("agenda");
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState("Todos");
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => startOfDay(new Date()), []);
  const isToday = isSameDay(currentDate, today);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = currentDate.toISOString();
      const to = addDays(currentDate, view === "agenda" ? 1 : view === "semana" ? 7 : 31).toISOString();
      const params = new URLSearchParams({ from, to, limit: "50", tz: "America/Sao_Paulo" });
      if (filter === "Ao vivo") params.set("status", "live");
      const res = await fetch(`/api/events?${params}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data || []);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, filter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const liveCount = events.filter((e) => e.status === "live").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3">
        <div className="px-4 lg:px-7 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="display text-2xl lg:text-[26px] font-extrabold leading-none">Calendário</h1>
              <p className="text-text-secondary text-[13px] mt-1.5">Seus esportes, sua semana</p>
            </div>
            <div className="flex gap-2 items-center">
              <ViewSwitch current={view} onChange={setView} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
            <DateNav
              label={formatDate(currentDate)}
              onPrev={() => setCurrentDate((d) => addDays(d, view === "mes" ? -30 : view === "semana" ? -7 : -1))}
              onNext={() => setCurrentDate((d) => addDays(d, view === "mes" ? 30 : view === "semana" ? 7 : 1))}
              onToday={() => setCurrentDate(today)}
              isToday={isToday}
            />
            <FilterChips active={filter} onChange={setFilter} />
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {liveCount > 0 && (
        <div className="px-4 lg:px-7 py-2">
          <span className="inline-flex items-center gap-1.5 mono text-[11px] font-semibold text-emerald-glow bg-emerald/12 border border-emerald-dim px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald pulse-dot" />
            {liveCount} {liveCount === 1 ? "evento ao vivo" : "eventos ao vivo"}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-graphite border border-graphite-3 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState />
        ) : (
          <AgendaView events={events} />
        )}
      </div>
    </div>
  );
}

function AgendaView({ events }: { events: EventDto[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, EventDto[]>();
    for (const ev of events) {
      const day = new Date(ev.startsAt).toLocaleDateString("pt-BR");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(ev);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <div>
      {grouped.map(([day, dayEvents]) => (
        <div key={day}>
          <div className="flex items-center gap-2.5 py-3">
            <span className="mono text-[11px] tracking-[.16em] text-text-tertiary uppercase">
              <b className="text-text-primary font-semibold">{day}</b>
            </span>
            <span className="mono text-[11px] text-text-tertiary ml-auto">
              {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
            </span>
          </div>
          {dayEvents.map((ev) => (
            <EventCard
              key={ev.id}
              title={ev.title}
              subtitle={ev.subtitle}
              time={formatTime(ev.startsAt)}
              sport={ev.sport}
              status={ev.status}
              venue={ev.venue}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-24 h-24 rounded-full bg-graphite-3/30 border border-graphite-3 flex items-center justify-center mb-6">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-graphite-3">
          <rect x="3" y="5" width="18" height="16" rx="2"/>
          <path d="M3 10h18M8 3v4M16 3v4"/>
        </svg>
      </div>
      <h3 className="display text-xl font-bold">Dia tranquilo por aqui</h3>
      <p className="text-text-secondary text-sm mt-2 max-w-[280px]">
        Nenhum evento encontrado para este período. Tente mudar os filtros ou navegar para outra data.
      </p>
    </div>
  );
}
