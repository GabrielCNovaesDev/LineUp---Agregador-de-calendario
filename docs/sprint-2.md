# Sprint 2 — Scheduler e Mais Fontes

> **Duração:** Semanas 3–4  
> **Objetivo:** Automatizar a coleta de dados com cron jobs, adicionar cache Redis, implementar a API REST completa de eventos e garantir que o sistema seja resiliente a falhas das APIs externas.  
> **Entregável ao final:** A API está completa, dados são atualizados automaticamente sem intervenção manual, e `GET /api/events` retorna eventos paginados com filtros funcionando.

---

## Contexto para a IA

Na Sprint 1 os adaptadores foram construídos e testados manualmente. Agora o sistema precisa rodar sozinho: cron jobs que acordam periodicamente, verificam o cache, buscam dados novos e os persistem — tudo sem ninguém apertar um botão.

O desafio central desta sprint é **resiliência**: o que acontece quando a API da TheSportsDB está fora? O sistema deve degradar graciosamente — servir dados do cache enquanto loga o erro — nunca quebrar completamente por causa de uma fonte externa.

---

## Tarefas

---

### TASK-2.1 — Sistema de cron jobs para atualização periódica
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Criar `apps/api/src/scheduler/` com os jobs de coleta periódica usando `node-cron`.

**Estrutura:**

```
apps/api/src/scheduler/
├── index.ts          # Registra e inicia todos os jobs
├── runner.ts         # Lógica de execução de um job individual (com log)
├── jobs/
│   ├── f1.job.ts
│   ├── wec.job.ts
│   └── motogp.job.ts
```

**Interface de um job:**

```typescript
// scheduler/runner.ts
export interface SyncJob {
  name: string;
  sportSlug: string;
  schedule: string;       // expressão cron
  adapter: SportAdapter;
}

export async function runJob(job: SyncJob, db: Pool, redis: Redis): Promise<void> {
  const logEntry = await createSyncLog(db, job.sportSlug, job.adapter.sourceId);
  
  try {
    logger.info({ job: job.name }, 'Iniciando sync');
    
    const currentSeason = getCurrentSeason();   // ano atual
    const events = await job.adapter.fetchEvents(currentSeason);
    
    const result = await upsertEvents(db, events);
    
    await updateSyncLog(db, logEntry.id, {
      status: 'success',
      eventsUpserted: result.upserted,
      eventsSkipped: result.skipped,
      finishedAt: new Date()
    });
    
    logger.info({ job: job.name, ...result }, 'Sync concluído');
    
  } catch (err) {
    await updateSyncLog(db, logEntry.id, {
      status: 'failed',
      error: err.message,
      finishedAt: new Date()
    });
    
    logger.error({ job: job.name, err }, 'Sync falhou');
    // NÃO relançar o erro — job falho não deve derrubar o processo
  }
}
```

**Frequências de sync por fonte:**

```typescript
// scheduler/index.ts
const jobs: SyncJob[] = [
  {
    name: 'F1 Sync',
    sportSlug: 'f1',
    schedule: '0 */6 * * *',    // a cada 6 horas
    adapter: new OpenF1Adapter()
  },
  {
    name: 'WEC Sync',
    sportSlug: 'wec',
    schedule: '0 */12 * * *',   // a cada 12 horas
    adapter: new TheSportsDBAdapter('wec', process.env.THESPORTSDB_API_KEY!)
  },
  {
    name: 'MotoGP Sync',
    sportSlug: 'motogp',
    schedule: '30 */12 * * *',  // a cada 12h, offset de 30min para não coincidir com WEC
    adapter: new TheSportsDBAdapter('motogp', process.env.THESPORTSDB_API_KEY!)
  }
];

export function startScheduler(db: Pool, redis: Redis): void {
  for (const job of jobs) {
    cron.schedule(job.schedule, () => runJob(job, db, redis));
    logger.info({ job: job.name, schedule: job.schedule }, 'Job agendado');
  }
  
  // Executar todos os jobs imediatamente ao iniciar (para popular o banco na primeira vez)
  logger.info('Executando sync inicial...');
  Promise.all(jobs.map(job => runJob(job, db, redis)));
}
```

**Endpoint de disparo manual (para desenvolvimento e emergências):**

```typescript
// Apenas acessível com header Authorization: Bearer {ADMIN_SECRET}
POST /api/admin/sync/:sportSlug

Response:
  202 → { "message": "Sync iniciado", "syncLogId": "uuid" }
  404 → { "error": "Sport não encontrado: {slug}" }
  401 → { "error": "Não autorizado" }
```

#### Definição de pronto
- Jobs são agendados ao iniciar a API (verificar nos logs de startup)
- Sync inicial popula o banco na primeira execução
- `POST /api/admin/sync/f1` dispara sync manual e retorna 202
- Falha em um job não afeta os outros (testar desligando a rede)
- `sync_log` registra cada execução com status e contagens

