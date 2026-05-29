"use client";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Nao foi possivel carregar o conteudo. Tente novamente em alguns instantes.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20">
      <div className="w-[104px] h-[104px] rounded-full bg-live-red/[.08] border border-live-red/30 flex items-center justify-center mb-6">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-live-red">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 className="display text-2xl font-extrabold">{title}</h2>
      <p className="text-text-secondary text-sm leading-relaxed mt-2.5 max-w-[300px]">
        {description}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="mt-6 bg-emerald text-[#04130C] font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-emerald-glow transition-all">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
