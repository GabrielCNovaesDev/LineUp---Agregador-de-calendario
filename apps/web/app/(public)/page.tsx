import { Navbar } from '@/components/landing/Navbar';
import { Marquee } from '@/components/landing/Marquee';
import { RevealOnScroll } from '@/components/landing/RevealOnScroll';
import { FeatureBlock } from '@/components/landing/FeatureBlock';
import { ModalidadesSection } from '@/components/landing/ModalidadesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="bg-ink text-text-primary">
      <Navbar />
      <HeroSection />
      <Marquee />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ModalidadesSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  );
}

function HeroSection() {
  return (
    <section
      className="relative min-h-[800px] px-6 lg:px-10 pt-20 pb-24"
      style={{ background: "radial-gradient(60% 70% at 85% 30%, rgba(6,95,70,.32) 0%, rgba(6,95,70,.10) 35%, rgba(10,14,12,0) 70%)" }}
    >
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <RevealOnScroll>
          <span className="mono inline-flex items-center gap-2 text-xs text-text-secondary border border-graphite-3 bg-white/[.02] px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
            Calendário esportivo inteligente
          </span>
          <h1 className="display text-5xl md:text-7xl lg:text-[76px] font-extrabold leading-[1.02] mt-4">
            Todo esporte.<br />
            <span className="text-emerald">Um só lugar.</span>
          </h1>
          <p className="text-text-secondary text-lg lg:text-xl leading-relaxed max-w-[540px] mt-6">
            390 competições, 23 modalidades, em tempo real. Saiba quando começa, onde assistir e o que está acontecendo agora.
          </p>
          <div className="flex items-center gap-3 mt-8 flex-wrap">
            <a href="#" className="inline-flex items-center gap-2 bg-emerald text-[#04130C] font-semibold text-[15px] px-6 py-3.5 rounded-xl hover:bg-emerald-glow transition-all hover:-translate-y-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
              Baixar grátis
            </a>
            <a href="#como" className="inline-flex items-center gap-2 border border-graphite-3 text-text-primary font-semibold text-[15px] px-6 py-3.5 rounded-xl hover:border-text-secondary hover:bg-white/[.02] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>
              Ver como funciona
            </a>
          </div>
          <div className="flex items-center gap-4 mt-9">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="w-[34px] h-[34px] rounded-full border-2 border-ink -ml-2.5 first:ml-0" style={{ background: `linear-gradient(135deg, hsl(${150+i*30}, 30%, 25%), hsl(${150+i*30}, 30%, 10%))` }} />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-emerald">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
                ))}
              </div>
              <div className="text-[13px] text-text-secondary mt-1">
                Mais de <span className="text-text-primary font-semibold">50 mil</span> fãs já usam
              </div>
            </div>
          </div>
        </RevealOnScroll>
        <RevealOnScroll className="hidden lg:flex justify-center">
          <div style={{ transform: "rotate(6deg)" }}>
            <PhoneMock />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function PhoneMock() {
  return (
    <div className="w-[320px] h-[640px] rounded-[42px] border-[10px] border-[#0a0a0a] bg-graphite overflow-hidden relative" style={{ boxShadow: "0 50px 100px rgba(0,0,0,.6), 0 0 0 1px #2a2a2a, 0 0 80px rgba(16,185,129,.1)" }}>
      <div className="h-7 bg-ink flex items-center justify-between px-4 mono text-[10px] text-text-secondary">
        <span>21:47</span>
        <span className="w-[60px] h-[18px] bg-black rounded-[10px]" />
        <span className="w-3 h-1.5 border border-text-tertiary rounded-sm" />
      </div>
      <div className="p-3.5 bg-ink h-full">
        <div className="flex justify-between items-end mb-3.5">
          <div>
            <div className="mono text-[9px] text-text-tertiary tracking-[.16em]">QUA · 27 MAI</div>
            <div className="display text-[22px] font-bold mt-0.5">Sua noite</div>
          </div>
          <span className="mono inline-flex items-center gap-1.5 text-[9px] text-text-secondary border border-graphite-3 bg-white/[.02] px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-live-red live-pulse" />3 ao vivo
          </span>
        </div>
        <div className="bg-graphite-2 border border-live-red rounded-[14px] p-3 mb-2.5">
          <div className="flex justify-between items-center mb-2">
            <span className="mono text-[9px] tracking-[.14em] text-text-tertiary">BRASILEIRÃO · 12ª RODADA</span>
            <span className="mono text-[9px] text-live-red flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-live-red live-pulse inline-block" />{"62'"}
            </span>
          </div>
          <div className="flex justify-between text-[13px]"><span className="font-semibold">Palmeiras</span><span className="mono font-bold">2</span></div>
          <div className="flex justify-between text-[13px] mt-1"><span className="font-semibold">Flamengo</span><span className="mono font-bold">1</span></div>
          <div className="flex justify-between mt-2.5 pt-2 border-t border-graphite-3">
            <span className="text-[10px] text-text-secondary">Globo · Premiere</span>
            <span className="text-[10px] text-emerald">{"Acompanhar →"}</span>
          </div>
        </div>
        <div className="bg-graphite-2 border border-graphite-3 rounded-[14px] p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="mono text-[9px] tracking-[.14em] text-text-tertiary">UFC FIGHT NIGHT</span>
            <span className="mono text-[9px] text-text-secondary">23:00 BRT</span>
          </div>
          <div className="text-[13px] font-semibold">Almeida vs Hill</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Card preliminar a partir das 20:00</div>
          <div className="flex justify-between mt-2.5 pt-2 border-t border-graphite-3">
            <span className="text-[10px] text-text-secondary">UFC Fight Pass</span>
            <span className="text-[10px] text-emerald">{"Lembrar →"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemSection() {
  const items = [
    { icon: "M12 6v6l4 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", text: "Não sabia que horas começava." },
    { icon: "M11 11l7-7M11 4h7v7M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0", text: "Procurou em 5 sites e não achou onde passava." },
    { icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM3 12h18M12 2a14 14 0 0 1 0 20M12 2a14 14 0 0 0 0 20", text: "Errou o fuso horário do evento internacional." },
    { icon: "M3 5h18v16H3V5zM3 10h18M8 3v4M16 3v4", text: "Esqueceu que tinha jogo importante hoje." },
  ];
  return (
    <section className="px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll>
          <h2 className="display text-3xl md:text-4xl lg:text-[44px] font-bold text-center leading-tight">
            Você já perdeu um jogo porque...
          </h2>
        </RevealOnScroll>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {items.map((item, i) => (
            <RevealOnScroll key={i}>
              <div className="bg-graphite border border-graphite-3 rounded-2xl p-7">
                <div className="w-12 h-12 rounded-xl bg-emerald-dim/40 text-emerald-glow flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                </div>
                <p className="text-text-secondary mt-5 text-[15px] leading-relaxed">{item.text}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <RevealOnScroll>
          <p className="mt-12 text-xl md:text-[22px] text-text-primary font-medium text-center">
            A gente também. Por isso fizemos o <span className="display font-bold">LineUp</span>.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "01", title: "Escolha o que te interessa", desc: "Selecione modalidades, times, atletas e competições. O LineUp aprende seu gosto." },
    { num: "02", title: "Receba o que importa", desc: "Notificações inteligentes antes dos eventos, com horário, transmissão e contexto." },
    { num: "03", title: "Não perca mais nada", desc: "Tudo num só calendário. Do Brasileirão à F1, do UFC ao LoL Worlds." },
  ];
  return (
    <section id="como" className="px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll className="max-w-[720px]">
          <span className="eyebrow">Como funciona</span>
          <h2 className="display text-3xl md:text-4xl lg:text-5xl font-bold mt-3.5 leading-tight">
            Três passos. Funciona em segundos.
          </h2>
        </RevealOnScroll>
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {steps.map((step, i) => (
            <RevealOnScroll key={i}>
              <div className="mono text-[80px] font-semibold text-emerald leading-none">{step.num}</div>
              <h3 className="display text-2xl font-bold mt-4">{step.title}</h3>
              <p className="text-text-secondary mt-2.5 text-[15px] leading-relaxed">{step.desc}</p>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-graphite px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-24 lg:gap-32">
        <FeatureBlock
          title="Tudo ao vivo, num só lugar."
          desc="Acompanhe múltiplas competições acontecendo ao mesmo tempo, sem trocar de app, sem perder o placar."
          bullets={["Placares atualizados em tempo real", "Mini-cards de cada partida no feed", "Filtros por modalidade e favoritos"]}
          icon="M2 6h20v12H2V6zM6 2v4M18 2v4"
        />
        <FeatureBlock
          title="Onde assistir, sem mistério."
          desc="A gente diz exatamente o canal e o streaming de cada transmissão no Brasil."
          bullets={["Mais de 30 emissoras e streamings mapeados", "Mostra apenas serviços disponíveis no Brasil", "Atualizado em tempo real"]}
          icon="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
          reverse
        />
        <FeatureBlock
          title="Lembretes que funcionam."
          desc="Notificação na hora certa, com contexto: quem joga, onde passa, e quanto falta pra começar."
          bullets={["Alertas personalizáveis por evento", "Lembrete 15min, 1h ou 1 dia antes", "Silencioso quando você quiser"]}
          icon="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        />
        <FeatureBlock
          title="Curadoria por IA, contexto brasileiro."
          desc="Horário em Brasília, transmissão BR, relevância pro Brasil. Informação estruturada, sempre atualizada."
          bullets={["Fuso horário automático (BRT)", "Canais brasileiros priorizados", "Destaque para atletas e times do Brasil"]}
          icon="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          reverse
        />
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    { quote: "Antes eu perdia metade dos jogos de F1 por causa do fuso. Hoje abro o LineUp de manhã e já sei minha programação.", name: "Carla R.", role: "ENGENHEIRA · FÃ DE AUTOMOBILISMO" },
    { quote: "Acompanho NBA, Brasileirão e UFC. Era impossível antes. Agora é uma tela.", name: "Diego S.", role: "PRODUTOR DE CONTEÚDO" },
    { quote: "A parte de saber onde passa cada jogo me economiza muito tempo. Vale cada centavo.", name: "Patrícia L.", role: "ADVOGADA · TORCEDORA" },
  ];
  return (
    <section className="bg-graphite px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll className="text-center max-w-[760px] mx-auto mb-14">
          <span className="eyebrow">Depoimentos</span>
          <h2 className="display text-3xl md:text-4xl lg:text-5xl font-bold mt-3.5 leading-tight">
            Quem usa, recomenda.
          </h2>
        </RevealOnScroll>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <RevealOnScroll key={i}>
              <div className="bg-graphite-2 border border-graphite-3 rounded-2xl p-8 relative">
                <span className="display font-extrabold text-7xl text-emerald-dim/60 absolute top-8 left-8 leading-none">{"“"}</span>
                <p className="text-base leading-relaxed mt-8">{t.quote}</p>
                <div className="mt-6 pt-5 border-t border-graphite-3">
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="mono text-xs text-text-tertiary mt-0.5">{t.role}</div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section
      className="px-6 lg:px-10 py-24 lg:py-32 border-t border-graphite-3"
      style={{ background: "radial-gradient(70% 90% at 50% 110%, rgba(16,185,129,.22) 0%, rgba(16,185,129,.06) 40%, rgba(10,14,12,0) 75%)" }}
    >
      <div className="max-w-[1100px] mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-16 items-center">
        <RevealOnScroll>
          <h2 className="display text-4xl md:text-5xl lg:text-[60px] font-extrabold leading-[1.02]">
            Pronto pra não perder<br /><span className="text-emerald">mais nenhum jogo?</span>
          </h2>
          <p className="text-text-secondary text-lg mt-5">Baixe grátis. Sem cartão. Sem complicação.</p>
          <div className="flex items-center gap-3 mt-8 flex-wrap">
            <a href="#" className="inline-flex items-center gap-3 border border-graphite-3 text-text-primary font-semibold text-sm px-5 py-3.5 rounded-xl hover:border-text-secondary transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.04a4.6 4.6 0 0 1 2.2-3.86 4.74 4.74 0 0 0-3.74-2.02c-1.57-.16-3.08.93-3.88.93s-2.04-.91-3.36-.88a5 5 0 0 0-4.2 2.56c-1.81 3.13-.46 7.73 1.28 10.26.86 1.24 1.88 2.62 3.2 2.57 1.29-.05 1.78-.83 3.34-.83s2 .83 3.36.8c1.39-.02 2.27-1.25 3.13-2.5a10.96 10.96 0 0 0 1.4-2.86 4.45 4.45 0 0 1-2.73-4.07zM14.5 4.4a4.43 4.43 0 0 0 1.04-3.22 4.6 4.6 0 0 0-2.98 1.55 4.3 4.3 0 0 0-1.07 3.1 3.8 3.8 0 0 0 3.01-1.43z"/></svg>
              <span className="flex flex-col items-start leading-tight">
                <span className="mono text-[10px] text-text-tertiary tracking-[.12em]">BAIXAR PARA</span>
                <span className="text-[15px]">iOS</span>
              </span>
            </a>
            <a href="#" className="inline-flex items-center gap-3 border border-graphite-3 text-text-primary font-semibold text-sm px-5 py-3.5 rounded-xl hover:border-text-secondary transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 1.5c-.5.5-.6 1.3-.6 2.4v16.2c0 1.1.1 1.9.6 2.4l9.4-10.5L3.6 1.5zm10.7 9.6 2.4 2.4 4.8-2.8c1.4-.8 1.4-2.1 0-2.9l-4.8-2.8-2.4 2.4-2.4 2.4 2.4 2.3zM4.7 22.5c.5.3 1.2.2 2-.2l8.8-5.1-2.5-2.4-8.3 7.7zM4.7 1.5l8.3 7.7 2.5-2.4-8.8-5.1c-.8-.4-1.5-.5-2-.2z"/></svg>
              <span className="flex flex-col items-start leading-tight">
                <span className="mono text-[10px] text-text-tertiary tracking-[.12em]">BAIXAR PARA</span>
                <span className="text-[15px]">Android</span>
              </span>
            </a>
          </div>
        </RevealOnScroll>
        <RevealOnScroll className="hidden lg:flex flex-col items-center">
          <div className="w-40 h-40 bg-white rounded-xl p-3 grid grid-cols-7 gap-px">
            {Array.from({ length: 49 }).map((_, i) => (
              <span key={i} className={(i + Math.floor(i / 7)) % 3 === 0 ? "bg-black rounded-[1px]" : ""} />
            ))}
          </div>
          <div className="mono text-xs tracking-[.16em] text-text-tertiary mt-3.5">APONTE SUA CÂMERA</div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
