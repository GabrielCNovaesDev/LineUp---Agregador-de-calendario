import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTimezone } from '../app/TimezoneContext';

export function CalendarPage() {
  const { timezone } = useTimezone();
  const { data, isLoading, error } = useQuery({
    queryKey: ['sports'],
    queryFn: () => api.getSports()
  });

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Próximos eventos</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Fuso atual: <span className="font-mono">{timezone}</span>
        </p>
      </header>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-fg-muted)]">
        <p className="text-[var(--color-fg)]">Tela do calendário — TASK-3.2</p>
        <p className="mt-2">
          Este placeholder confirma que o setup (Vite + PWA + Tailwind + Router + TanStack Query)
          está rodando. A grade de eventos, filtros e cards entram na próxima task.
        </p>
        {isLoading && <p className="mt-3">Carregando esportes…</p>}
        {error instanceof Error && <p className="mt-3 text-[var(--color-accent)]">{error.message}</p>}
        {data && (
          <ul className="mt-3 list-disc pl-5">
            {data.data.map((sport) => (
              <li key={sport.slug}>
                {sport.name} <span className="text-[var(--color-fg-muted)]">({sport.slug})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
