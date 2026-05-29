import { getDbPool } from '@/lib/db';
import { NotificationsService } from '@/services/notifications.service';

export async function runNotificationsJob(): Promise<void> {
  const db = getDbPool();
  const notificationsService = new NotificationsService(db);
  const result = await notificationsService.dispatchPending();

  if (result.sent > 0 || result.failed > 0 || result.cleaned > 0) {
    console.log(
      `[notifications] dispatched: sent=${result.sent} failed=${result.failed} cleaned=${result.cleaned}`
    );
  }
}
