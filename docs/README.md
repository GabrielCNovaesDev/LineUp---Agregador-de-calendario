# Sports Calendar — Documento Principal

> **Versão:** 1.0  
> **Stack:** Node.js · TypeScript · PostgreSQL · Redis · React · PWA · Docker  
> **Duração estimada:** 8 semanas (4 sprints de 2 semanas)

---

## 1. Visão Geral do Projeto

O **Sports Calendar** é um agregador universal de calendários esportivos, projetado para fãs de esportes de nicho que não têm uma fonte única e confiável de horários de eventos. O produto resolve um problema simples mas frustrante: quem quer acompanhar múltiplas categorias de um esporte (ex: F1, WEC, MotoGP, Endurance) precisa abrir vários sites diferentes para montar sua própria agenda.

O sistema coleta automaticamente os calendários de múltiplas APIs esportivas, normaliza os dados em um formato único, e apresenta tudo em uma interface limpa com filtros por esporte e categoria — com suporte a notificações e exportação para Google Calendar.

### Problema que resolve

Fãs de esportes de nicho (motorsport, MMA, tênis) não têm uma visão unificada dos eventos que querem acompanhar. As soluções existentes são ou genéricas demais (focam em futebol) ou específicas demais (apenas F1, apenas UFC). Quem quer acompanhar WEC + Porsche Cup + MotoGP precisa de três apps diferentes.

### Solução

Um único calendário que agrega dados de múltiplas APIs esportivas oficiais, atualizado automaticamente via cron jobs, com exportação para iCal e notificações push configuráveis por evento.

### Foco do MVP

O MVP foca em **motorsport** como categoria principal (F1, WEC, MotoGP) por ser o nicho com melhores APIs gratuitas disponíveis e um público engajado. A arquitetura é construída para escalar facilmente para outros esportes (UFC, tênis) nas versões seguintes.

---

## 2. Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    PWA / App Mobile (React)                   │
│         Calendário · Filtros · Notificações · Export iCal    │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP / REST
┌─────────────────────────▼────────────────────────────────────┐
│                      API (Express)                            │
│           /events · /sports · /notifications · /export       │
└──────┬──────────────────┬───────────────────────────────────-┘
       │                  │
┌──────▼──────┐   ┌───────▼────────────────────────────────────┐
│  PostgreSQL │   │              Scheduler (node-cron)          │
│  (eventos,  │   │                                             │
│  usuários,  │   │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  prefs,     │   │  │ OpenF1   │ │TheSports │ │ API-Sports │  │
│  notif.)    │   │  │ (F1)     │ │DB (WEC,  │ │ (UFC,      │  │
└──────┬──────┘   │  │          │ │ MotoGP)  │ │  Tênis)    │  │
       │          │  └──────────┘ └──────────┘ └────────────┘  │
┌──────▼──────┐   └────────────────────────────────────────────┘
│    Redis    │
│  (cache de  │
│  respostas  │
│  das APIs)  │
└─────────────┘
```

### Componentes principais

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | React + TypeScript + Tailwind + PWA | Calendário, filtros, notificações, export |
| API | Express + TypeScript | Endpoints REST, lógica de negócio |
| Scheduler | node-cron | Jobs de coleta periódica por fonte |
| Adaptadores | Módulos por fonte | Normalização de dados de cada API |
| Cache | Redis | Cache de respostas das APIs externas |
| Banco | PostgreSQL | Eventos, usuários, preferências, notificações |

---

## 3. Fontes de Dados

### 3.1 OpenF1 (Fórmula 1)

- **URL:** `https://api.openf1.org/v1/`
- **Auth:** Nenhuma (API pública e gratuita)
- **Endpoints usados:**
  - `GET /sessions` — sessões de treino, qualificação e corrida
  - `GET /meetings` — etapas do calendário (Grand Prix)
- **Frequência de atualização:** a cada 6 horas
- **Limitações:** dados históricos ricos, dados futuros às vezes incompletos no início da temporada

### 3.2 TheSportsDB

- **URL:** `https://www.thesportsdb.com/api/v1/json/{API_KEY}/`
- **Auth:** API Key (tier gratuito disponível para desenvolvimento)
- **Endpoints usados:**
  - `GET /eventsseason.php?id={league_id}&s={season}` — eventos da temporada
  - `GET /searchleagues.php?c={country}&s={sport}` — buscar ID de liga
- **Ligas mapeadas:**
  - WEC (World Endurance Championship) — id: 4370
  - MotoGP — id: 4497
  - Superbike — id: 4430
- **Frequência de atualização:** a cada 12 horas
- **Limitações:** tier gratuito tem rate limit de 100 req/dia

