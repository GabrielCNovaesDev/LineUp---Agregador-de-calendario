"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface EventDetail {
  id: string;
  sport: { slug: string; name: string; category: string };
  title: string;
  subtitle: string | null;
  venue: string | null;
  country: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  broadcastChannels: string[];
  metadata: Record<string, unknown> | null;
}

export default function EventoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${id}`);
      if (res.ok) {
        const json = await res.json();
        setEvent(json);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  if (loading) {
    return (
      <div className="flex flex-col h-full px-4 lg:px-7 py-6">
        <div className="h-8 w-48 rounded-lg bg-graphite border border-graphite-3 animate-pulse mb-4" />
        <div className="h-40 rounded-2xl bg-graphite border border-graphite-3 animate-pulse mb-4" />
        <div className="h-24 rounded-2xl bg-graphite border border-graphite-3 animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center px-6 py-20">
        <div className="w-20 h-20 rounded-full bg-graphite-3/30 border border-graphite-3 flex items-center justify-center mb-5">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-graphite-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <h3 className="display text-xl font-bold">Evento não encontrado</h3>
        <p className="text-text-secondary text-sm mt-2">O evento pode ter sido removido ou o link está incorreto.</p>
        <button onClick={() => router.push("/calendario")} className="mt-5 bg-emerald text-[#04130C] font-semibold text-sm px-5 py-3 rounded-xl hover:bg-emerald-glow transition-all">
          Voltar ao calendário
        </button>
      </div>
    );
  }

  const isLive = event.status === "live";
  const startDate = new Date(event.startsAt);
  const formattedDate = startDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formattedTime = startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="eyebrow text-text-secondary">Detalhes do evento</span>
          {isLive && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wide uppercase bg-live-red text-white px-2 py-1 rounded">
              <span className="w-[5px] h-[5px] rounded-full bg-white pulse-dot" />AO VIVO
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-5">
        {/* Main card */}
        <div className={`rounded-2xl p-5 border ${isLive ? "border-emerald bg-gradient-to-br from-emerald/[.06] to-graphite" : "border-graphite-3 bg-graphite"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[38px] h-[38px] rounded-[10px] bg-graphite-2 border border-graphite-3 inline-flex items-center justify-center text-emerald flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
            </span>
            <div>
              <span className="mono text-[10px] tracking-[.14em] text-text-tertiary uppercase">{event.sport.name}</span>
              {event.sport.category && <span className="mono text-[10px] text-text-tertiary"> · {event.sport.category}</span>}
            </div>
          </div>
          <h1 className="display text-2xl lg:text-3xl font-extrabold leading-tight">{event.title}</h1>
          {event.subtitle && <p className="text-text-secondary text-base mt-2">{event.subtitle}</p>}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <InfoCard label="DATA" value={formattedDate} />
          <InfoCard label="HORÁRIO" value={`${formattedTime} BRT`} />
          {event.venue && <InfoCard label="LOCAL" value={event.venue} />}
          {event.country && <InfoCard label="PAÍS" value={event.country} />}
        </div>

        {/* Broadcast */}
        {event.broadcastChannels && event.broadcastChannels.length > 0 && (
          <div className="mt-4">
            <div className="mono text-[11px] tracking-[.16em] text-text-tertiary uppercase mb-2.5">ONDE ASSISTIR</div>
            <div className="bg-graphite border border-graphite-3 rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                {event.broadcastChannels.map((ch) => (
                  <span key={ch} className="mono text-[11px] font-semibold tracking-[.12em] px-3 py-2 bg-graphite-2 border border-graphite-3 rounded-lg text-text-primary">
                    {ch.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setNotifyEnabled(!notifyEnabled)}
            className={`flex-1 inline-flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded-xl transition-all ${
              notifyEnabled
                ? "bg-emerald/12 border border-emerald text-emerald-glow"
                : "bg-graphite border border-graphite-3 text-text-primary hover:border-text-secondary"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={notifyEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9"/><path d="M10 21a2 2 0 0 0 4 0"/>
            </svg>
            {notifyEnabled ? "Lembrete ativado" : "Ativar lembrete"}
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald text-[#04130C] font-semibold text-sm py-3.5 rounded-xl hover:bg-emerald-glow transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>
            </svg>
            Adicionar ao calendário
          </button>
        </div>

        {/* Status info */}
        {isLive && (
          <div className="mt-5 bg-emerald/[.08] border border-emerald-dim rounded-2xl p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-emerald/20 flex items-center justify-center flex-shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald pulse-dot" />
            </span>
            <div>
              <div className="text-sm font-semibold text-emerald-glow">Este evento está acontecendo agora</div>
              <div className="text-[12px] text-text-secondary mt-0.5">Acompanhe em tempo real pelo canal de transmissão.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-graphite border border-graphite-3 rounded-xl p-3.5">
      <div className="mono text-[10px] tracking-[.14em] text-text-tertiary uppercase">{label}</div>
      <div className="text-sm font-semibold mt-1.5 leading-tight">{value}</div>
    </div>
  );
}
