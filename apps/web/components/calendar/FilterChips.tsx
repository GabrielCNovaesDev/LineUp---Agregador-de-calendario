"use client";

interface FilterChipsProps {
  active: string;
  onChange: (filter: string) => void;
}

const FILTERS = ["Todos", "Favoritos", "Brasileiros", "Ao vivo"];

export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
            active === f
              ? "bg-emerald border-emerald text-[#04130C]"
              : "bg-graphite-2 border-graphite-3 text-text-secondary hover:border-text-secondary hover:text-text-primary"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
