import { getDbPool } from "@/lib/db";

interface BroadcastStats {
  source: string;
  total: string;
}

interface SportCoverage {
  sport_slug: string;
  broadcast_count: string;
}

export default async function BroadcastsPage() {
  const db = getDbPool();

  const [bySource, bySport] = await Promise.all([
    db.query<BroadcastStats>(
      `SELECT source, COUNT(*)::text AS total FROM broadcasts GROUP BY source ORDER BY total DESC`
    ),
    db.query<SportCoverage>(`
      SELECT e.sport_slug, COUNT(b.id)::text AS broadcast_count
      FROM broadcasts b
      JOIN events e ON e.id = b.event_id
      GROUP BY e.sport_slug
      ORDER BY broadcast_count DESC
    `),
  ]);

  const sources = bySource.rows;
  const coverage = bySport.rows;
  const totalBroadcasts = sources.reduce(
    (acc, s) => acc + parseInt(s.total, 10),
    0
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Broadcasts
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Fonte */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Por Fonte
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Total: {totalBroadcasts} broadcasts
          </p>
          <div className="space-y-3">
            {sources.map((s) => (
              <div key={s.source} className="flex justify-between items-center">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {s.source}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {s.total}
                </span>
              </div>
            ))}
            {sources.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum broadcast registrado</p>
            )}
          </div>
        </div>

        {/* Cobertura por Modalidade */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Cobertura por Modalidade
          </h3>
          <div className="space-y-3">
            {coverage.map((c) => (
              <div key={c.sport_slug} className="flex justify-between items-center">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {c.sport_slug}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.broadcast_count} broadcasts
                </span>
              </div>
            ))}
            {coverage.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhuma cobertura registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
