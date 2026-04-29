-- migration: 006_create_notification_subscriptions
-- Inscrições de Web Push (padrão VAPID) para avisar o usuário antes de um evento.
-- push_endpoint é a URL única gerada pelo browser; push_keys guarda { p256dh, auth }.
-- O índice parcial em sent_at acelera o cron job que envia notificações pendentes.

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  minutes_before  INTEGER NOT NULL DEFAULT 30,
  push_endpoint   TEXT,
  push_keys       JSONB,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id, minutes_before)
);

CREATE INDEX IF NOT EXISTS idx_notif_subs_user    ON notification_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_subs_unsent  ON notification_subscriptions (sent_at) WHERE sent_at IS NULL;
