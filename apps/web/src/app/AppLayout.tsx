import { Link, NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur">
        <Link to="/calendar" className="text-base font-semibold tracking-tight">
          LineUp
        </Link>
        <nav className="flex items-center gap-3 text-sm text-[var(--color-fg-muted)]">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? 'text-[var(--color-fg)]' : 'hover:text-[var(--color-fg)]'
            }
          >
            Ajustes
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <Outlet />
      </main>
    </div>
  );
}
