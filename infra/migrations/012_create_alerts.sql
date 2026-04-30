-- migration: 012_create_alerts
-- Persistent alerts emitted by the system when it detects suspicious states
-- the cron alone can't fix (e.g. 3 consecutive successful syncs that produced
-- zero events — likely a silent adapter regression). One row per detection;
-- subsequent detections of the same kind on the same sport reuse the open row
-- via UNIQUE (sport_slug, kind) WHERE resolved_at IS NULL.

CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_slug   TEXT NOT NULL,
  kind         TEXT NOT NULL,
  message      TEXT NOT NULL,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_active_unique
  ON alerts (sport_slug, kind)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_detected_at
  ON alerts (detected_at DESC);
