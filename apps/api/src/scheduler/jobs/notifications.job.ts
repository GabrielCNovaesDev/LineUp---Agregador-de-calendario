import { db } from '../../lib/db.js';
import { NotificationsService } from '../../services/notifications.service.js';

const notificationsService = new NotificationsService(db);

export async function runNotificationsJob(): Promise<void> {
  const result = await notificationsService.dispatchPending();
  if (result.sent > 0 || result.failed > 0 || result.cleaned > 0) {
    console.log(`[notifications] dispatched: sent=${result.sent} failed=${result.failed} cleaned=${result.cleaned}`);
  }
}
