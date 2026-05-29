export function Footer() {
  return (
    <footer id="sobre" className="bg-graphite px-6 lg:px-10 pt-20 pb-8 border-t border-graphite-3">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="display flex items-center text-[22px] font-extrabold tracking-tight">
              LineU<span className="relative inline-block">p<span className="pulse-dot absolute top-[6px] right-[-1px] w-[6px] h-[6px] rounded-full bg-emerald" /></span>
            </div>
            <p className="text-text-secondary text-sm mt-2.5 max-w-[280px]">Todo esporte. Um so lugar.</p>
            <div className="flex gap-2.5 mt-6">
              {['instagram', 'twitter', 'tiktok', 'youtube'].map((s) => (
                <a key={s} href="#" className="w-9 h-9 rounded-lg border border-graphite-3 inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:-translate-y-0.5 hover:border-emerald transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="mono text-[11px] tracking-[.16em] text-text-tertiary">PRODUTO</div>
            <ul className="mt-3.5 flex flex-col gap-2.5 text-sm text-text-secondary">
              <li><a href="#como" className="hover:text-text-primary transition-colors">Como funciona</a></li>
              <li><a href="#modalidades" className="hover:text-text-primary transition-colors">Modalidades</a></li>
              <li><a href="#preco" className="hover:text-text-primary transition-colors">Preco</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Mudancas</a></li>
            </ul>
          </div>
          <div>
            <div className="mono text-[11px] tracking-[.16em] text-text-tertiary">EMPRESA</div>
            <ul className="mt-3.5 flex flex-col gap-2.5 text-sm text-text-secondary">
              <li><a href="#" className="hover:text-text-primary transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Imprensa</a></li>
            </ul>
          </div>
          <div>
            <div className="mono text-[11px] tracking-[.16em] text-text-tertiary">LEGAL</div>
            <ul className="mt-3.5 flex flex-col gap-2.5 text-sm text-text-secondary">
              <li><a href="#" className="hover:text-text-primary transition-colors">Termos</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Cookies</a></li>
              <li><a href="#" className="hover:text-text-primary transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-6 border-t border-graphite-3 flex flex-col sm:flex-row justify-between items-center gap-4 text-[13px] text-text-tertiary">
          <span>{"©"} 2026 LineUp. Feito no Brasil</span>
          <span className="mono flex gap-3.5">
            <a href="#" className="text-text-primary">PT-BR</a>
            <a href="#" className="hover:text-text-primary">EN</a>
            <a href="#" className="hover:text-text-primary">ES</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
