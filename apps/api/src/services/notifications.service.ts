import webpush from 'web-push';
import type { Queryable } from './events.service.js';
import { env } from '../config/env.js';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface SubscribeParams {
  eventId: string;
  minutesBefore: number;
  pushEndpoint: string;
  pushKeys: PushSubscriptionKeys;
}

export interface PendingNotification {
  id: string;
  event_id: string;
  title: string;
  subtitle: string | null;
  sport_name: string;
  sport_category: string;
  starts_at: string;
  minutes_before: number;
  push_endpoint: string;
  push_keys: PushSubscriptionKeys;
}

const SPORT_EMOJI: Record<string, string> = {
  motorsport: '🏎️',
  mma: '🥊',
  tennis: '🎾'
};

export class NotificationsService {
  constructor(private db: Queryable) {
    if (env.vapidPublicKey && env.vapidPrivateKey) {
      webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    }
  }

  get vapidConfigured(): boolean {
    return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
  }

  async subscribe(params: SubscribeParams): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO notification_subscriptions
        (user_id, event_id, minutes_before, push_endpoint, push_keys)
       VALUES (
         '00000000-0000-0000-0000-000000000000',
         $1, $2, $3, $4
       )
       ON CONFLICT (user_id, event_id, minutes_before) DO UPDATE SET
         push_endpoint = EXCLUDED.push_endpoint,
         push_keys = EXCLUDED.push_keys,
         sent_at = NULL
       RETURNING id`,
      [params.eventId, params.minutesBefore, params.pushEndpoint, JSON.stringify(params.pushKeys)]
    );
    return result.rows[0]!.id;
  }

  async unsubscribe(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM notification_subscriptions WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async dispatchPending(): Promise<{ sent: number; failed: number; cleaned: number }> {
    if (!this.vapidConfigured) return { sent: 0, failed: 0, cleaned: 0 };

    const pending = await this.db.query<PendingNotification>(`
      SELECT ns.id, ns.event_id, ns.minutes_before, ns.push_endpoint,
             ns.push_keys, e.title, e.subtitle, e.starts_at,
             s.name as sport_name, s.category as sport_category
      FROM notification_subscriptions ns
      JOIN events e ON ns.event_id = e.id
      JOIN sports s ON e.sport_id = s.id
      WHERE ns.sent_at IS NULL
        AND e.starts_at <= NOW() + (ns.minutes_before || ' minutes')::interval
        AND e.starts_at > NOW()
        AND e.status != 'cancelled'
    `);

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    for (const notif of pending.rows) {
      try {
        const emoji = SPORT_EMOJI[notif.sport_category] ?? '📅';
        const payload = JSON.stringify({
          title: `${emoji} ${notif.sport_name} comeca em ${notif.minutes_before}min!`,
          body: `${notif.title}${notif.subtitle ? ` — ${notif.subtitle}` : ''}`,
          icon: '/icons/icon-192.png',
          data: { eventId: notif.event_id, url: `/events/${notif.event_id}` }
        });

        await webpush.sendNotification(
          { endpoint: notif.push_endpoint, keys: notif.push_keys },
          payload
        );

        await this.db.query(
          'UPDATE notification_subscriptions SET sent_at = NOW() WHERE id = $1',
          [notif.id]
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await this.db.query(
            'DELETE FROM notification_subscriptions WHERE id = $1',
            [notif.id]
          );
          cleaned++;
        } else {
          console.error(`[notifications] failed to send ${notif.id}:`, err);
          failed++;
        }
      }
    }

    return { sent, failed, cleaned };
  }
}
