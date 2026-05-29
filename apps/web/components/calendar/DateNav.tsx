"use client";

interface DateNavProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday: boolean;
}

export function DateNav({ label, onPrev, onNext, onToday, isToday }: DateNavProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        className="w-[34px] h-[34px] rounded-[10px] border border-graphite-3 bg-transparent text-text-primary inline-flex items-center justify-center hover:bg-graphite-2 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <span className="display text-base lg:text-lg font-bold">{label}</span>
      {!isToday && (
        <button
          onClick={onToday}
          className="mono text-xs font-semibold text-emerald-glow bg-emerald/12 border border-emerald-dim px-2.5 py-1 rounded-full"
        >
          Hoje
        </button>
      )}
      <button
        onClick={onNext}
        className="w-[34px] h-[34px] rounded-[10px] border border-graphite-3 bg-transparent text-text-primary inline-flex items-center justify-center hover:bg-graphite-2 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  );
}
