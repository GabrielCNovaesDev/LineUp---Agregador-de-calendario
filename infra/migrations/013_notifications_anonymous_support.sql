-- migration: 013_notifications_anonymous_support
-- For the MVP (no auth), notifications use a fixed anonymous user.
-- Also add a unique index on (push_endpoint, event_id, minutes_before) to prevent
-- duplicate subscriptions from the same browser.

INSERT INTO users (id, email, timezone)
VALUES ('00000000-0000-0000-0000-000000000000', 'anonymous@lineup.app', 'UTC')
ON CONFLICT (id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_subs_endpoint_event
  ON notification_subscriptions (push_endpoint, event_id, minutes_before)
  WHERE push_endpoint IS NOT NULL;
