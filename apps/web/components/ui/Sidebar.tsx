"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/calendario", label: "Calendário", icon: "M3 5h18v16H3V5zM3 10h18M8 3v4M16 3v4" },
  { href: "/explorar", label: "Explorar", icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M15 9l-3.5 1.5L10 14l3.5-1.5z" },
  { href: "/favoritos", label: "Favoritos", icon: "M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z" },
  { href: "/notificacoes", label: "Alertas", icon: "M6 8a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9M10 21a2 2 0 0 0 4 0" },
  { href: "/buscar", label: "Buscar", icon: "M11 11m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M20 20l-3.5-3.5" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 border-r border-graphite-3 bg-[#0f1311] flex-col">
      <div className="px-5 pt-5 pb-4 flex items-center gap-2">
        <span className="display text-xl font-extrabold">LineUp</span>
        <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald shadow-[0_0_10px_var(--emerald)]" />
      </div>
      <div className="mono text-[11px] tracking-[.16em] text-text-tertiary px-5 mt-2">PRINCIPAL</div>
      <nav className="mt-2 flex flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-colors ${
                active
                  ? "text-text-primary border-l-emerald bg-emerald/[.06]"
                  : "text-text-secondary border-l-transparent hover:text-text-primary hover:bg-white/[.02]"
              }`}
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
              {item.href === "/calendario" && active && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald pulse-dot" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-5 border-t border-graphite-3">
        <div className="flex gap-2.5 items-center">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-dim to-ink border border-graphite-3" />
          <div>
            <div className="text-[13px] font-semibold">Visitante</div>
            <div className="text-[11px] text-text-tertiary">Free · BR</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
