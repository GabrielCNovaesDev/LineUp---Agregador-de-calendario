import { RevealOnScroll } from './RevealOnScroll';

export function PricingSection() {
  return (
    <section id="preco" className="px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll className="text-center max-w-[760px] mx-auto">
          <span className="eyebrow">Preco</span>
          <h2 className="display text-3xl md:text-4xl lg:text-5xl font-bold mt-3.5 leading-tight">
            Comece gratis. <span className="text-emerald">Evolua quando quiser.</span>
          </h2>
          <p className="text-text-secondary text-[17px] mt-3.5">Sem cartao pra comecar. Cancele a qualquer momento.</p>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 gap-5 mt-14 max-w-[880px] mx-auto">
          {/* Free */}
          <RevealOnScroll>
            <div className="bg-graphite border border-graphite-3 rounded-2xl p-9">
              <div className="mono text-xs tracking-[.16em] text-text-tertiary">PLANO GRATIS</div>
              <h3 className="display text-[32px] font-bold mt-3">Gratis</h3>
              <div className="mt-3.5 flex items-baseline gap-1.5">
                <span className="display text-5xl font-extrabold">R$ 0</span>
                <span className="text-text-tertiary text-sm">/ sempre</span>
              </div>
              <p className="text-text-secondary text-sm mt-2">Pra acompanhar o essencial.</p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {['Ate 10 competicoes favoritas', 'Notificacoes basicas', 'Calendario diario', 'Anuncios discretos'].map((f, i) => (
                  <li key={i} className="flex gap-2.5 items-center text-sm text-text-secondary">
                    <CheckMark />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#" className="mt-8 w-full inline-flex items-center justify-center border border-graphite-3 text-text-primary font-semibold text-sm px-4 py-3.5 rounded-xl hover:border-text-secondary transition-all">
                Comecar gratis
              </a>
            </div>
          </RevealOnScroll>
          {/* Pro */}
          <RevealOnScroll>
            <div className="bg-graphite-2 border border-emerald rounded-2xl p-9 relative" style={{ boxShadow: '0 0 0 1px rgba(16,185,129,.25), 0 30px 60px rgba(16,185,129,.08)' }}>
              <span className="absolute -top-3 left-9 bg-emerald text-[#04130C] mono text-[10px] tracking-[.18em] font-bold px-2.5 py-1 rounded-md">MAIS POPULAR</span>
              <div className="mono text-xs tracking-[.16em] text-emerald">PLANO PRO</div>
              <h3 className="display text-[32px] font-bold mt-3">Pro</h3>
              <div className="mt-3.5 flex items-baseline gap-1.5">
                <span className="display text-5xl font-extrabold">R$ 14,90</span>
                <span className="text-text-tertiary text-sm">/ mes</span>
              </div>
              <p className="text-sm mt-2 text-text-secondary">ou <span className="text-emerald-glow font-semibold">R$ 119/ano</span> - economize 33%</p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {['Competicoes ilimitadas', 'Notificacoes personalizadas', 'Modo torcedor (alertas em tempo real)', 'Sem anuncios', 'Widgets para tela inicial', 'Prioridade em novas features'].map((f, i) => (
                  <li key={i} className="flex gap-2.5 items-center text-sm text-text-primary">
                    <CheckMark />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#" className="mt-8 w-full inline-flex items-center justify-center bg-emerald text-[#04130C] font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-emerald-glow transition-all">
                Assinar Pro
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function CheckMark() {
  return (
    <span className="inline-flex w-[18px] h-[18px] rounded-full bg-emerald/15 text-emerald items-center justify-center flex-shrink-0">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
    </span>
  );
}
