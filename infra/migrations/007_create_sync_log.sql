-- migration: 007_create_sync_log
-- Histórico de execuções dos jobs de coleta (um registro por sync por fonte/esporte).
-- Permite diagnosticar falhas, medir frequência e contar eventos persistidos vs. ignorados.

CREATE TABLE IF NOT EXISTS sync_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL,
  sport_slug       TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  finished_at      TIMESTAMPTZ,
  events_upserted  INTEGER NOT NULL DEFAULT 0,
  events_skipped   INTEGER NOT NULL DEFAULT 0,
  error            TEXT,
  status           TEXT NOT NULL DEFAULT 'running'
);
