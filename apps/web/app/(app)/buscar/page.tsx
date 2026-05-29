"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  sport: { slug: string; name: string };
  status: string;
  startsAt: string;
}

const TRENDS = [
  { sport: "ten", name: "Roland Garros", context: "Quartas hoje", color: "#E0853C" },
  { sport: "fut", name: "Palmeiras x Flamengo", context: "AO VIVO", live: true, color: "#10B981" },
  { sport: "auto", name: "F1 GP Mônaco", context: "Sábado", color: "#F59E0B" },
  { sport: "ufc", name: "UFC 305", context: "Sábado", color: "#EF4444" },
  { sport: "lol", name: "LoL Worlds", context: "Quartas", color: "#3B82F6" },
  { sport: "bask", name: "NBA Playoffs", context: "Lakers x Celtics", color: "#A855F7" },
];

const SHORTCUTS = ["Brasileiros hoje", "Ao vivo agora", "Meus favoritos", "Esta semana"];
const RECENTS = ["Bia Haddad", "F1 GP Mônaco", "Brasileirão tabela", "Roland Garros", "UFC 305"];

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/events?limit=10&tz=America/Sao_Paulo`);
      if (res.ok) {
        const json = await res.json();
        const filtered = (json.data || []).filter((e: SearchResult) =>
          e.title.toLowerCase().includes(term.toLowerCase()) ||
          e.sport.name.toLowerCase().includes(term.toLowerCase())
        );
        setResults(filtered);
      }
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t); }, [query, search]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <div className="flex-1 flex items-center gap-3 bg-graphite-2 border border-graphite-3 rounded-xl px-3.5 py-3 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(16,185,129,.12)] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary flex-shrink-0"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar competição, time, atleta..." className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none" />
          {query && (
            <button onClick={() => setQuery("")} className="w-5 h-5 rounded-full bg-graphite-3 text-text-secondary inline-flex items-center justify-center flex-shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4">
        {query ? <SearchResults query={query} results={results} loading={loading} /> : <IdleState />}
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">RECENTES</span>
        <button className="text-xs text-text-secondary hover:text-text-primary transition-colors">Limpar</button>
      </div>
      <div className="flex flex-col">
        {RECENTS.map((r) => (
          <div key={r} className="flex items-center gap-3 py-2.5 px-0.5 rounded-lg cursor-pointer hover:bg-white/[.02] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-tertiary flex-shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span className="flex-1 text-sm">{r}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 mb-3"><span className="eyebrow">TENDÊNCIAS AGORA</span></div>
      <div className="grid grid-cols-2 gap-2">
        {TRENDS.map((t) => (
          <div key={t.name} className="bg-graphite-2 border border-graphite-3 rounded-xl p-3 flex gap-2.5 items-center cursor-pointer hover:border-emerald-dim hover:-translate-y-0.5 transition-all">
            <span className="w-[34px] h-[34px] rounded-lg bg-ink inline-flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">{t.name}</div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {t.live ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase bg-live-red text-white px-1.5 py-0.5 rounded">
                    <span className="w-[5px] h-[5px] rounded-full bg-white pulse-dot" />AO VIVO
                  </span>
                ) : t.context}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 mb-3"><span className="eyebrow">ATALHOS RÁPIDOS</span></div>
      <div className="flex gap-2 flex-wrap">
        {SHORTCUTS.map((s, i) => (
          <span key={s} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border cursor-pointer whitespace-nowrap transition-colors ${i === 0 ? "bg-emerald/10 border-emerald-dim text-emerald-glow" : "bg-graphite-2 border-graphite-3 text-text-primary hover:border-text-secondary"}`}>
            {i === 1 && <span className="w-[7px] h-[7px] rounded-full bg-emerald pulse-dot" />}
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function SearchResults({ query, results, loading }: { query: string; results: SearchResult[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 mt-4">
        {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-graphite border border-graphite-3 animate-pulse" />)}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-graphite-3/30 border border-graphite-3 flex items-center justify-center mb-6">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-graphite-3"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </div>
        <h3 className="display text-xl font-bold">{"Não achamos nada com '"}{query}{"'"}</h3>
        <p className="text-text-secondary text-sm mt-2 max-w-[280px]">Tente buscar por uma modalidade, time famoso, atleta ou nome de competição.</p>
        <div className="flex gap-2 flex-wrap justify-center mt-5">
          {["Brasileirão", "F1", "Roland Garros", "UFC"].map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-emerald/10 border border-emerald-dim text-emerald-glow cursor-pointer">{s}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mt-2 mb-3">
        <span className="text-[13px] text-text-secondary">
          <span className="mono text-emerald-glow font-semibold">{results.length}</span> resultados para <span className="text-emerald-glow">{query}</span>
        </span>
      </div>
      <div className="flex flex-col">
        {results.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg cursor-pointer hover:bg-white/[.03] transition-colors">
            <span className="w-[38px] h-[38px] rounded-lg bg-graphite-2 inline-flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-emerald"><circle cx="12" cy="12" r="9"/></svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight truncate">{r.title}</div>
              <div className="text-[11.5px] text-text-secondary mt-0.5">{r.sport.name}{r.subtitle ? ` · ${r.subtitle}` : ""}</div>
            </div>
            {r.status === "live" && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase bg-live-red text-white px-1.5 py-0.5 rounded flex-shrink-0">
                <span className="w-[5px] h-[5px] rounded-full bg-white pulse-dot" />AO VIVO
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
