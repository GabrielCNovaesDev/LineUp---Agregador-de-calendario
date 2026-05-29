"use client";

import { useState } from "react";
import Link from "next/link";

export default function PerfilPage() {
  const [notifResults, setNotifResults] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifLive, setNotifLive] = useState(false);
  const [language, setLanguage] = useState("pt-BR");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <h1 className="display text-2xl lg:text-[28px] font-extrabold leading-none">Perfil</h1>
        <p className="text-text-secondary text-[13px] mt-1.5">Conta e preferencias</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-5">
        {/* Avatar card */}
        <div className="flex items-center gap-4 bg-graphite border border-graphite-3 rounded-2xl p-4">
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-dim to-ink border border-graphite-3 flex items-center justify-center text-lg font-bold">
            V
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold">Visitante</div>
            <div className="text-[12px] text-text-tertiary mt-0.5">visitante@lineup.app</div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald/[.10] text-emerald border border-emerald-dim">
            Free
          </span>
        </div>

        {/* Preferencias */}
        <Section title="Preferencias">
          <Row label="Fuso horario" value={timezone === "America/Sao_Paulo" ? "Brasilia (GMT-3)" : timezone}>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="bg-transparent text-text-secondary text-xs text-right outline-none cursor-pointer">
              <option value="America/Sao_Paulo">Brasilia (GMT-3)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="Europe/London">London (GMT+0)</option>
            </select>
          </Row>
          <Row label="Idioma" value={language === "pt-BR" ? "Portugues (BR)" : "English"}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent text-text-secondary text-xs text-right outline-none cursor-pointer">
              <option value="pt-BR">Portugues (BR)</option>
              <option value="en">English</option>
            </select>
          </Row>
        </Section>

        {/* Notificacoes */}
        <Section title="Notificacoes">
          <ToggleRow label="Resultados finais" description="Quando um jogo termina" checked={notifResults} onChange={setNotifResults} />
          <ToggleRow label="Lembretes pre-jogo" description="30 min antes do inicio" checked={notifReminders} onChange={setNotifReminders} />
          <ToggleRow label="Ao vivo" description="Quando um evento comeca" checked={notifLive} onChange={setNotifLive} />
        </Section>

        {/* Plano */}
        <Section title="Plano">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Free</div>
                <div className="text-[11.5px] text-text-tertiary mt-0.5">10 favoritos - 3 modalidades</div>
              </div>
              <Link href="/upgrade" className="bg-emerald text-[#04130C] font-semibold text-xs px-4 py-2 rounded-lg hover:bg-emerald-glow transition-colors">
                Upgrade
              </Link>
            </div>
          </div>
        </Section>

        {/* Sobre */}
        <Section title="Sobre">
          <Row label="Versao" value="1.0.0" />
          <Row label="Termos de uso" chevron />
          <Row label="Politica de privacidade" chevron />
        </Section>

        <button className="w-full mt-6 py-3 text-sm font-medium text-live-red border border-live-red/30 rounded-xl hover:bg-live-red/[.08] transition-colors">
          Sair da conta
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mono text-[11px] tracking-[.16em] text-text-tertiary uppercase mb-2">{title}</div>
      <div className="bg-graphite border border-graphite-3 rounded-2xl divide-y divide-graphite-3">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, chevron, children }: { label: string; value?: string; chevron?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-text-primary">{label}</span>
      {children ? children : (
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          {value}
          {chevron && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          )}
        </span>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <div className="text-sm text-text-primary">{label}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-[22px] rounded-full relative transition-colors ${checked ? "bg-emerald" : "bg-graphite-3"}`}
      >
        <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-[22px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
}
