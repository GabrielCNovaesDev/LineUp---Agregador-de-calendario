import { getDbPool } from "@/lib/db";
import { AlertsService } from "@/services";

export default async function AdminDashboard() {
  const db = getDbPool();

  const [sportsResult, syncLogsResult, alertsData] = await Promise.all([
    db.query<{ count: string }>(
      `SELECT COUNT(DISTINCT sport_slug)::text AS count FROM sync_log WHERE status = 'success'`
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM sync_log WHERE started_at >= NOW() - INTERVAL '24 hours'`
    ),
    new AlertsService(db).listActive(),
  ]);

  const totalSports = parseInt(sportsResult.rows[0]?.count ?? "0", 10);
  const syncsToday = parseInt(syncLogsResult.rows[0]?.count ?? "0", 10);
  const activeAlerts = alertsData.length;

  const healthStatus = activeAlerts === 0 ? "Healthy" : "Degraded";
  const healthColor =
    activeAlerts === 0
      ? "text-green-600 dark:text-green-400"
      : "text-yellow-600 dark:text-yellow-400";

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Esportes" value={String(totalSports)} />
        <Card title="Syncs Hoje" value={String(syncsToday)} />
        <Card
          title="Alertas Ativos"
          value={String(activeAlerts)}
          valueClass={activeAlerts > 0 ? "text-red-600 dark:text-red-400" : undefined}
        />
        <Card title="Health Status" value={healthStatus} valueClass={healthColor} />
      </div>

      {alertsData.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Alertas Recentes
          </h3>
          <div className="space-y-2">
            {alertsData.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
              >
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  [{alert.sportSlug}] {alert.kind}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className={`text-3xl font-bold mt-2 ${valueClass ?? "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}
