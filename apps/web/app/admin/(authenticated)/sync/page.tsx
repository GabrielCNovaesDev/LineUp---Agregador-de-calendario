import { getDbPool } from "@/lib/db";

interface SyncRow {
  sport_slug: string;
  category: string | null;
  started_at: Date;
  finished_at: Date | null;
  status: string;
  events_upserted: number;
  events_skipped: number;
}

export default async function SyncStatusPage() {
  const db = getDbPool();

  const result = await db.query<SyncRow>(`
    SELECT DISTINCT ON (sport_slug)
      sport_slug,
      category,
      started_at,
      finished_at,
      status,
      events_upserted,
      events_skipped
    FROM sync_log
    ORDER BY sport_slug, started_at DESC
  `);

  const syncs = result.rows;

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Sync Status
      </h2>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Esporte
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Categoria
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Ultimo Sync
              </th>
              <th className="text-left px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                Eventos
              </th>
            </tr>
          </thead>
          <tbody>
            {syncs.map((sync) => (
              <tr
                key={sync.sport_slug}
                className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {sync.sport_slug}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {sync.category ?? "-"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {new Date(sync.started_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={sync.status} />
                </td>
                <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                  {sync.events_upserted + sync.events_skipped}
                </td>
              </tr>
            ))}
            {syncs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum sync registrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors =
    status === "success"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : status === "error"
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}
