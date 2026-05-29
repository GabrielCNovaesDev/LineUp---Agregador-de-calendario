"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface EventDto {
  id: string;
  sport: { slug: string; name: string; category: string };
  title: string;
  subtitle: string | null;
  venue: string | null;
  startsAt: string;
  status: string;
}

const TABS = ["Visão geral", "Competições", "Calendário"];

export default function ModalityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState("Visão geral");
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?limit=20&tz=America/Sao_Paulo`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data || []);
      }
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const liveEvents = events.filter((e) => e.status === "live");
  const upcomingEvents = events.filter((e) => e.status === "scheduled").slice(0, 8);

  return (
    <div className="flex flex-col h-full">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-graphite-2 to-graphite relative overflow-hidden border-b border-graphite-3">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-emerald/[.08] blur-2xl" />
        <div className="px-4 lg:px-7 pt-4 pb-0 relative z-10">
          <div className="flex items-center gap-2.5 mb-3">
            <Link href="/explorar" className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </Link>
            <span className="eyebrow text-text-secondary">Modalidade</span>
          </div>
          <div className="flex items-center gap-3.5 mb-3">
            <span className="w-[58px] h-[58px] rounded-[14px] bg-graphite-2 border border-graphite-3 inline-flex items-center justify-center text-emerald-glow">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
            </span>
            <h1 className="display text-3xl lg:text-[34px] font-extrabold leading-none">{displayName}</h1>
          </div>
          <p className="text-text-secondary text-[12.5px] mb-4">
            <span className="mono text-emerald-glow">18</span> competições · <span className="mono text-emerald-glow">{liveEvents.length} ao vivo</span> · <span className="mono text-emerald-glow">8 atletas BR</span>
          </p>
          {/* Tabs */}
          <div className="flex gap-5 border-b border-graphite-3 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[13.5px] font-medium whitespace-nowrap relative transition-colors ${
                  activeTab === tab ? "text-text-primary" : "text-text-secondary"
                }`}
              >
                {tab}
                {activeTab === tab && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-emerald rounded-sm" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4">
        {activeTab === "Visão geral" && (
          <OverviewTab liveEvents={liveEvents} upcomingEvents={upcomingEvents} loading={loading} />
        )}
        {activeTab === "Competições" && <CompetitionsTab />}
        {activeTab === "Calendário" && (
          <CalendarTab events={events} loading={loading} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ liveEvents, upcomingEvents, loading }: { liveEvents: EventDto[]; upcomingEvents: EventDto[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-graphite border border-graphite-3 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      {/* Live section */}
      {liveEvents.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-live-red pulse-dot" />
            <span className="mono text-[11px] tracking-[.16em] text-text-secondary uppercase">AO VIVO AGORA</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2">
            {liveEvents.map((ev) => (
              <Link key={ev.id} href={`/evento/${ev.id}`} className="flex-shrink-0 w-[248px] bg-graphite-2 border border-graphite-3 border-l-[3px] border-l-live-red rounded-[13px] p-3.5 hover:border-text-secondary transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="mono text-[10px] text-text-tertiary tracking-wide uppercase">{ev.sport.name}</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase bg-live-red text-white px-1.5 py-0.5 rounded">
                    <span className="w-[5px] h-[5px] rounded-full bg-white pulse-dot" />Live
                  </span>
                </div>
                <div className="text-[13.5px] font-semibold leading-tight">{ev.title}</div>
                {ev.subtitle && <div className="text-[11px] text-text-secondary mt-1">{ev.subtitle}</div>}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Upcoming */}
      <div className="flex items-center gap-2 mt-6 mb-3">
        <span className="mono text-[11px] tracking-[.16em] text-text-secondary uppercase">PRÓXIMOS DESTAQUES</span>
      </div>
      {upcomingEvents.length === 0 ? (
        <p className="text-text-secondary text-sm">Nenhum evento agendado no momento.</p>
      ) : (
        <div className="bg-graphite border border-graphite-3 rounded-2xl divide-y divide-graphite-3">
          {upcomingEvents.map((ev) => (
            <Link key={ev.id} href={`/evento/${ev.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.02] transition-colors">
              <span className="mono text-[11px] text-emerald-glow w-16 flex-shrink-0 leading-tight">
                {new Date(ev.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold leading-tight truncate">{ev.title}</div>
                <div className="text-[11.5px] text-text-secondary mt-0.5">{ev.subtitle || ev.sport.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitionsTab() {
  const competitions = [
    { name: "Roland Garros", category: "Grand Slam", status: "Em andamento", live: true, color: "#E0853C", initials: "RG" },
    { name: "Wimbledon", category: "Grand Slam", status: "Próxima: 24 jun", live: false, color: "#2E7D32", initials: "W" },
    { name: "US Open", category: "Grand Slam", status: "Próxima: 25 ago", live: false, color: "#1565C0", initials: "US" },
    { name: "Australian Open", category: "Grand Slam", status: "Próxima: 18 jan/27", live: false, color: "#0288D1", initials: "AO" },
    { name: "ATP Finals", category: "ATP Finals", status: "Próxima: 8 nov", live: false, color: "#37474F", initials: "AF" },
  ];

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-4">
        {["Tudo", "Grand Slam", "ATP 1000", "ATP 500", "WTA"].map((f, i) => (
          <span key={f} className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap ${
            i === 0 ? "bg-emerald border-emerald text-[#04130C]" : "bg-graphite-2 border-graphite-3 text-text-secondary"
          }`}>
            {f}
          </span>
        ))}
      </div>
      <p className="eyebrow mb-2">18 COMPETIÇÕES</p>
      <div className="bg-graphite border border-graphite-3 rounded-2xl divide-y divide-graphite-3">
        {competitions.map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-4 py-3.5">
            <span
              className="w-10 h-10 rounded-full inline-flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${c.color} 0%, rgba(0,0,0,.4) 135%)` }}
            >
              {c.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-[11.5px] text-text-secondary mt-0.5 flex items-center gap-1.5">
                <span className="mono text-[10px] text-text-tertiary">{c.category.toUpperCase()}</span>
                <span>·</span>
                <span className={c.live ? "text-emerald-glow" : ""}>{c.status}</span>
              </div>
            </div>
            <button className="w-[34px] h-[34px] rounded-[9px] border border-graphite-3 bg-transparent text-text-tertiary inline-flex items-center justify-center hover:text-emerald-glow hover:border-emerald-dim transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 17.3 6 20.3l1.4-6.3L2.6 9.4l6.4-.6z"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarTab({ events, loading }: { events: EventDto[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-graphite border border-graphite-3 animate-pulse" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-text-secondary text-sm text-center py-10">Nenhum evento encontrado.</p>;
  }

  return (
    <div className="bg-graphite border border-graphite-3 rounded-2xl divide-y divide-graphite-3">
      {events.map((ev) => (
        <Link key={ev.id} href={`/evento/${ev.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[.02] transition-colors">
          <div className="mono text-sm font-semibold w-12 flex-shrink-0 text-center">
            {new Date(ev.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight truncate">{ev.title}</div>
            <div className="text-[11.5px] text-text-secondary mt-0.5">{ev.sport.name}{ev.venue ? ` · ${ev.venue}` : ""}</div>
          </div>
          {ev.status === "live" && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase bg-live-red text-white px-1.5 py-0.5 rounded flex-shrink-0">
              <span className="w-[5px] h-[5px] rounded-full bg-white pulse-dot" />AO VIVO
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
