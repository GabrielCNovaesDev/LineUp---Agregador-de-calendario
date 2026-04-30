-- migration: 010_seed_future_sports
-- Reserva esportes planejados para v1.1 sem ativá-los no MVP.
-- Eles ficam ocultos das listagens padrão até que os adapters sejam concluídos.

INSERT INTO sports (slug, name, category, is_active) VALUES
  ('ufc',    'UFC',   'mma',    FALSE),
  ('tennis', 'Tênis', 'tennis', FALSE)
ON CONFLICT (slug) DO NOTHING;