---

### TASK-2.2 — Integração com API-Sports (reservado para v1.1 — preparação)
**Responsável:** Codex  
**Tipo:** Implementação estrutural

#### O que fazer

A integração completa com API-Sports (UFC e Tênis) é para v1.1, mas a **estrutura** deve ser preparada agora para não exigir refatoração depois.

**Criar o adaptador base mas não ativá-lo nos jobs:**

```typescript
// packages/adapters/src/apisports/base.adapter.ts
export abstract class APISportsBaseAdapter implements SportAdapter {
  abstract readonly sportSlug: string;
  abstract readonly leagueId: number;
  readonly sourceId = 'apisports';
  
  constructor(private apiKey: string) {}
  
  protected async fetchFromAPI<T>(path: string): Promise<T> {
    const response = await fetch(`https://v1.mma.api-sports.io/${path}`, {
      headers: {
        'x-apisports-key': this.apiKey,
        'x-rapidapi-host': 'v1.mma.api-sports.io'
      }
    });
    
    if (response.status === 429) throw new RateLimitError('api-sports');
    if (!response.ok) throw new AdapterFetchError('api-sports', response.status);
    
    return response.json();
  }
  
  async fetchEvents(season: number): Promise<NormalizedEvent[]> {
    // implementação base — subclasses podem sobrescrever
    throw new Error(`${this.constructor.name}.fetchEvents() não implementado`);
  }
}

// packages/adapters/src/apisports/ufc.adapter.ts
export class UFCAdapter extends APISportsBaseAdapter {
  readonly sportSlug = 'ufc';
  readonly leagueId = 1;   // ID do UFC na API-Sports
  
  // fetchEvents será implementado na v1.1
}
```

**Adicionar UFC e Tênis no seed de sports (mas com `is_active = false`):**

```sql
INSERT INTO sports (slug, name, category, is_active) VALUES
  ('ufc',    'UFC',   'mma',    false),
  ('tennis', 'Tênis', 'tennis', false)
ON CONFLICT (slug) DO NOTHING;
```

#### Definição de pronto
- Estrutura de arquivos criada
- `UFCAdapter` e `TennisAdapter` existem mas não são registrados nos jobs
- Sports com `is_active = false` não aparecem em `GET /api/sports` por padrão
- Nenhum erro é lançado por causa desses adaptadores incompletos

---

### TASK-2.3 — Estratégia de cache com Redis
**Responsável:** Ambos  
**Tipo:** Implementação + revisão

#### Parte Codex — Implementar o cache

Criar `apps/api/src/lib/cache.ts` com helper de cache:

```typescript
export class CacheService {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }
  
  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(...keys);
  }
  
  // Cache com fetch automático se não encontrado
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    
    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
```

**Convenção de chaves Redis:**

```
events:list:{sports}:{from}:{to}:{status}:{page}:{limit}   → resultado de GET /api/events
events:detail:{eventId}                                      → resultado de GET /api/events/:id
sports:list                                                  → resultado de GET /api/sports
```

**TTLs por tipo:**

| Cache | TTL | Justificativa |
|---|---|---|
| Lista de eventos (scheduled) | 30 min | Não muda frequentemente |
| Lista de eventos (live) | 60 seg | Pode mudar a qualquer momento |
| Detalhe de evento | 15 min | Equilíbrio entre frescor e performance |
| Lista de sports | 24h | Raramente muda |

**Invalidação após sync:** quando um sync é concluído com sucesso, invalidar todos os caches de eventos do esporte sincronizado:

```typescript
await cache.invalidate(`events:list:*${sportSlug}*`);
```

#### Parte Claude — Revisar resiliência dos jobs

Analisar e documentar em `docs/resilience-strategy.md` o comportamento em cenários de falha:

**Cenário 1 — API externa fora por X tempo:**
- < 6h fora: próximo sync vai recuperar os dados. O usuário vê dados do banco (que podem ter até 6h) — aceitável.
- > 24h fora: dados ficam defasados. Deve haver alerta visual no frontend quando `sync_log` mostra falha recente.
- Como detectar "dados defasados"? Verificar se o `finished_at` do último sync bem-sucedido é > 2× o intervalo esperado.

**Cenário 2 — Redis fora:**
- Cache miss forçado: todas as requisições vão direto ao banco.
- O banco aguenta? Sim para o volume esperado no MVP.
- O sistema não deve travar — `CacheService` deve ter try/catch em todas as operações e degradar para "sem cache".

**Cenário 3 — PostgreSQL fora:**
- API retorna 503 imediatamente (não tentar servir dados parciais).
- Health check retorna `{ db: "error" }` — load balancer remove a instância.

**Cenário 4 — Job falha silenciosamente (sem exception):**
- O adapter retorna lista vazia por algum bug.
- O upsert não faz nada.
- `sync_log` registra `events_upserted: 0` — isso deve disparar alerta se acontecer em 3 syncs consecutivos.

**Output:** documento `docs/resilience-strategy.md` + issues criados para os alertas que ainda não estão implementados.

#### Definição de pronto
- Respostas de `GET /api/events` estão sendo cacheadas (verificar no Redis com `redis-cli keys "*"`)
- Cache é invalidado após um sync bem-sucedido (verificar que a próxima request vai ao banco)
- Se Redis estiver fora, a API continua funcionando (sem cache, com dados do banco)
- Documento de resiliência criado

---

### TASK-2.4 — API REST completa de eventos
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Implementar todos os endpoints da API definidos no README (seção 6).

**Endpoint principal: `GET /api/events`**

```typescript
// apps/api/src/routes/events.ts

