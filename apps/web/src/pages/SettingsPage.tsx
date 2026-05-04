import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTimezone } from '../app/TimezoneContext';
import {
  COMMON_TIMEZONES,
  dayjs,
  detectTimezone,
  formatTimezoneName,
  isValidTimezone
} from '../lib/timezone';

export function SettingsPage() {
  const { timezone, setTimezone } = useTimezone();
  const [customTimezone, setCustomTimezone] = useState(timezone);
  const [message, setMessage] = useState<string | null>(null);

  const browserTimezone = useMemo(() => detectTimezone(), []);
  const customIsValid = isValidTimezone(customTimezone.trim());
  const preview = dayjs().tz(timezone).format('ddd, DD MMM · HH[h]mm');

  function chooseTimezone(nextTimezone: string) {
    setTimezone(nextTimezone);
    setCustomTimezone(nextTimezone);
    setMessage('Fuso atualizado.');
  }

  function saveCustomTimezone() {
    const value = customTimezone.trim();
    if (!isValidTimezone(value)) {
      setMessage('Informe um timezone IANA valido, como America/Fortaleza.');
      return;
    }
    chooseTimezone(value);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ajustes</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Horarios sempre no fuso escolhido aqui.
          </p>
        </div>
        <Link
          to="/calendar"
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-fg-muted)]"
        >
          Calendario
        </Link>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-fg-muted)]">
          Fuso atual
        </p>
        <p className="mt-2 font-semibold">{formatTimezoneName(timezone)}</p>
        <p className="mt-1 font-mono text-xs text-[var(--color-fg-muted)]">{timezone}</p>
        <p className="mt-3 text-[var(--color-fg-muted)]">
          Agora nesse fuso: <span className="text-[var(--color-fg)]">{preview}</span>
        </p>
        <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
          Detectado pelo navegador: {formatTimezoneName(browserTimezone)}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Fusos comuns</h2>
        <div className="space-y-2">
          {COMMON_TIMEZONES.map((item) => {
            const isActive = item.value === timezone;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseTimezone(item.value)}
                className={[
                  'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm',
                  isActive
                    ? 'border-red-400 bg-red-500/15 text-red-50'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)]'
                ].join(' ')}
              >
                <span>{item.label}</span>
                {isActive && <span className="text-xs font-bold">ATIVO</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <label htmlFor="custom-timezone" className="block text-sm font-semibold">
          Buscar outro fuso
        </label>
        <input
          id="custom-timezone"
          value={customTimezone}
          onChange={(event) => {
            setCustomTimezone(event.target.value);
            setMessage(null);
          }}
          placeholder="America/Fortaleza"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 font-mono text-sm outline-none focus:border-red-300"
        />
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${customIsValid ? 'text-[var(--color-fg-muted)]' : 'text-red-200'}`}>
            {customIsValid ? 'Timezone valido.' : 'Timezone invalido.'}
          </p>
          <button
            type="button"
            onClick={saveCustomTimezone}
            disabled={!customIsValid}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-fg)]">
          {message}
        </div>
      )}
    </section>
  );
}
