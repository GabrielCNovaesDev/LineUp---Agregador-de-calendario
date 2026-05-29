import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-center px-6">
      <div className="w-[104px] h-[104px] rounded-full bg-graphite-3/30 border border-graphite-3 flex items-center justify-center mb-6">
        <span className="display text-4xl font-extrabold text-graphite-3">404</span>
      </div>
      <h1 className="display text-2xl font-extrabold">Pagina nao encontrada</h1>
      <p className="text-text-secondary text-sm leading-relaxed mt-2.5 max-w-[300px]">
        O conteudo que voce procura nao existe ou foi movido.
      </p>
      <Link href="/calendario" className="mt-6 bg-emerald text-[#04130C] font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-emerald-glow transition-all inline-block">
        Voltar ao calendario
      </Link>
    </div>
  );
}
