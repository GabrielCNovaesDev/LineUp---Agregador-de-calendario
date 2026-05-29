CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  channel VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'tv' CHECK (type IN ('tv', 'streaming', 'ppv')),
  country VARCHAR(10) NOT NULL DEFAULT 'BR',
  logo_url TEXT,
  source VARCHAR(100) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, channel, country)
);

CREATE INDEX idx_broadcasts_event_id ON broadcasts(event_id);
CREATE INDEX idx_broadcasts_fetched_at ON broadcasts(fetched_at);
