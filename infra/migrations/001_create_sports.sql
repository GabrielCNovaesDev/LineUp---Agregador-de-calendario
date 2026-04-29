-- migration: 001_create_sports
-- Catálogo de esportes suportados pelo agregador (F1, WEC, MotoGP no MVP).
-- Categoria agrupa esportes afins ('motorsport', 'mma', 'tennis') para filtros e ícones na UI.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  icon_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
