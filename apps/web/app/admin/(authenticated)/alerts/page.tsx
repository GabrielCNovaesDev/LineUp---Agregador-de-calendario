import { getDbPool } from "@/lib/db";
import { AlertsService } from "@/services";

export default async function AlertsPage() {
  const db = getDbPool();
  const alertsService = new AlertsService(db);
  const alerts = await alertsService.listActive();

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Alertas
      </h2>

      {alerts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            Nenhum alerta ativo no momento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      {alert.kind}
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {alert.sportSlug}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {alert.message}
                  </p>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap ml-4">
                  {new Date(alert.detectedAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
