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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-ink/90 backdrop-blur-xl border-t border-graphite-3 z-50">
      <div className="grid grid-cols-5 py-2 pb-5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[10px] ${
                active ? "text-emerald" : "text-text-tertiary"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span className={active ? "font-semibold" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
