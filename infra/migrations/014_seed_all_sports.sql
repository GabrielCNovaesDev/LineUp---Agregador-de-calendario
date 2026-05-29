-- migration: 014_seed_all_sports
-- Expansão do catálogo: 51 competições em 17 modalidades.
-- Idempotente: ON CONFLICT (slug) DO NOTHING preserva os 3 esportes já existentes (f1, motogp, wec).

-- football (8)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'brasileirao-a',    'Brasileirão Série A',    'football', TRUE, NOW()),
  (gen_random_uuid(), 'brasileirao-b',    'Brasileirão Série B',    'football', TRUE, NOW()),
  (gen_random_uuid(), 'champions-league', 'UEFA Champions League',  'football', TRUE, NOW()),
  (gen_random_uuid(), 'premier-league',   'Premier League',         'football', TRUE, NOW()),
  (gen_random_uuid(), 'la-liga',          'La Liga',                'football', TRUE, NOW()),
  (gen_random_uuid(), 'copa-do-brasil',   'Copa do Brasil',         'football', TRUE, NOW()),
  (gen_random_uuid(), 'libertadores',     'Copa Libertadores',      'football', TRUE, NOW()),
  (gen_random_uuid(), 'copa-america',     'Copa América',           'football', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- motorsport (3 novos — f1, motogp, wec já existem)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'f1',         'Fórmula 1',                    'motorsport', TRUE, NOW()),
  (gen_random_uuid(), 'motogp',     'MotoGP',                       'motorsport', TRUE, NOW()),
  (gen_random_uuid(), 'wec',        'World Endurance Championship',  'motorsport', TRUE, NOW()),
  (gen_random_uuid(), 'formula-e',  'Fórmula E',                    'motorsport', TRUE, NOW()),
  (gen_random_uuid(), 'indycar',    'IndyCar Series',               'motorsport', TRUE, NOW()),
  (gen_random_uuid(), 'stock-car',  'Stock Car Pro Series',         'motorsport', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- mma (3)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'ufc',      'UFC',           'mma', TRUE, NOW()),
  (gen_random_uuid(), 'bellator', 'Bellator MMA',  'mma', TRUE, NOW()),
  (gen_random_uuid(), 'pfl',      'PFL',           'mma', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- boxing (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'boxing-wbc', 'Boxing WBC', 'boxing', TRUE, NOW()),
  (gen_random_uuid(), 'boxing-wba', 'Boxing WBA', 'boxing', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- kickboxing (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'glory-kickboxing',      'GLORY Kickboxing',             'kickboxing', TRUE, NOW()),
  (gen_random_uuid(), 'one-championship-kb',   'ONE Championship Kickboxing',  'kickboxing', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- grappling (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'adcc',  'ADCC',  'grappling', TRUE, NOW()),
  (gen_random_uuid(), 'ibjjf', 'IBJJF', 'grappling', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- basketball (3)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'nba',        'NBA',        'basketball', TRUE, NOW()),
  (gen_random_uuid(), 'nbb',        'NBB',        'basketball', TRUE, NOW()),
  (gen_random_uuid(), 'euroleague', 'EuroLeague', 'basketball', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- tennis (3)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'atp-tour',   'ATP Tour',   'tennis', TRUE, NOW()),
  (gen_random_uuid(), 'wta-tour',   'WTA Tour',   'tennis', TRUE, NOW()),
  (gen_random_uuid(), 'grand-slam', 'Grand Slam', 'tennis', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- volleyball (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'superliga-volei', 'Superliga de Vôlei',      'volleyball', TRUE, NOW()),
  (gen_random_uuid(), 'vnl',             'Volleyball Nations League', 'volleyball', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- american-football (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'nfl',              'NFL',              'american-football', TRUE, NOW()),
  (gen_random_uuid(), 'college-football', 'College Football', 'american-football', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- cycling (3)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'tour-de-france',  'Tour de France',   'cycling', TRUE, NOW()),
  (gen_random_uuid(), 'giro-italia',     'Giro d''Italia',   'cycling', TRUE, NOW()),
  (gen_random_uuid(), 'vuelta-espana',   'Vuelta a España',  'cycling', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- rugby (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'six-nations',      'Six Nations',      'rugby', TRUE, NOW()),
  (gen_random_uuid(), 'rugby-world-cup',  'Rugby World Cup',  'rugby', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- esports (3)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'lol-worlds',          'LoL Worlds',          'esports', TRUE, NOW()),
  (gen_random_uuid(), 'cs2-major',           'CS2 Major',           'esports', TRUE, NOW()),
  (gen_random_uuid(), 'valorant-champions',  'Valorant Champions',  'esports', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- surfing (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'wsl-championship', 'WSL Championship Tour', 'surfing', TRUE, NOW()),
  (gen_random_uuid(), 'wsl-big-wave',     'WSL Big Wave',          'surfing', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- ice-hockey (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'nhl', 'NHL', 'ice-hockey', TRUE, NOW()),
  (gen_random_uuid(), 'khl', 'KHL', 'ice-hockey', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- golf (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'pga-tour', 'PGA Tour',    'golf', TRUE, NOW()),
  (gen_random_uuid(), 'masters',  'The Masters', 'golf', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

-- strength-sports (2)
INSERT INTO sports (id, slug, name, category, is_active, created_at) VALUES
  (gen_random_uuid(), 'crossfit-games',        'CrossFit Games',         'strength-sports', TRUE, NOW()),
  (gen_random_uuid(), 'worlds-strongest-man',  'World''s Strongest Man', 'strength-sports', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;
