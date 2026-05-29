"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-ink/70 backdrop-blur-xl border-b border-graphite-3"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
        <Link href="/" className="display flex items-center text-[22px] font-extrabold tracking-tight">
          LineU
          <span className="relative inline-block">
            p
            <span className="pulse-dot absolute top-[6px] right-[-1px] w-[6px] h-[6px] rounded-full bg-emerald shadow-[0_0_12px_var(--emerald)]" />
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          <a href="#como" className="hover:text-text-primary transition-colors">Como funciona</a>
          <a href="#modalidades" className="hover:text-text-primary transition-colors">Modalidades</a>
          <a href="#preco" className="hover:text-text-primary transition-colors">Preço</a>
          <a href="#sobre" className="hover:text-text-primary transition-colors">Sobre</a>
        </nav>

        <div className="flex items-center gap-4">
          <a href="#" className="hidden md:inline text-sm text-text-secondary hover:text-text-primary transition-colors">
            Entrar
          </a>
          <Link
            href="/calendario"
            className="inline-flex items-center gap-2 bg-emerald text-[#04130C] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-emerald-glow transition-all hover:-translate-y-0.5"
          >
            Baixar app
          </Link>
        </div>
      </div>
    </header>
  );
}
