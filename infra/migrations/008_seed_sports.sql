-- migration: 008_seed_sports
-- Seed inicial com os esportes do MVP (motorsport: F1, WEC, MotoGP).
-- Idempotente: ON CONFLICT (slug) DO NOTHING permite reaplicar sem erro.

INSERT INTO sports (slug, name, category) VALUES
  ('f1',     'Fórmula 1', 'motorsport'),
  ('wec',    'WEC',       'motorsport'),
  ('motogp', 'MotoGP',    'motorsport')
ON CONFLICT (slug) DO NOTHING;
