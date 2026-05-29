"use client";

import { useState } from "react";

interface Favorite {
  id: string;
  name: string;
  type: "competition" | "team" | "athlete";
  sport: string;
  color: string;
  initials: string;
  isBrazilian?: boolean;
}

const MOCK_FAVORITES: Favorite[] = [
  { id: "1", name: "Palmeiras", type: "team", sport: "Futebol", color: "#0E5C3A", initials: "P", isBrazilian: true },
  { id: "2", name: "Flamengo", type: "team", sport: "Futebol", color: "#C8102E", initials: "F", isBrazilian: true },
  { id: "3", name: "Roland Garros", type: "competition", sport: "Tênis", color: "#E0853C", initials: "RG" },
  { id: "4", name: "Fórmula 1", type: "competition", sport: "Automobilismo", color: "#F59E0B", initials: "F1" },
  { id: "5", name: "João Fonseca", type: "athlete", sport: "Tênis", color: "#E0853C", initials: "JF", isBrazilian: true },
  { id: "6", name: "Gabriel Bortoleto", type: "athlete", sport: "F1", color: "#10B981", initials: "GB", isBrazilian: true },
  { id: "7", name: "Bia Haddad", type: "athlete", sport: "Tênis", color: "#10B981", initials: "BH", isBrazilian: true },
  { id: "8", name: "Real Madrid", type: "team", sport: "La Liga", color: "#6366F1", initials: "RM" },
  { id: "9", name: "Lakers", type: "team", sport: "NBA", color: "#A855F7", initials: "LA" },
  { id: "10", name: "UFC", type: "competition", sport: "MMA", color: "#EF4444", initials: "UFC" },
];

const TABS = ["Tudo", "Competições", "Times", "Atletas"];

