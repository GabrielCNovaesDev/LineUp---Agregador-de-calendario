import { useTimezone } from '../app/TimezoneContext';

export function SettingsPage() {
  const { timezone } = useTimezone();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Ajustes</h1>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="text-[var(--color-fg-muted)]">Fuso horário detectado:</p>
        <p className="mt-1 font-mono">{timezone}</p>
        <p className="mt-3 text-[var(--color-fg-muted)]">
          O seletor de fusos e a lista de esportes favoritos entram na TASK-3.4 / TASK-3.6.
        </p>
      </div>
    </section>
  );
}
