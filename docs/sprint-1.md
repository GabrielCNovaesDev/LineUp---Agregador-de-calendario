# Sprint 1 — Backend e Ingestão de Dados

> **Duração:** Semanas 1–2  
> **Objetivo:** Ter o banco de dados estruturado, os primeiros adaptadores funcionando e eventos reais de F1 e WEC sendo coletados e salvos automaticamente.  
> **Entregável ao final:** `GET /api/events?sports=f1` retorna eventos reais da temporada atual de Fórmula 1, vindos da OpenF1 API, salvos no PostgreSQL.

---

## Contexto para a IA

Esta é a sprint de fundação do produto. O trabalho aqui é invisível para o usuário final, mas tudo o que vem depois depende de dados corretos e bem estruturados.

O problema central desta sprint é o de **fuso horário**: APIs externas retornam datas em formatos e fusos diferentes — algumas em UTC, algumas no horário local do evento, algumas sem fuso algum. Se esse problema não for tratado na normalização, o calendário vai mostrar horários errados para usuários em Aracaju (UTC-3), e isso é o tipo de bug que destrói a credibilidade do produto.

Toda data deve ser armazenada em UTC no banco. A conversão para o horário local do usuário acontece apenas na camada de apresentação (frontend ou response da API).

---

## Tarefas

---

### TASK-1.1 — Definir schema do banco de dados
**Responsável:** Claude  
**Tipo:** Design

#### O que fazer

Revisar o schema definido no README principal (seção 4) e criar os arquivos de migration SQL.

**Passo 1 — Validar o schema:**

Antes de escrever as migrations, verificar:

- A tabela `events` tem todos os campos necessários para os casos de uso do MVP?
  - Export iCal precisa de: `title`, `starts_at`, `ends_at`, `venue`, `country` — todos presentes?
  - Notificações precisam de: `starts_at` — presente?
  - Filtros da API precisam de: `sport_id`, `starts_at`, `status` — todos indexados?

- A constraint `UNIQUE(source, external_id)` previne duplicatas entre syncs? Sim — confirmar que o upsert vai usar `ON CONFLICT (source, external_id) DO UPDATE`.

- A tabela `notification_subscriptions` tem todos os campos necessários para Web Push?
  - `push_endpoint` — URL única do browser do usuário
  - `push_keys` — JSON com `{ p256dh: string, auth: string }` — verificar se JSONB é o tipo correto (sim)

- O campo `raw_data JSONB` na tabela `events` é necessário? Sim — é crítico para debug quando uma API muda o formato sem aviso.

**Passo 2 — Criar as migrations:**

```
infra/migrations/
├── 001_create_sports.sql
├── 002_create_seasons.sql
├── 003_create_events.sql
├── 004_create_users.sql
├── 005_create_user_sport_preferences.sql
├── 006_create_notification_subscriptions.sql
└── 007_create_sync_log.sql
```

Cada arquivo deve:
- Ter `-- migration: NNN_nome` como primeira linha (para controle)
- Usar `CREATE TABLE IF NOT EXISTS` (idempotente)
- Incluir os índices definidos no README
- Ter um comentário explicando o propósito da tabela

**Passo 3 — Seed de dados iniciais:**

Criar `infra/migrations/008_seed_sports.sql` com os esportes do MVP:

```sql
INSERT INTO sports (slug, name, category) VALUES
  ('f1',     'Fórmula 1',                  'motorsport'),
  ('wec',    'WEC',                         'motorsport'),
  ('motogp', 'MotoGP',                      'motorsport')
ON CONFLICT (slug) DO NOTHING;
```

#### Definição de pronto
- Todas as migrations aplicadas sem erros em banco limpo
- `SELECT * FROM sports` retorna os 3 esportes do MVP
- Todos os índices criados (verificar com `\d events` no psql)
- Tentativa de inserir dois eventos com o mesmo `(source, external_id)` resulta em erro de constraint

---

### TASK-1.2 — Setup Node.js + PostgreSQL + Docker Compose
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Criar a estrutura completa do monorepo e o ambiente de desenvolvimento local.

**1. Monorepo com npm workspaces:**

```json
// package.json raiz
{
  "name": "sports-calendar",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "docker compose up -d postgres redis && npm run dev:api & npm run dev:web",
    "dev:api": "npm run dev --workspace=apps/api",
    "dev:web": "npm run dev --workspace=apps/web",
    "migrate": "node infra/migrate.js",
    "typecheck": "tsc --noEmit --project tsconfig.json",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "npm run test --workspaces"
  }
}
```

**2. Docker Compose de desenvolvimento:**

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sportscalendar
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

**3. Script de migration (`infra/migrate.js`):**

