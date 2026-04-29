-- migration: 004_create_users
-- Usuários do produto. Auth é via magic link por e-mail (sem senha).
-- O timezone é usado para converter horários UTC para o fuso local na apresentação.

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ
);
