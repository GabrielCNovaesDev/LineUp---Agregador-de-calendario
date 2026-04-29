-- migration: 003_create_events
-- Eventos esportivos normalizados (corridas, etapas, sessões, lutas, partidas).
-- Datas SEMPRE em UTC; conversão para fuso do usuário ocorre só na apresentação.
-- UNIQUE(source, external_id) garante idempotência de syncs via ON CONFLICT DO UPDATE.

CREATE TABLE IF NOT EXISTS events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id          UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  season_id         UUID REFERENCES seasons(id) ON DELETE SET NULL,

  external_id       TEXT NOT NULL,
  source            TEXT NOT NULL,

  title             TEXT NOT NULL,
  subtitle          TEXT,
  venue             TEXT,
  country           TEXT,
  round_number      INTEGER,

  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  duration_minutes  INTEGER,

  status            TEXT NOT NULL DEFAULT 'scheduled',

  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at        ON events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_sport_id         ON events (sport_id);
CREATE INDEX IF NOT EXISTS idx_events_status           ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_source_external  ON events (source, external_id);