```javascript
// Script que aplica todas as migrations em ordem
// Lê arquivos de infra/migrations/ ordenados por nome
// Verifica quais já foram aplicadas (tabela schema_migrations)
// Aplica as pendentes em transação
```

**4. Setup da API (`apps/api`):**

- Express + TypeScript
- `ts-node-dev` para hot reload
- Middleware padrão: `cors`, `helmet`, `express.json()`
- Estrutura de rotas: `apps/api/src/routes/`
- Conexão com PostgreSQL via `pg` (node-postgres) com pool de conexões
- Conexão com Redis via `ioredis`

**5. Endpoint de health check:**

```typescript
GET /health
Response: {
  "status": "ok",
  "db": "connected" | "error",
  "redis": "connected" | "error",
  "version": "1.0.0"
}
```

#### Definição de pronto
- `npm run dev` sobe o ambiente completo sem erros
- `GET /health` retorna `{ status: "ok", db: "connected", redis: "connected" }`
- Migrations aplicadas automaticamente ao subir o ambiente
- `npm run typecheck` sem erros

---

### TASK-1.3 — Adaptador OpenF1 (Fórmula 1)
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Criar `packages/adapters/src/openf1/` com o adaptador para a API da F1.

**Endpoints da OpenF1 que serão usados:**

```
GET https://api.openf1.org/v1/sessions
  ?year=2025
  → Retorna todas as sessões (treinos, quali, sprint, corrida) da temporada

GET https://api.openf1.org/v1/meetings
  ?year=2025
  → Retorna os Grand Prix (etapas) com informações de localização
```

**Exemplo de resposta de `/sessions`:**
```json
[
  {
    "session_key": 9158,
    "session_name": "Race",
    "session_type": "Race",
    "meeting_key": 1229,
    "meeting_name": "Australian Grand Prix",
    "circuit_short_name": "Melbourne",
    "country_name": "Australia",
    "date_start": "2025-03-16T05:00:00+00:00",
    "date_end": "2025-03-16T07:00:00+00:00",
    "year": 2025
  }
]
```

**Implementação do adaptador:**

```typescript
// packages/adapters/src/openf1/index.ts
export class OpenF1Adapter implements SportAdapter {
  readonly sourceId = 'openf1';
  readonly sportSlug = 'f1';
  
  async fetchEvents(season: number): Promise<NormalizedEvent[]> {
    const [sessions, meetings] = await Promise.all([
      this.fetchSessions(season),
      this.fetchMeetings(season)
    ]);
    
    // Criar um Map de meeting_key → meeting para enriquecer as sessões
    const meetingMap = new Map(meetings.map(m => [m.meeting_key, m]));
    
    return sessions.map(session => this.normalize(session, meetingMap.get(session.meeting_key)));
  }
  
  private normalize(session: OpenF1Session, meeting?: OpenF1Meeting): NormalizedEvent {
    return {
      externalId: `openf1:${session.session_key}`,
      source: 'openf1',
      sportSlug: 'f1',
      title: session.meeting_name,           // 'Australian Grand Prix'
      subtitle: this.mapSessionName(session.session_name), // 'Corrida', 'Qualificação', etc.
      venue: meeting?.circuit_short_name,
      country: session.country_name,
      startsAt: new Date(session.date_start), // já está em UTC com offset
      endsAt: session.date_end ? new Date(session.date_end) : undefined,
      status: this.mapStatus(session),
      rawData: { session, meeting }
    };
  }
  
  private mapSessionName(name: string): string {
    const map: Record<string, string> = {
      'Race': 'Corrida',
      'Qualifying': 'Qualificação',
      'Sprint': 'Sprint',
      'Sprint Qualifying': 'Classificação Sprint',
      'Practice 1': 'Treino Livre 1',
      'Practice 2': 'Treino Livre 2',
      'Practice 3': 'Treino Livre 3',
    };
    return map[name] ?? name;
  }
}
```

**Tratamento de erros de rede:**

- Timeout de 10s por requisição
- Retry automático: 3 tentativas com backoff de 1s, 2s, 4s
- Se falhar após retries: lançar `AdapterFetchError` com detalhes da fonte

#### Definição de pronto
- `adapter.fetchEvents(2025)` retorna lista de eventos normalizados sem erro
- Todos os campos de `NormalizedEvent` estão preenchidos ou corretamente `undefined`
- Datas estão em UTC (verificar com `event.startsAt.toISOString()` — deve terminar em `Z`)
- `externalId` nunca é duplicado dentro do mesmo fetch
- Testes unitários com fixture da resposta da API (não chamar a API real nos testes)

---

### TASK-1.4 — Adaptador TheSportsDB (WEC e MotoGP)
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Criar `packages/adapters/src/thesportsdb/` com o adaptador para WEC e MotoGP.