export default function FavoritosPage() {
  const [favorites] = useState<Favorite[]>(MOCK_FAVORITES);
  const [activeTab, setActiveTab] = useState("Tudo");
  const [isEditing, setIsEditing] = useState(false);

  const filtered = activeTab === "Tudo"
    ? favorites
    : favorites.filter((f) => {
        if (activeTab === "Competições") return f.type === "competition";
        if (activeTab === "Times") return f.type === "team";
        return f.type === "athlete";
      });

  if (favorites.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="display text-2xl lg:text-[28px] font-extrabold leading-none">
              {isEditing ? "Editar" : "Favoritos"}
            </h1>
            <p className="text-text-secondary text-[13px] mt-1.5">
              {isEditing ? "Arraste para reordenar · toque para remover" : (
                <><span className="mono text-emerald-glow font-semibold">{favorites.length}</span> itens acompanhados</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <button onClick={() => setIsEditing(false)} className="bg-emerald text-[#04130C] font-semibold text-xs px-4 py-2 rounded-lg">
                Pronto
              </button>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                </button>
                <button className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
                </button>
              </>
            )}
          </div>
        </div>

        {!isEditing && (
          <>
            {/* Summary card */}
            <div className="mt-4 rounded-2xl p-4 border border-graphite-3" style={{ background: "linear-gradient(120deg, var(--graphite) 0%, var(--graphite-2) 55%, rgba(6,95,70,.20) 100%)" }}>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="mono text-[30px] font-semibold text-emerald-glow flex items-center gap-2 leading-none">
                    3<span className="w-[9px] h-[9px] rounded-full bg-emerald pulse-dot" />
                  </div>
                  <div className="text-[11px] text-text-secondary mt-1.5">ao vivo agora</div>
                </div>
                <div className="border-l border-graphite-3 pl-3.5">
                  <div className="mono text-[30px] font-semibold leading-none">5</div>
                  <div className="text-[11px] text-text-secondary mt-1.5">eventos hoje</div>
                </div>
                <div className="border-l border-graphite-3 pl-3.5">
                  <div className="mono text-[30px] font-semibold leading-none">12</div>
                  <div className="text-[11px] text-text-secondary mt-1.5">amanhã</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-5 mt-4 border-b border-graphite-3 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-[13.5px] font-medium whitespace-nowrap relative transition-colors ${
                    activeTab === tab ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {tab}
                  <span className="mono text-[11px] text-text-tertiary ml-1.5">
                    {tab === "Tudo" ? favorites.length : favorites.filter(f => {
                      if (tab === "Competições") return f.type === "competition";
                      if (tab === "Times") return f.type === "team";
                      return f.type === "athlete";
                    }).length}
                  </span>
                  {activeTab === tab && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-emerald rounded-sm" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4">
        {isEditing ? (
          <EditList favorites={filtered} />
        ) : (
          <FavoritesList favorites={filtered} />
        )}

        {/* Limit banner */}
        {!isEditing && favorites.length >= 10 && (
          <div className="mt-4 bg-warning/[.08] border border-warning/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-[#fcd9a0]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            <span>Você está usando 10 de 10 favoritos · <a className="text-warning font-semibold cursor-pointer">{"Pro tem ilimitado →"}</a></span>
          </div>
        )}
      </div>
    </div>
  );
}

function FavoritesList({ favorites }: { favorites: Favorite[] }) {
  return (
    <div className="bg-graphite border border-graphite-3 rounded-2xl divide-y divide-graphite-3">
      {favorites.map((fav) => (
        <div key={fav.id} className={`flex items-center gap-3 px-4 py-3 ${fav.isBrazilian ? "bg-gradient-to-r from-emerald/[.06] to-transparent" : ""}`}>
          <span
            className="w-[38px] h-[38px] rounded-full inline-flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${fav.color} 0%, rgba(0,0,0,.4) 135%)`, boxShadow: "0 4px 14px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.05) inset" }}
          >
            {fav.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight flex items-center gap-1.5">
              {fav.name}
              {fav.isBrazilian && <span className="text-[11px]">🇧🇷</span>}
            </div>
            <div className="text-[11.5px] text-text-secondary mt-0.5">{fav.sport}</div>
          </div>
          <button className="w-8 h-8 rounded-lg border border-graphite-3 bg-transparent text-text-tertiary inline-flex items-center justify-center hover:text-text-primary hover:border-text-secondary transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function EditList({ favorites }: { favorites: Favorite[] }) {
  return (
    <div className="flex flex-col gap-2">
      {favorites.map((fav) => (
        <div key={fav.id} className="flex items-center gap-3 bg-graphite border border-graphite-3 rounded-xl px-3 py-3">
          <span className="text-text-tertiary cursor-grab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
          </span>
          <span
            className="w-[34px] h-[34px] rounded-full inline-flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${fav.color} 0%, rgba(0,0,0,.4) 135%)` }}
          >
            {fav.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold leading-tight flex items-center gap-1.5">
              {fav.name}
              {fav.isBrazilian && <span className="text-[11px]">🇧🇷</span>}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">{fav.type === "competition" ? "Competição" : fav.type === "team" ? "Time" : "Atleta"} · {fav.sport}</div>
          </div>
          <button className="w-7 h-7 rounded-full bg-live-red/[.14] text-[#f87171] inline-flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center px-6 py-20">
      <div className="w-[104px] h-[104px] rounded-full bg-graphite-3/30 border border-graphite-3 flex items-center justify-center mb-6">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-graphite-3">
          <path d="m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 17.3 6 20.3l1.4-6.3L2.6 9.4l6.4-.6z"/>
        </svg>
      </div>
      <h2 className="display text-2xl font-extrabold">Ainda sem favoritos</h2>
      <p className="text-text-secondary text-sm leading-relaxed mt-2.5 max-w-[300px]">
        Adicione times, atletas e competições que você acompanha. A gente cuida do resto.
      </p>
      <div className="flex gap-2 flex-wrap justify-center mt-6">
        {["Explorar competições", "Buscar atleta", "Importar do calendário"].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-graphite-2 border border-graphite-3 text-text-primary cursor-pointer hover:border-text-secondary transition-colors">
            {s}
          </span>
        ))}
      </div>
      <button className="mt-6 bg-emerald text-[#04130C] font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-emerald-glow transition-all">
        Começar a explorar
      </button>
    </div>
  );
}
