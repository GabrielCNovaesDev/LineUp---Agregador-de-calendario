-- migration: 009_deactivate_non_mvp_sports
-- MVP scope reduced to F1: TheSportsDB free tier doesn't expose WEC/MotoGP
-- leagues, so the scheduler stopped syncing them. Flag the rows as inactive
-- so cached events are excluded from default queries; rows are preserved to
-- keep FK references valid and to make re-enabling trivial later.

UPDATE sports SET is_active = FALSE WHERE slug IN ('wec', 'motogp');
