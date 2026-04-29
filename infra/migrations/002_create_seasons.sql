-- migration: 002_create_seasons
-- Temporadas anuais por esporte. Permite associar eventos a uma temporada específica
-- e marcar a temporada vigente para queries default ("temporada atual").

CREATE TABLE IF NOT EXISTS seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id    UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_id, year)
);