router.get('/events', async (req, res) => {
  const schema = z.object({
    sports: z.string().optional(),            // 'f1,wec,motogp'
    from:   z.string().datetime().optional(), // ISO 8601
    to:     z.string().datetime().optional(),
    status: z.enum(['scheduled', 'live', 'completed', 'cancelled', 'postponed']).optional(),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(50),
    tz:     z.string().optional()            // ex: 'America/Sao_Paulo'
  });
  
  const params = schema.safeParse(req.query);
  if (!params.success) return res.status(400).json({ error: params.error.flatten() });
  
  const { sports, from, to, status, page, limit, tz } = params.data;
  
  const sportSlugs = sports?.split(',').map(s => s.trim()) ?? [];
  
  const cacheKey = `events:list:${sportSlugs.join('-')}:${from}:${to}:${status}:${page}:${limit}`;
  
  const result = await cache.getOrFetch(cacheKey, isLiveRequest ? 60 : 1800, async () => {
    return eventsService.findEvents({ sportSlugs, from, to, status, page, limit });
  });
  
  // Adicionar localTime a cada evento com base no tz do usuário
  const eventsWithLocalTime = addLocalTime(result.events, tz ?? 'UTC');
  
  res.json({
    data: eventsWithLocalTime,
    pagination: {
      page,
      limit,
      total: result.total,
      hasNextPage: page * limit < result.total
    }
  });
});
```

**Query SQL do `findEvents`:**

```sql
SELECT
  e.*,
  s.slug as sport_slug,
  s.name as sport_name,
  s.category as sport_category
FROM events e
JOIN sports s ON e.sport_id = s.id
WHERE
  ($1::text[] IS NULL OR s.slug = ANY($1))
  AND ($2::timestamptz IS NULL OR e.starts_at >= $2)
  AND ($3::timestamptz IS NULL OR e.starts_at <= $3)
  AND ($4::text IS NULL OR e.status = $4)
  AND s.is_active = true
ORDER BY e.starts_at ASC
LIMIT $5 OFFSET $6
```

**Endpoint `GET /api/events/:id`:**

```typescript
router.get('/events/:id', async (req, res) => {
  const { id } = req.params;
  const { tz } = req.query;
  
  const event = await cache.getOrFetch(
    `events:detail:${id}`,
    900,  // 15 min
    () => eventsService.findById(id)
  );
  
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  
  res.json(addLocalTime(event, tz as string ?? 'UTC'));
});
```

**Função `addLocalTime`:**

```typescript
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

