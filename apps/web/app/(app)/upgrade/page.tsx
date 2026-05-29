"use client";

import Link from "next/link";

const FREE_FEATURES = [
  { label: "Ate 3 modalidades", included: true },
  { label: "10 favoritos", included: true },
  { label: "Calendario basico", included: true },
  { label: "Alertas limitados", included: true },
  { label: "Modalidades ilimitadas", included: false },
  { label: "Favoritos ilimitados", included: false },
  { label: "Alertas personalizados", included: false },
  { label: "Sem anuncios", included: false },
  { label: "Widgets e integracao", included: false },
];

const PRO_FEATURES = [
  { label: "Ate 3 modalidades", included: true },
  { label: "10 favoritos", included: true },
  { label: "Calendario basico", included: true },
  { label: "Alertas limitados", included: true },
  { label: "Modalidades ilimitadas", included: true },
  { label: "Favoritos ilimitados", included: true },
  { label: "Alertas personalizados", included: true },
  { label: "Sem anuncios", included: true },
  { label: "Widgets e integracao", included: true },
];

export default function UpgradePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-30 bg-ink border-b border-graphite-3 px-4 lg:px-7 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="display text-2xl lg:text-[28px] font-extrabold leading-none">Upgrade</h1>
            <p className="text-text-secondary text-[13px] mt-1.5">Desbloqueie todo o potencial</p>
          </div>
          <Link href="/calendario" className="w-9 h-9 rounded-[10px] border border-graphite-3 bg-transparent text-text-secondary inline-flex items-center justify-center hover:bg-graphite-2 hover:text-text-primary transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-5">
        {/* Plans comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="bg-graphite border border-graphite-3 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="mono text-[11px] tracking-[.16em] text-text-tertiary uppercase">Free</span>
            </div>
            <div className="display text-3xl font-extrabold mt-2">R$ 0</div>
            <div className="text-[12px] text-text-tertiary mt-1">Para sempre</div>
            <div className="mt-5 flex flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-tertiary flex-shrink-0"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  )}
                  <span className={`text-sm ${f.included ? "text-text-primary" : "text-text-tertiary"}`}>{f.label}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-sm font-medium border border-graphite-3 rounded-xl text-text-secondary cursor-default">
              Plano atual
            </button>
          </div>

          {/* Pro */}
          <div className="bg-graphite border border-emerald rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald/[.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 mb-1 relative">
              <span className="mono text-[11px] tracking-[.16em] text-emerald uppercase">Pro</span>
              <span className="text-[10px] font-semibold bg-emerald/[.14] text-emerald px-2 py-0.5 rounded-full">Popular</span>
            </div>
            <div className="display text-3xl font-extrabold mt-2 relative">
              R$ 9,90<span className="text-base font-normal text-text-secondary">/mes</span>
            </div>
            <div className="text-[12px] text-text-tertiary mt-1 relative">Cancele quando quiser</div>
            <div className="mt-5 flex flex-col gap-3 relative">
              {PRO_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                  <span className="text-sm text-text-primary">{f.label}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-sm font-semibold bg-emerald text-[#04130C] rounded-xl hover:bg-emerald-glow transition-colors relative">
              Assinar Pro
            </button>
          </div>
        </div>

        {/* FAQ-like note */}
        <div className="mt-6 bg-graphite-2/50 border border-graphite-3 rounded-xl p-4 text-center">
          <p className="text-[12px] text-text-secondary">
            Pagamento seguro via Stripe. Cancele a qualquer momento nas configuracoes da conta.
          </p>
        </div>
      </div>
    </div>
  );
}
