-- migration: 005_create_user_sport_preferences
-- Esportes favoritos por usuário (relação N:N).
-- Usado para filtrar o calendário default e priorizar notificações.

CREATE TABLE IF NOT EXISTS user_sport_preferences (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id  UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, sport_id)
);
