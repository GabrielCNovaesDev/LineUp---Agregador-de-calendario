"use client";

interface EventCardProps {
  title: string;
  subtitle: string | null;
  time: string;
  sport: { slug: string; name: string };
  status: string;
  venue?: string | null;
}

const SPORT_COLORS: Record<string, string> = {
  football: "var(--emerald)",
  motorsport: "var(--warning)",
  tennis: "#E0853C",
  basketball: "#A855F7",
  mma: "var(--live-red)",
  esports: "#3B82F6",
};

export function EventCard({ title, subtitle, time, sport, status, venue }: EventCardProps) {
  const isLive = status === "live";
  const borderColor = SPORT_COLORS[sport.slug] || "var(--graphite-3)";

  return (
    <div
      className={`grid grid-cols-[46px_1fr_auto] gap-3 p-3 rounded-xl border mb-2 transition-all cursor-pointer hover:translate-x-0.5 hover:bg-graphite-2 ${
        isLive ? "bg-graphite-2 border-graphite-3" : "bg-graphite border-graphite-3"
      }`}
      style={{ borderLeftWidth: "3px", borderLeftColor: isLive ? "var(--emerald)" : borderColor }}
    >
      <div className="mono text-sm font-semibold pt-0.5 leading-tight">
        {time}
        {isLive && (
          <span className="block text-[9px] text-emerald-glow font-medium tracking-wide mt-0.5">AO VIVO</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold leading-tight">
          <span className="w-[22px] h-[22px] rounded-md bg-graphite-2 inline-flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={borderColor} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </span>
          <span className="truncate">{title}</span>
        </div>
        <div className="text-[11.5px] text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
          <span>{sport.name}</span>
          {subtitle && <><span className="text-text-tertiary">·</span><span>{subtitle}</span></>}
          {venue && <><span className="text-text-tertiary">·</span><span>{venue}</span></>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 items-center justify-center">
        <button className="w-[30px] h-[30px] rounded-lg border border-graphite-3 bg-transparent text-text-tertiary inline-flex items-center justify-center hover:text-text-primary hover:border-text-secondary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
      </div>
    </div>
  );
}
