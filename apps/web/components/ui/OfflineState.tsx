"use client";

interface OfflineStateProps {
  onRetry?: () => void;
}

export function OfflineState({ onRetry }: OfflineStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="w-[104px] h-[104px] rounded-full bg-warning/[.08] border border-warning/30 flex items-center justify-center mb-6">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <path d="M12 20h.01" />
        </svg>
      </div>
      <h2 className="display text-2xl font-extrabold">Voce esta offline</h2>
      <p className="text-text-secondary text-sm leading-relaxed mt-2.5 max-w-[300px]">
        Verifique sua conexao com a internet e tente novamente.
      </p>
      {onRetry && (
        <button onClick={onRetry} className="mt-6 bg-emerald text-[#04130C] font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-emerald-glow transition-all">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