**Endpoint da TheSportsDB:**

```
GET https://www.thesportsdb.com/api/v1/json/{API_KEY}/eventsseason.php
  ?id={league_id}&s={season}

League IDs:
  WEC:      4370
  MotoGP:   4497
```

**Exemplo de resposta:**
```json
{
  "events": [
    {
      "idEvent": "1234567",
      "strEvent": "2025 WEC Round 1 - 1000 Miles of Sebring",
      "strVenue": "Sebring International Raceway",
      "strCountry": "United States",
      "dateEvent": "2025-03-15",
      "strTime": "15:00:00",
      "strTimestamp": "2025-03-15T15:00:00+00:00",
      "strStatus": "Not Started",
      "intRound": "1"
    }
  ]
}
```

**Atenção especial — fusos horários:**

A TheSportsDB às vezes retorna `strTime` sem offset e `strTimestamp` inconsistente. Regra de normalização:
1. Preferir `strTimestamp` se presente e tiver offset
2. Se `strTimestamp` não tiver offset: combinar `dateEvent` + `strTime` e assumir UTC
3. Logar warning quando assumir UTC sem confirmar

**Implementação:**

```typescript
export class TheSportsDBAdapter implements SportAdapter {
  private readonly LEAGUE_IDS: Record<string, number> = {
    'wec': 4370,
    'motogp': 4497
  };
  
  constructor(
    readonly sportSlug: string,
    private apiKey: string
  ) {
    this.sourceId = 'thesportsdb';
  }
  
  async fetchEvents(season: number): Promise<NormalizedEvent[]> {
    const leagueId = this.LEAGUE_IDS[this.sportSlug];
    if (!leagueId) throw new Error(`No league ID for sport: ${this.sportSlug}`);
    
    const url = `https://www.thesportsdb.com/api/v1/json/${this.apiKey}/eventsseason.php?id=${leagueId}&s=${season}`;
    const data = await this.fetch(url);
    
    return (data.events ?? []).map(event => this.normalize(event));
  }
  
  private normalize(event: TheSportsDBEvent): NormalizedEvent {
    const startsAt = this.parseDate(event);
    // ...
  }
  
  private parseDate(event: TheSportsDBEvent): Date {
    if (event.strTimestamp && event.strTimestamp.includes('+')) {
      return new Date(event.strTimestamp);
    }
    // fallback: assumir UTC e logar warning
    logger.warn({ eventId: event.idEvent }, 'TheSportsDB: data sem fuso, assumindo UTC');
    return new Date(`${event.dateEvent}T${event.strTime ?? '00:00:00'}Z`);
  }
  
  private mapStatus(status: string): EventStatus {
    const map: Record<string, EventStatus> = {
      'Not Started': 'scheduled',
      'In Progress': 'live',
      'Match Finished': 'completed',
      'Postponed': 'postponed',
      'Cancelled': 'cancelled',
    };
    return map[status] ?? 'scheduled';
  }
}
```

#### Definição de pronto
- `adapter.fetchEvents(2025)` retorna eventos de WEC sem erro
- `adapter.fetchEvents(2025)` retorna eventos de MotoGP sem erro
- Todas as datas estão em UTC
- Status corretamente mapeado para o enum interno
- Rate limit respeitado: máximo 1 requisição por segundo (throttle com `p-throttle`)
- Testes unitários com fixtures da API

---

### TASK-1.5 — Normalização e validação dos dados
**Responsável:** Ambos  
**Tipo:** Implementação + revisão

#### Parte Codex — Implementar o serviço de upsert

Criar `apps/api/src/services/events.service.ts` com a lógica de persistência:

```typescript
export class EventsService {
  