function addLocalTime<T extends { startsAt: string }>(event: T, tz: string): T & { localTime: string } {
  try {
    const localTime = dayjs(event.startsAt).tz(tz).format();
    return { ...event, localTime };
  } catch {
    // timezone inválido: retornar UTC
    return { ...event, localTime: event.startsAt };
  }
}
```

**Endpoint `GET /api/sports`:**

```typescript
router.get('/sports', async (req, res) => {
  const sports = await cache.getOrFetch('sports:list', 86400, () =>
    db.query('SELECT slug, name, category FROM sports WHERE is_active = true ORDER BY category, name')
      .then(r => r.rows)
  );
  res.json({ data: sports });
});
```

**Endpoint `GET /api/admin/sync-log`:**

```typescript
// Requer Authorization: Bearer {ADMIN_SECRET}
router.get('/admin/sync-log', adminAuth, async (req, res) => {
  const { limit = 50 } = req.query;
  const logs = await db.query(
    'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT $1',
    [limit]
  );
  res.json({ data: logs.rows });
});
```

#### Definição de pronto
- `GET /api/events` retorna eventos paginados com filtros funcionando
- `GET /api/events?sports=f1&from=2025-01-01&to=2025-12-31` retorna apenas eventos de F1 em 2025
- `GET /api/events?status=live` retorna apenas eventos ao vivo
- Campo `localTime` presente em todas as respostas quando `?tz=America/Sao_Paulo` é passado
- Timezone inválido não quebra a API (graceful fallback para UTC)
- `GET /api/sports` retorna os 3 esportes ativos
- Paginação funciona corretamente com `hasNextPage`
- `GET /api/admin/sync-log` requer autenticação

---

### TASK-2.5 — Documentar a API com OpenAPI spec
**Responsável:** Claude  
**Tipo:** Documentação

#### O que fazer

Criar `apps/api/openapi.yaml` com a spec completa de todos os endpoints.

**Schemas a definir:**

```yaml
components:
  schemas:
    Sport:
      type: object
      properties:
        slug: { type: string, example: 'f1' }
        name: { type: string, example: 'Fórmula 1' }
        category: { type: string, enum: [motorsport, mma, tennis] }
    
    Event:
      type: object
      required: [id, sport, title, startsAt, status]
      properties:
        id: { type: string, format: uuid }
        sport: { $ref: '#/components/schemas/Sport' }
        title: { type: string, example: 'Grande Prêmio da Austrália' }
        subtitle: { type: string, example: 'Corrida', nullable: true }
        venue: { type: string, example: 'Albert Park Circuit', nullable: true }
        country: { type: string, example: 'Austrália', nullable: true }
        roundNumber: { type: integer, example: 3, nullable: true }
        startsAt: { type: string, format: date-time, description: 'Sempre em UTC' }
        endsAt: { type: string, format: date-time, nullable: true }
        durationMinutes: { type: integer, nullable: true }
        status:
          type: string
          enum: [scheduled, live, completed, cancelled, postponed]
        localTime:
          type: string
          format: date-time
          description: 'Presente apenas quando ?tz= é passado. Horário local do usuário.'
    
    PaginatedEvents:
      type: object
      properties:
        data: { type: array, items: { $ref: '#/components/schemas/Event' } }
        pagination:
          type: object
          properties:
            page: { type: integer }
            limit: { type: integer }
            total: { type: integer }
            hasNextPage: { type: boolean }
    
    SyncLog:
      type: object
      properties:
        id: { type: string, format: uuid }
        source: { type: string }
        sportSlug: { type: string }
        startedAt: { type: string, format: date-time }
        finishedAt: { type: string, format: date-time, nullable: true }
        eventsUpserted: { type: integer }
        eventsSkipped: { type: integer }
        error: { type: string, nullable: true }
        status: { type: string, enum: [running, success, failed] }
    
    Error:
      type: object
      properties:
        error: { type: string }
```

**Todos os endpoints devem documentar:**
- Parâmetros com tipos, formato e exemplos
- Todos os códigos de status de resposta (200, 400, 401, 404, 429, 500)
- Headers relevantes (Authorization para endpoints admin)

#### Definição de pronto
- YAML válido (`swagger-cli validate openapi.yaml`)
- Todos os parâmetros têm exemplos
- Erros documentados com mensagens de exemplo
- Spec pode ser aberta no Swagger UI sem warnings

---

## Checklist de Conclusão da Sprint

- [ ] Cron jobs rodando e aparecendo nos logs de startup
- [ ] Sync inicial popula o banco ao subir a API
- [ ] `GET /api/events` com filtros funcionando
- [ ] `GET /api/events?tz=America/Sao_Paulo` retorna `localTime` correto
- [ ] Cache Redis funcionando (verificar TTLs com `redis-cli ttl {key}`)
- [ ] Cache invalidado após sync bem-sucedido
- [ ] API funciona com Redis fora (degradação graciosa)
- [ ] `sync_log` registra todas as execuções
- [ ] Documento de resiliência criado
- [ ] OpenAPI spec válida e completa

---

## Dependências e Bloqueios

- Sprint 1 deve estar 100% concluída
- **TASK-2.1 pode começar imediatamente** — não depende de outras tasks desta sprint
- **TASK-2.3 depende de TASK-2.4** — o cache envolve as responses da API
- **TASK-2.4 e TASK-2.1 podem ser desenvolvidas em paralelo**
- **TASK-2.5 pode começar após TASK-2.4 estar concluída**

---

## Notas Técnicas

- `node-cron` e `cron` (pacote) são diferentes — usar `node-cron` que tem melhor suporte a TypeScript
- O offset de 30 minutos entre os jobs de WEC e MotoGP evita que os dois chamem a TheSportsDB simultaneamente e esgotem o rate limit diário
- Em desenvolvimento: definir `SYNC_ON_STARTUP=false` no `.env` para não gastar rate limit da API ao reiniciar frequentemente
- O endpoint `POST /api/admin/sync/:sportSlug` deve ser protegido por um secret simples (`ADMIN_SECRET` no `.env`) — não implementar auth completa nesta sprint
- Usar `zod` para validação dos query params — não confiar em `req.query` sem validação
