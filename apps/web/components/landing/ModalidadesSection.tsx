import { RevealOnScroll } from './RevealOnScroll';

const MODALITIES = [
  'Futebol', 'Automobilismo', 'MMA', 'Boxe', 'Basquete', 'Tenis',
  'Volei', 'Futebol Americano', 'Criquete', 'Ciclismo', 'Rugby',
  'Atletismo', 'Esportes Aquaticos', 'Golfe', 'E-sports', 'Olimpicos',
  'Beisebol', 'Handebol', 'Surfe/Skate', 'Esportes de Inverno',
  'Hipismo', 'Dardos/Sinuca', 'Esportes de Forca',
];

export function ModalidadesSection() {
  return (
    <section id="modalidades" className="px-6 lg:px-10 py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto">
        <RevealOnScroll className="text-center max-w-[760px] mx-auto">
          <span className="eyebrow">Modalidades</span>
          <h2 className="display text-3xl md:text-4xl lg:text-5xl font-bold mt-3.5 leading-tight">
            23 modalidades. <span className="text-emerald">Cobertura completa.</span>
          </h2>
        </RevealOnScroll>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-14">
          {MODALITIES.map((mod, i) => (
            <RevealOnScroll key={i}>
              <div className="bg-graphite border border-graphite-3 rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:-translate-y-1 hover:border-emerald transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-emerald-dim/30 text-emerald-glow flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
                </div>
                <span className="text-xs font-medium text-text-primary leading-tight">{mod}</span>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