  // Salva ou atualiza eventos no banco
  // Usa ON CONFLICT (source, external_id) DO UPDATE
  async upsertEvents(events: NormalizedEvent[]): Promise<UpsertResult> {
    const results = { upserted: 0, skipped: 0, errors: [] };
    
    for (const event of events) {
      try {
        const sportId = await this.getSportId(event.sportSlug);
        if (!sportId) {
          results.skipped++;
          continue;
        }
        
        await this.db.query(`
          INSERT INTO events (
            sport_id, external_id, source, title, subtitle,
            venue, country, round_number,
            starts_at, ends_at, duration_minutes, status, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (source, external_id) DO UPDATE SET
            title          = EXCLUDED.title,
            subtitle       = EXCLUDED.subtitle,
            venue          = EXCLUDED.venue,
            starts_at      = EXCLUDED.starts_at,
            ends_at        = EXCLUDED.ends_at,
            status         = EXCLUDED.status,
            raw_data       = EXCLUDED.raw_data,
            updated_at     = NOW()
          WHERE events.updated_at < NOW() - INTERVAL '1 hour'
          -- Só atualiza se a última atualização foi há mais de 1 hora
          -- Evita writes desnecessários em syncs frequentes
        `, [...]);
        
        results.upserted++;
      } catch (err) {
        results.errors.push({ event, error: err.message });
      }
    }
    
    return results;
  }
}
```

**Validações obrigatórias antes do upsert:**

```typescript
function validateNormalizedEvent(event: NormalizedEvent): ValidationResult {
  const errors: string[] = [];
  
  if (!event.externalId) errors.push('externalId é obrigatório');
  if (!event.title || event.title.trim().length === 0) errors.push('title é obrigatório');
  if (!event.startsAt || isNaN(event.startsAt.getTime())) errors.push('startsAt inválido');
  if (event.endsAt && event.endsAt <= event.startsAt) errors.push('endsAt deve ser após startsAt');
  if (event.startsAt.getFullYear() < 2020) errors.push('startsAt parece incorreto — ano < 2020');
  
  return { valid: errors.length === 0, errors };
}
```

#### Parte Claude — Revisar os casos de borda de normalização

Analisar os seguintes cenários e documentar o comportamento esperado em `docs/normalization-rules.md`:

1. **Evento sem `endsAt`:** como calcular duração padrão por tipo de esporte?
   - Corrida F1: 120 min
   - Qualificação F1: 60 min
   - Treino livre: 60 min
   - Corrida WEC 24h: 1440 min (24h)
   - Corrida WEC 6h: 360 min
   - Como detectar o tipo a partir do `subtitle`?

2. **Evento duplicado entre fontes:** se o mesmo Grand Prix aparece na OpenF1 e na TheSportsDB, eles viram dois registros diferentes ou são deduplicados?
   - Decisão: **dois registros** — `source` diferente = `external_id` diferente = sem conflito
   - Isso significa que o frontend deve agrupar por `(title, starts_at)` para evitar duplicatas visuais
   - Documentar essa decisão com exemplos

3. **Evento com data no passado:** devemos sincronizá-lo? Sim — histórico é valioso para futura feature de "resultados".

4. **Evento com status `cancelled`:** deve aparecer no calendário? Sim, com visual diferenciado (riscado).

5. **API retorna `null` para campo obrigatório:** o validador deve rejeitar ou usar fallback?
   - `title = null` → rejeitar (logar erro, não salvar)
   - `venue = null` → aceitar (campo opcional)
   - `starts_at = null` → rejeitar

#### Definição de pronto
- `eventsService.upsertEvents([...])` salva eventos no banco sem erros
- Rodar o upsert duas vezes com os mesmos dados não cria duplicatas
- Eventos com dados inválidos são rejeitados e logados, sem quebrar o batch inteiro
- Documento `docs/normalization-rules.md` criado com todos os casos de borda documentados

---

## Checklist de Conclusão da Sprint

- [ ] Migrations aplicadas e banco com schema correto
- [ ] `GET /health` retorna status de db e redis
- [ ] `GET /api/events?sports=f1` retorna eventos reais da temporada 2025
- [ ] `GET /api/events?sports=wec` retorna eventos reais do WEC 2025
- [ ] `GET /api/events?sports=motogp` retorna eventos reais do MotoGP 2025
- [ ] Todas as datas retornadas estão em UTC (campo `startsAt`)
- [ ] Upsert não cria duplicatas em syncs repetidos
- [ ] Eventos inválidos são rejeitados sem quebrar o batch
- [ ] `npm run typecheck` sem erros
- [ ] Documento `docs/normalization-rules.md` criado

---

## Dependências e Bloqueios

- **TASK-1.1 deve ser concluída antes de TASK-1.5** — upsert depende do schema estar no banco
- **TASK-1.2 deve estar pronto antes de TASK-1.3 e TASK-1.4** — adaptadores dependem do ambiente rodando
- **TASK-1.3 e TASK-1.4 podem ser feitas em paralelo**
- **TASK-1.5 (Codex) pode começar após TASK-1.1 e TASK-1.2 concluídas**, independente dos adaptadores

---

## Notas Técnicas

- Usar **dayjs** com plugins `utc` e `timezone` para toda manipulação de datas — nunca `Date` nativo para parsing de strings com offset
- Usar **pg** (node-postgres) diretamente — não usar ORM nesta sprint, queries SQL cruas são mais claras para trabalhar com upsert e JSON
- O campo `raw_data` salva a resposta original **antes** da normalização — útil para reprocessar eventos quando o adaptador for atualizado
- Nunca logar o conteúdo completo de `raw_data` em produção — pode ser grande e poluir os logs
- A API gratuita da TheSportsDB tem limite de 100 req/dia — em desenvolvimento, usar fixtures locais ao invés de chamar a API real nos testes
