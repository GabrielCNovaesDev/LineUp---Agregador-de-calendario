"use client";

type View = "agenda" | "semana" | "mes";

interface ViewSwitchProps {
  current: View;
  onChange: (view: View) => void;
}

export function ViewSwitch({ current, onChange }: ViewSwitchProps) {
  const views: { key: View; label: string }[] = [
    { key: "agenda", label: "Agenda" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mês" },
  ];

  return (
    <div className="inline-flex bg-graphite border border-graphite-3 rounded-[11px] p-[3px] gap-[3px]">
      {views.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={`text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors ${
            current === v.key
              ? "bg-emerald text-[#04130C]"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