### 3.3 API-Sports

- **URL:** `https://v3.football.api-sports.io/` (domínio base — cada esporte tem subdomínio)
  - MMA/UFC: `https://v1.mma.api-sports.io/`
  - Tênis: `https://v1.tennis.api-sports.io/`
- **Auth:** API Key no header `x-apisports-key`
- **Tier gratuito:** 100 requisições/dia
- **Frequência de atualização:** a cada 24 horas
- **Uso no MVP:** reservado para v1.1 (UFC e Tênis)

### 3.4 Estratégia geral de coleta

```
Para cada fonte de dados:
  1. Verificar se cache Redis ainda é válido (TTL por fonte)
  2. Se válido: retornar do cache
  3. Se expirado: chamar a API externa
  4. Normalizar os dados para o schema interno
  5. Salvar/atualizar no PostgreSQL
  6. Atualizar o cache Redis
  7. Registrar execução no log de jobs
```

---

## 4. Modelo de Dados

### Tabelas principais (PostgreSQL)

```sql
-- Esportes e categorias
sports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,   -- 'f1', 'wec', 'motogp', 'ufc'
  name        TEXT NOT NULL,          -- 'Fórmula 1', 'WEC', 'MotoGP'
  category    TEXT NOT NULL,          -- 'motorsport', 'mma', 'tennis'
  icon_url    TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)

-- Temporadas por esporte
seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id    UUID REFERENCES sports(id),
  year        INTEGER NOT NULL,
  is_current  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sport_id, year)
)

-- Eventos (corridas, etapas, lutas, partidas)
events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id        UUID REFERENCES sports(id),
  season_id       UUID REFERENCES seasons(id),
  
  -- Identificação
  external_id     TEXT NOT NULL,           -- ID na API de origem
  source          TEXT NOT NULL,           -- 'openf1' | 'thesportsdb' | 'apisports'
  
  -- Dados do evento
  title           TEXT NOT NULL,           -- 'Grande Prêmio do Brasil'
  subtitle        TEXT,                    -- 'Corrida Principal' (para sessões dentro de um evento)
  venue           TEXT,                    -- 'Autódromo José Carlos Pace'
  country         TEXT,
  round_number    INTEGER,                 -- posição no calendário da temporada
  
  -- Tempo (sempre em UTC)
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,             -- nem sempre disponível
  duration_minutes INTEGER,
  
  -- Status
  status          TEXT DEFAULT 'scheduled', -- 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed'
  
  -- Metadados
  raw_data        JSONB,                   -- resposta original da API (para debug)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source, external_id)              -- evitar duplicatas entre syncs
)

-- Usuários (auth simplificada via e-mail magic link)
users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  timezone    TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_seen   TIMESTAMPTZ
)

-- Preferências de esportes por usuário
user_sport_preferences (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  sport_id    UUID REFERENCES sports(id),
  PRIMARY KEY (user_id, sport_id)
)

-- Notificações configuradas
notification_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  minutes_before  INTEGER NOT NULL DEFAULT 30,  -- avisar X min antes
  push_endpoint   TEXT,                          -- Web Push endpoint
  push_keys       JSONB,                         -- p256dh e auth keys
  sent_at         TIMESTAMPTZ,                   -- null = ainda não enviada
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id, minutes_before)
)

-- Log de execução dos jobs de coleta
sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          TEXT NOT NULL,
  sport_slug      TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ,
  events_upserted INTEGER DEFAULT 0,
  events_skipped  INTEGER DEFAULT 0,
  error           TEXT,                          -- null = sucesso
  status          TEXT DEFAULT 'running'         -- 'running' | 'success' | 'failed'
)
```

### Índices importantes

```sql
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_sport_id ON events(sport_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_source_external ON events(source, external_id);
CREATE INDEX idx_notif_subs_user ON notification_subscriptions(user_id);
CREATE INDEX idx_notif_subs_unsent ON notification_subscriptions(sent_at) WHERE sent_at IS NULL;
```

---

## 5. Normalização de Dados

Cada fonte de dados tem seu próprio formato. O processo de normalização converte todos os formatos para o schema interno.

### Interface do Adaptador

```typescript
// packages/adapters/src/types.ts
export interface SportAdapter {
  readonly sourceId: string;          // 'openf1' | 'thesportsdb' | 'apisports'
  readonly sportSlug: string;         // 'f1' | 'wec' | 'motogp'
  
  fetchEvents(season: number): Promise<NormalizedEvent[]>;
}

export interface NormalizedEvent {
  externalId: string;
  source: string;
  sportSlug: string;
  title: string;
  subtitle?: string;
  venue?: string;
  country?: string;
  roundNumber?: number;
  startsAt: Date;        // sempre UTC
  endsAt?: Date;
  durationMinutes?: number;
  status: EventStatus;
  rawData: unknown;      // resposta original preservada
}

export type EventStatus = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';
```

