import { Link, useParams } from 'react-router-dom';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="space-y-4">
      <Link to="/calendar" className="text-sm text-[var(--color-fg-muted)]">
        ← Voltar
      </Link>
      <h1 className="text-xl font-semibold">Detalhe do evento</h1>
      <p className="text-sm text-[var(--color-fg-muted)]">ID: {id}</p>
      <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        Placeholder — TASK-3.3 implementa o conteúdo desta tela.
      </p>
    </section>
  );
}
