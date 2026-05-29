"use client";

import { useState } from "react";
import Link from "next/link";

const MODALITIES = [
  { slug: "futebol", name: "Futebol", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7l3.2 2.4-1.2 3.8h-4L8.8 9.4z", count: 47, live: 12, hot: true },
  { slug: "automobilismo", name: "Automobilismo", icon: "M3 13h2l1.2-3.2A2 2 0 0 1 8 8.5h8a2 2 0 0 1 1.8 1.3L19 13h2v3.5h-2a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H3z", count: 28, live: 2 },
  { slug: "mma", name: "MMA", icon: "M7 8a4 4 0 0 1 8 0v3M7 11h11v3a4 4 0 0 1-4 4H10a3 3 0 0 1-3-3z", count: 12, br: true, hot: true },
  { slug: "boxe", name: "Boxe", icon: "M9 7a4 4 0 0 1 8 0v4M9 11h9v3a4 4 0 0 1-4 4H11a3 3 0 0 1-3-3z", count: 14 },
  { slug: "basquete", name: "Basquete", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3.2 12h17.6M12 3a11 11 0 0 0 0 18M12 3a11 11 0 0 1 0 18", count: 24, live: 5 },
  { slug: "tenis", name: "Tênis", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M5 6a13 13 0 0 1 14 12M5 18A13 13 0 0 1 19 6", count: 18, live: 3, br: true },
  { slug: "volei", name: "Vôlei", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 3a14 14 0 0 0-6.5 16.5M21 9.5a14 14 0 0 0-15.5 3", count: 16, br: true },
  { slug: "futebol-americano", name: "Futebol Americano", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M9.5 12h5M11 10.2v3.6M13 10.2v3.6", count: 13 },
  { slug: "criquete", name: "Críquete", icon: "M6.5 17.5l9-9M13.5 6l4.5 4.5-2 2-4.5-4.5zM7 17m-2.2 0a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0", count: 11 },
  { slug: "ciclismo", name: "Ciclismo", icon: "M6 16m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M18 16m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M6 16l4-7h5l3 7", count: 19 },
  { slug: "rugby", name: "Rugby", icon: "M12 12m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M9.5 12h5M12 9.5v5", count: 15 },
  { slug: "atletismo", name: "Atletismo", icon: "M14.5 5m-1.7 0a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0M13 8.5l-3.5 3 2.5 2-1 4.5M11.5 11.5l4 1.2", count: 17 },
  { slug: "esportes-aquaticos", name: "Esp. Aquáticos", icon: "M3 8c2 0 2 1.4 4 1.4S9 8 11 8s2 1.4 4 1.4S17 8 21 8M3 12.5c2 0 2 1.4 4 1.4s2-1.4 4-1.4 2 1.4 4 1.4 2-1.4 4-1.4M3 17c2 0 2 1.4 4 1.4S9 17 11 17s2 1.4 4 1.4 2-1.4 4-1.4", count: 13 },
  { slug: "golfe", name: "Golfe", icon: "M10 19V4l7 2.6L10 9.2M10 19.5m-6 0a6 6 0 0 0 12 0", count: 18 },
  { slug: "esports", name: "E-sports", icon: "M2.5 8h19v9a4.5 4.5 0 0 1-4.5 4.5h-10A4.5 4.5 0 0 1 2.5 17V8zM7 11.2v2.6M5.7 12.5h2.6", count: 28, live: 4, br: true, hot: true },
  { slug: "olimpicos", name: "Olímpicos", icon: "M12 14.5m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M9.3 10l-2.8-6M14.7 10l2.8-6", count: 14 },
  { slug: "beisebol", name: "Beisebol", icon: "M9 9m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M13 13l5.5 5.5", count: 14 },
  { slug: "handebol", name: "Handebol", icon: "M15.5 7.5m-2.8 0a2.8 2.8 0 1 0 5.6 0 2.8 2.8 0 1 0-5.6 0M3 14l4-2 3 1.8 2.4-1.2", count: 12 },
  { slug: "surfe-skate", name: "Surfe/Skate", icon: "M4.5 18.5c4 1.2 8.5-2 12.5-8.5 1.4-2.3 2.6-4.4 3-5-3.4.6-7.6 3-11 7.5-2 2.6-3.4 5.2-4.5 6z", count: 10, br: true },
  { slug: "esportes-inverno", name: "Esp. de Inverno", icon: "M3 19.5h18L13.5 5 9.5 12.5 7.5 10z", count: 11 },
  { slug: "hipismo", name: "Hipismo", icon: "M7.5 4a6.5 7 0 0 0-.5 13M16.5 4a6.5 7 0 0 1 .5 13M6.5 17.5h2.5M15 17.5h2.5", count: 6 },
  { slug: "dardos-sinuca", name: "Dardos/Sinuca", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 12m-1.4 0a1.4 1.4 0 1 0 2.8 0 1.4 1.4 0 1 0-2.8 0", count: 9 },
  { slug: "esportes-forca", name: "Esp. de Força", icon: "M6 9v6M3.5 10.5v3M18 9v6M20.5 10.5v3M6 12h12", count: 11 },
];

const FILTERS = ["Tudo", "Com eventos hoje", "Brasileiros em destaque", "Em alta"];

export default function ExplorarPage() {
  const [filter, setFilter] = useState("Tudo");

  const filtered = filter === "Tudo"
    ? MODALITIES
    : filter === "Com eventos hoje"
    ? MODALITIES.filter((m) => m.live && m.live > 0)
    : filter === "Brasileiros em destaque"
    ? MODALITIES.filter((m) => m.br)
    : MODALITIES.filter((m) => m.hot);

  const totalLive = MODALITIES.reduce((acc, m) => acc + (m.live || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="display text-2xl lg:text-[28px] font-extrabold leading-none">Explorar</h1>
            <p className="text-text-secondary text-[13px] mt-1.5">
              <span className="mono text-emerald-glow font-semibold">23</span> modalidades · <span className="mono text-emerald-glow font-semibold">390</span> competições
            </p>
          </div>
          <Link href="/buscar" className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4">
        {/* Live banner */}
        {totalLive > 0 && (
          <div className="rounded-2xl p-4 flex items-center gap-3.5 border border-graphite-3" style={{ background: "linear-gradient(110deg, var(--graphite) 0%, var(--graphite-2) 55%, rgba(6,95,70,.22) 100%)" }}>
            <span className="w-[46px] h-[46px] rounded-[13px] bg-live-red/[.14] flex items-center justify-center flex-shrink-0">
              <span className="w-3 h-3 rounded-full bg-live-red pulse-dot" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="display font-bold text-[15px] leading-tight">
                <span className="mono text-emerald-glow">7 competições</span> com eventos ao vivo
              </div>
            </div>
            <Link href="/calendario" className="bg-emerald text-[#04130C] font-semibold text-xs px-3 py-2 rounded-lg whitespace-nowrap hover:bg-emerald-glow transition-colors">
              Ver tudo
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none mt-4 pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-emerald border-emerald text-[#04130C]"
                  : "bg-graphite-2 border-graphite-3 text-text-secondary hover:border-text-secondary hover:text-text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 mt-5">
          {filtered.map((mod) => (
            <Link
              key={mod.slug}
              href={`/explorar/${mod.slug}`}
              className="relative bg-graphite border border-graphite-3 rounded-[14px] p-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:scale-[1.02] hover:border-emerald hover:bg-graphite-2 transition-all aspect-[1/1.18] justify-center"
            >
              {mod.live && mod.live > 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="w-[7px] h-[7px] rounded-full bg-emerald pulse-dot" />
                  <span className="text-[8px] font-bold text-emerald-glow uppercase tracking-wide">Ao vivo</span>
                </div>
              )}
              {mod.br && <span className="absolute top-2 left-2 text-[11px]">🇧🇷</span>}
              {mod.hot && <span className="absolute bottom-2 right-2 text-[11px]">🔥</span>}
              <span className="text-text-secondary">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={mod.icon}/></svg>
              </span>
              <div className="display font-bold text-sm leading-tight">{mod.name}</div>
              <div className="mono text-[10.5px] text-text-tertiary">
                {mod.count} comp.{mod.live ? <span className="text-emerald-glow">{` · ${mod.live} ao vivo`}</span> : ""}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
