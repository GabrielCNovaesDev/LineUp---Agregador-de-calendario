-- migration: 011_reactivate_mvp_sports
-- A Sprint 2 voltou a agendar F1, WEC e MotoGP; os três devem aparecer na API pública.

UPDATE sports
SET is_active = TRUE
WHERE slug IN ('f1', 'wec', 'motogp');