### Regras de normalização por campo

| Campo | Regra |
|---|---|
| `startsAt` | Sempre converter para UTC. Usar `dayjs.utc()`. Se a fonte não informar fuso, assumir UTC e logar warning |
| `title` | Usar nome do evento/etapa, não abreviações. Ex: "Grande Prêmio da Austrália", não "AUS GP" |
| `status` | Mapear strings da API para o enum interno. Ignorar status desconhecidos com warning |
| `externalId` | Sempre prefixar com a fonte: `openf1:{id}`, `thesportsdb:{id}` |
| `durationMinutes` | Se `endsAt` disponível: calcular. Se não: usar duração padrão por tipo de evento |

---

## 6. API REST

### Endpoints principais

```
GET  /api/sports                    → lista todos os esportes ativos
GET  /api/events                    → lista eventos com filtros
GET  /api/events/:id                → detalhe de um evento
GET  /api/events/export/ical        → export iCal dos eventos filtrados
POST /api/users                     → criar/autenticar usuário (magic link)
GET  /api/users/me/preferences      → preferências do usuário autenticado
PUT  /api/users/me/preferences      → atualizar esportes favoritos e fuso
POST /api/notifications/subscribe   → inscrever em notificação de um evento
DELETE /api/notifications/:id       → cancelar inscrição
GET  /api/admin/sync-log            → log dos jobs de coleta (interno)
POST /api/admin/sync/:sportSlug     → disparar sync manual (interno)
```

### Parâmetros do endpoint de eventos

```
GET /api/events
  ?sports=f1,wec,motogp     → filtrar por slug de esporte (separados por vírgula)
  &from=2025-05-01          → data inicial (ISO 8601, UTC)
  &to=2025-05-31            → data final (ISO 8601, UTC)
  &status=scheduled         → filtrar por status
  &page=1                   → paginação
  &limit=50                 → itens por página (máx 100)
```

### Resposta padrão de evento

```json
{
  "id": "uuid",
  "sport": { "slug": "f1", "name": "Fórmula 1", "category": "motorsport" },
  "title": "Grande Prêmio da Austrália",
  "subtitle": "Corrida",
  "venue": "Albert Park Circuit",
  "country": "Austrália",
  "roundNumber": 3,
  "startsAt": "2025-03-16T05:00:00Z",
  "endsAt": "2025-03-16T07:00:00Z",
  "durationMinutes": 120,
  "status": "scheduled",
  "localTime": "2025-03-16T02:00:00-03:00"  // calculado com base no timezone do usuário
}
```

---

## 7. Export iCal

O endpoint `GET /api/events/export/ical` gera um arquivo `.ics` compatível com Google Calendar, Apple Calendar e Outlook.

### Exemplo de evento iCal gerado

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sports Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Sports Calendar - F1 + WEC
X-WR-TIMEZONE:America/Sao_Paulo

BEGIN:VEVENT
UID:f1-gp-australia-2025@sportscalendar.app
DTSTART:20250316T050000Z
DTEND:20250316T070000Z
SUMMARY:🏎 GP Austrália — Corrida (F1)
DESCRIPTION:Fórmula 1 · Round 3 · Albert Park Circuit\nAustrália
LOCATION:Albert Park Circuit, Melbourne, Austrália
STATUS:CONFIRMED
END:VEVENT

END:VCALENDAR
```

### Regras do iCal

- `UID` é determinístico: `{sportSlug}-{externalId}@sportscalendar.app` — garante que reimportar não cria duplicatas
- `DTSTART` e `DTEND` sempre em UTC
- `SUMMARY` inclui emoji por categoria: 🏎 motorsport, 🥊 MMA, 🎾 tênis
- Eventos sem `endsAt` usam `DTEND = DTSTART + duração padrão por esporte`

---

## 8. Notificações Push (Web Push)

O sistema usa a **Web Push API** (padrão VAPID) para enviar notificações sem app nativo.

### Fluxo de inscrição

```
1. Usuário clica "Notificar X min antes" em um evento
2. Browser pede permissão de notificação
3. Frontend chama ServiceWorker.pushManager.subscribe()
4. Frontend envia { endpoint, keys } para POST /api/notifications/subscribe
5. Backend salva na tabela notification_subscriptions
```

### Disparo de notificações (cron job)

```
A cada 5 minutos:
  1. Buscar notificações não enviadas cujo evento começa em <= minutes_before minutos
  2. Para cada notificação: chamar Web Push API com o endpoint salvo
  3. Marcar sent_at = NOW()
  4. Se endpoint inválido (410 Gone): deletar a inscrição
```

### Payload da notificação push

```json
{
  "title": "🏎 F1 começa em 30 minutos!",
  "body": "Grande Prêmio da Austrália — Corrida · Albert Park Circuit",
  "icon": "/icons/f1-192.png",
  "data": { "eventId": "uuid", "url": "/events/uuid" }
}
```

---

## 9. PWA (Progressive Web App)

O frontend é uma PWA para ter experiência próxima de app nativo sem passar pela app store.

### Requisitos PWA

- `manifest.json` com ícones em múltiplos tamanhos (72, 96, 128, 144, 152, 192, 384, 512px)
- Service Worker para:
  - Cache offline das páginas principais
  - Recepção de notificações push em background
- `meta theme-color` para personalização da barra do browser
- Tela de splash e ícone para "Add to Home Screen"

### Modo offline

Quando sem conexão:
- Calendário mostra eventos já carregados (cache do Service Worker)
- Banner "Você está offline — dados podem estar desatualizados"
- Ações que requerem internet (inscrever em notificação) são desabilitadas com tooltip explicativo

---

## 10. Estrutura de Pastas

```
sports-calendar/
├── apps/
│   ├── api/                        # Express API
│   │   ├── src/
│   │   │   ├── routes/             # endpoints REST
│   │   │   ├── middleware/         # auth, rate limit, error handling
│   │   │   ├── scheduler/          # cron jobs de coleta
│   │   │   └── index.ts
│   │   └── package.json
│   └── web/                        # React PWA
│       ├── public/
│       │   ├── manifest.json
│       │   └── sw.js               # Service Worker
│       ├── src/
│       │   ├── pages/              # Calendar, EventDetail, Settings
│       │   ├── components/         # EventCard, SportFilter, CalendarGrid
│       │   └── lib/                # api client, push, ical
│       └── package.json
├── packages/
│   ├── adapters/                   # Adaptadores por fonte de dados
│   │   ├── src/
│   │   │   ├── openf1/
│   │   │   ├── thesportsdb/
│   │   │   └── types.ts
│   │   └── package.json
│   └── shared/                     # Types e utils compartilhados
│       ├── src/
│       │   ├── types/
│       │   └── utils/date.ts       # helpers de fuso horário (dayjs)
│       └── package.json
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── migrations/
├── docs/
│   ├── README.md                   # Este arquivo
│   ├── sprint-1.md
│   ├── sprint-2.md
│   ├── sprint-3.md
│   └── sprint-4.md
└── package.json
```

---

## 11. Variáveis de Ambiente

```env
# Banco
DATABASE_URL=postgresql://user:pass@localhost:5432/sportscalendar

# Redis
REDIS_URL=redis://localhost:6379

# APIs externas
THESPORTSDB_API_KEY=
APISPORTS_KEY=
# OpenF1 não precisa de key

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contato@sportscalendar.app

# Auth (magic link via e-mail)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAGIC_LINK_SECRET=

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 12. Decisões Técnicas e Justificativas

| Decisão | Alternativa considerada | Justificativa |
|---|---|---|
| APIs oficiais em vez de scraping | Web scraping com Playwright | Scraping quebra silenciosamente; APIs são estáveis e confiáveis |
| PWA em vez de React Native | React Native / Expo | Dev já conhece React; PWA é mais rápido de MVP; notificações push funcionam bem |
| node-cron em vez de BullMQ | BullMQ, AWS EventBridge | Jobs simples de coleta não precisam de fila complexa; node-cron é suficiente |
| dayjs em vez de date-fns | date-fns, Luxon | Melhor suporte a fuso horário com plugin timezone; API mais simples |
| Magic link em vez de OAuth | Google OAuth, senha | Menor atrito no onboarding; sem dependência de provedor externo |
| Upsert com UNIQUE(source, external_id) | Lógica manual de deduplicação | Simples, confiável e atômico — banco garante sem código adicional |

---

## 13. Referências

- [OpenF1 API Docs](https://openf1.org/#introduction)
- [TheSportsDB API](https://www.thesportsdb.com/api.php)
- [API-Sports Docs](https://www.api-football.com/documentation-v3)
- [Web Push Protocol (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [iCalendar RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545)
- [dayjs timezone plugin](https://day.js.org/docs/en/plugin/timezone)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

---

*Documentação gerada para uso como contexto de agentes de IA. Atualizar sempre que decisões de arquitetura ou fontes de dados forem alteradas.*
