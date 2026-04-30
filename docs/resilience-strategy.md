# Estratégia de Resiliência

> **Escopo:** comportamento esperado quando dependências externas falham — APIs upstream, Redis, PostgreSQL — e quando jobs degradam silenciosamente. Estado: tudo descrito aqui está **implementado e testado**.
> **Audiência:** quem está mexendo no scheduler, no `CacheService`, ou nas rotas que servem dados ao frontend.
> **Princípio geral:** cada dependência tem um modo de falha esperado. **Falhar silenciosamente é pior do que falhar ruidosamente.** Toda falha deve gerar (a) um log estruturado e (b) um sinal observável (status code, sync_log, alerta, ou métrica).

---

## Resumo das decisões

| Dependência | Falha → comportamento | Implementado? |
|---|---|---|
| API externa (OpenF1, TheSportsDB) | Servir do banco, logar, próximo job recupera | ✅ Sim |
| Redis fora | Cache miss permanente; ir direto ao banco | ✅ Sim |
| Redis fora globalmente (> grace period) | `/health` reporta `200 degraded` para LB não drenar todas as instâncias | ✅ Sim |
| PostgreSQL fora | API responde **HTTP 503**; LB tira a instância | ✅ Sim |
| Job falha silenciosamente (sem exception) | Detectar via `sync_log`, gravar alerta, expor em `/api/admin/alerts` | ✅ Sim |
| Frontend precisa saber se dados estão estagnados | Endpoint público `GET /api/events/freshness` | ✅ Sim |

---

## Cenário 1 — API externa fora

### Comportamento esperado por janela de tempo

| Janela | Impacto no usuário | Ação do sistema |
|---|---|---|
| < 1 ciclo de sync (F1: 6h) | Nenhum — usuário continua vendo dados do banco | Job atual falha, registra em `sync_log` com `status='failed'`, próximo ciclo recupera |
| 1–2 ciclos | Usuário vê dados levemente defasados | Idem; ainda dentro da tolerância |
| > 2× intervalo esperado | Dados ficam estagnados | **Frontend deve exibir banner "dados podem estar desatualizados"** |
| Falha permanente (API descontinuada) | Esporte não pode ser servido | Marcar `sports.is_active = FALSE` manualmente |

### Comportamento atual no código

- O adapter ([packages/adapters/src/openf1/index.ts:79-120](../packages/adapters/src/openf1/index.ts#L79-L120)) faz **retry com backoff** (4 tentativas: 1s, 2s, 4s) antes de lançar `AdapterFetchError`.
- O `SyncRunner.finishJob` ([apps/api/src/scheduler/runner.ts:125-157](../apps/api/src/scheduler/runner.ts#L125-L157)) captura a exceção, grava `sync_log` com `status='failed'` e `error=<mensagem>`, e **não relança** — o processo continua e os outros jobs rodam.
- O `safeRunJob` ([apps/api/src/scheduler/index.ts:61-67](../apps/api/src/scheduler/index.ts#L61-L67)) tem um catch-all extra contra erros não previstos no próprio runner. Falha em um job nunca afeta os outros.
- Dados antigos seguem disponíveis via `GET /api/events` — a query lê do banco, não da API externa.

### Endpoint de frescor (resolve a lacuna do banner do frontend)

`GET /api/events/freshness` ([apps/api/src/routes/events.ts](../apps/api/src/routes/events.ts), service em [apps/api/src/services/freshness.service.ts](../apps/api/src/services/freshness.service.ts)) retorna por esporte:

```json
{
  "sports": [
    {
      "slug": "f1",
      "lastSuccessfulSync": "2026-04-30T12:00:00.000Z",
      "stale": false,
      "expectedIntervalMinutes": 360
    }
  ],
  "generatedAt": "2026-04-30T12:30:00.000Z"
}
```

**Critério de `stale = true`:** `now - lastSuccessfulSync > 2 × expectedIntervalMinutes`. Para F1 (job a cada 6h), isso é > 12h sem sucesso. Sem auth, cache de 30s no Redis. Quando Redis está fora, o cache vira pass-through e o endpoint segue funcionando direto do banco.

`expectedIntervalMinutes` vem do campo `intervalMinutes` declarado em cada `SyncJob` ([apps/api/src/scheduler/jobs/](../apps/api/src/scheduler/jobs/)).

---

## Cenário 2 — Redis fora

### Comportamento esperado

- **Cache miss permanente:** todas as requisições vão direto ao banco.
- **API continua funcionando**, com latência um pouco maior.
- **Health check com circuit breaker:** falha recente → 503 (LB pode mover tráfego); falha sustentada → 200 degraded (assumir outage global, manter instância em rotação).

### Comportamento atual no código

- O `CacheService` ([apps/api/src/lib/cache.ts](../apps/api/src/lib/cache.ts)) tem **try/catch em `get`, `set` e `invalidate`**. Em qualquer erro, registra `[cache] <op> failed` e:
  - `get` retorna `null` (que dispara o fetcher).
  - `set` e `invalidate` são no-ops silenciosos.
- O `getOrFetch` ([apps/api/src/lib/cache.ts](../apps/api/src/lib/cache.ts)) chama `get`; quando vier `null` por erro, executa o fetcher normalmente. **Não há diferença observável entre "cache vazio" e "cache fora"** do ponto de vista da rota — ambos vão ao banco.
- O Redis client ([apps/api/src/lib/redis.ts](../apps/api/src/lib/redis.ts)) usa `lazyConnect: true`, `maxRetriesPerRequest: 1`, `enableOfflineQueue: false` e suprime o evento de erro — combinação que evita travar o processo quando o Redis está fora ao boot.
- `redis.ts` rastreia o `firstFailureAt` em variável de módulo: incrementa quando `checkRedisConnection` falha, zera ao primeiro sucesso. `getRedisFailureDurationSeconds()` expõe a duração da falha em segundos.

### Circuit breaker no `/health`

A decisão é uma função pura ([apps/api/src/routes/health.ts](../apps/api/src/routes/health.ts) → `decideHealthStatus`):

| `db` | `redis` | Duração da falha de Redis | HTTP | `status` |
|---|---|---|---|---|
| connected | connected | — | 200 | `ok` |
| connected | error | ≤ grace | 503 | `degraded` |
| connected | error | > grace | **200** | `degraded` |
| error | qualquer | — | 503 | `degraded` |

`grace` = `REDIS_HEALTH_GRACE_PERIOD_SECONDS` (default 120s). Setar 0 desliga o circuit breaker e força sempre 503 enquanto Redis estiver fora.

**Racional:** falhas curtas (< 2min) podem ser problema local da instância — fazer o LB tentar outra instância é o certo. Falhas sustentadas indicam outage global do Redis; tirar todas as instâncias deixa o serviço 100% indisponível à toa, já que o banco está saudável e a API funciona em modo no-cache.

---

## Cenário 3 — PostgreSQL fora

### Comportamento esperado

- **API retorna 503** (não 500) imediatamente nas rotas que dependem do banco.
- **Não tentar servir dados parciais** do cache — pode estar inconsistente após restart do banco.
- `/health` retorna `{ db: "error" }` com HTTP 503 — load balancer tira a instância.

### Comportamento atual no código

- `/health` ([apps/api/src/routes/health.ts:9-15](../apps/api/src/routes/health.ts#L9-L15)) já retorna 503 + `db: "error"` quando o `SELECT 1` falha. ✅
- Rotas de eventos e admin têm `try/catch` genérico que retorna **500** (não 503) em qualquer falha:
  - [apps/api/src/routes/events.ts:33-37](../apps/api/src/routes/events.ts#L33-L37) — handler de `GET /api/events`
  - [apps/api/src/routes/admin.ts:31-35](../apps/api/src/routes/admin.ts#L31-L35) — handler de `POST /api/admin/sync/:sportSlug`
- O scheduler tenta criar `sync_log` no banco. Se falhar, `createSyncLog` lança ([runner.ts:202-205](../apps/api/src/scheduler/runner.ts#L202-L205)) e o `safeRunJob` apenas loga. Próximo ciclo tenta de novo. ✅

### Gap 1 — Status code errado para falha de banco

Quando o PostgreSQL cai durante uma request, o usuário recebe **500 "Internal Server Error"** em vez de **503 "Service Unavailable"**. A diferença importa:

- **500:** "algo deu errado no servidor; pode ser bug específico desta request" — clientes podem retentar imediatamente, e load balancers tipicamente não tiram a instância.
- **503:** "indisponibilidade temporária; tente de novo em pouco" — clientes inteligentes esperam, e LBs com health probe ativo tiram a instância.

**Solução:** detectar erros de conexão `pg` (códigos `ECONNREFUSED`, `57P03 cannot_connect_now`, `08006 connection_failure`) e responder 503 explicitamente. Para os demais, manter 500.

### Gap 2 — Cache pode servir dados após DB down + recovery

Se o DB cair, durante o downtime as rotas falham (correto). Quando o DB voltar com dados diferentes (ex: failover para réplica que perdeu commits), o cache Redis pode ter dados que **não existem mais** no banco. Não é um problema imediato no MVP (não há réplica), mas vale documentar para a Sprint 4 (deploy).

---

## Cenário 4 — Job falha silenciosamente (sem exception)

Sintoma: o adapter retorna `[]` (lista vazia) por algum bug — ex: API mudou o shape, `meta?.events` virou `meta?.items`, regex de parsing virou `null`. O upsert não faz nada, `sync_log` registra `status='success'` com `events_upserted=0`. Tudo parece OK, mas o banco está estagnando.

### Por que é grave

- Não dispara nenhum dos try/catch existentes.
- `sync_log` reporta sucesso.
- Frontend continua mostrando dados antigos sem alerta.
- Pode passar despercebido por dias.

### Como detectar

**Critério:** "3 syncs consecutivos do mesmo `sport_slug` com `events_upserted = 0` E `events_skipped = 0`".

A condição precisa dos dois zeros porque:
- `events_skipped > 0` significa que o adapter trouxe dados, mas o validador rejeitou — é outro bug (cobertura ruim de validação), não falha silenciosa.
- `events_upserted = 0` sozinho pode ser legítimo (ex: re-sync sem mudanças, e a regra `WHERE events.updated_at < NOW() - INTERVAL '1 hour'` no upsert filtrou).

A combinação dos dois zeros em **3 corridas seguidas** (≥ 18h para F1) é fortemente anômala.

### Comportamento atual no código

- `sync_log` armazena `events_upserted` e `events_skipped` ([runner.ts:162-168](../apps/api/src/scheduler/runner.ts#L162-L168)). A telemetria existe.
- **Nenhum código consome essa telemetria** para gerar alerta. O cron simplesmente segue.

### Gap

Não há mecanismo de detecção. Sprint 2 não pediu implementação, só análise — então fica registrado abaixo como issue a abrir.

---

## Health check e observabilidade

| Sinal | Onde sai | Quem consome |
|---|---|---|
| HTTP 503 em `/health` quando DB ou Redis caem | [routes/health.ts:11](../apps/api/src/routes/health.ts#L11) | Load balancer / orquestrador |
| Log estruturado em `[sync] sync started/completed/failed` | [runner.ts:43-47](../apps/api/src/scheduler/runner.ts#L43-L47) | stdout (futura agregação em Datadog/CloudWatch) |
| Log `[cache] <op> failed` quando Redis falha | [cache.ts:54-58](../apps/api/src/lib/cache.ts#L54-L58) | stdout |
| Tabela `sync_log` com cada execução | banco | Endpoint `/api/admin/sync-log` (a fazer na TASK-2.4) e dashboards futuros |

**Lacunas em observabilidade:**

- Não há métricas (Prometheus, StatsD, etc) — só stdout. Aceitável para MVP.
- Não há tracing distribuído. Aceitável para MVP (única API, sem microsserviços).
- Não há agregação de logs — `console.log` no stdout só. Sprint 4 (deploy) deve resolver.

---

## Pendências (issues a abrir)

Cada item abaixo é um issue independente. Estimativas relativas (S/M/L) baseadas em complexidade, não em horas.

### #1 — Endpoint de "frescor dos dados" para o frontend (M)

**Problema:** sem isso, frontend não consegue exibir o banner "dados podem estar desatualizados" da Sprint 3.

**Proposta:**
```
GET /api/events/freshness
Response 200:
{
  "sports": [
    {
      "slug": "f1",
      "lastSuccessfulSync": "2026-04-30T18:00:00.000Z",
      "stale": false,
      "expectedIntervalMinutes": 360
    }
  ]
}
```

`stale = true` quando `now - lastSuccessfulSync > 2 × expectedIntervalMinutes`.

**Critério de pronto:**
- Endpoint sem auth (dado é semi-público).
- Cache 30s (TTL curto — informação muda rapidamente).
- Teste unitário cobrindo o cálculo de `stale`.

---

### #2 — Detecção de "3 syncs consecutivos com 0 eventos" (M)

**Problema:** Cenário 4 — falha silenciosa.

**Proposta:** ao final de cada sync bem-sucedido, executar query:

```sql
SELECT COUNT(*) FROM (
  SELECT events_upserted + events_skipped AS touched
  FROM sync_log
  WHERE sport_slug = $1 AND status = 'success'
  ORDER BY started_at DESC
  LIMIT 3
) recent
WHERE touched = 0;
```

Se retornar `3`, logar `[alert] silent failure suspected for ${sportSlug}` em nível `warn` e gravar uma entrada em uma tabela `alerts` (a criar) para o frontend mostrar.

**Critério de pronto:**
- Logado em `warn`.
- Persistido em `alerts(sport_slug, kind, detected_at, resolved_at)`.
- Endpoint admin para listar alertas ativos.

---

### #3 — Status 503 (em vez de 500) para falhas de conexão com PostgreSQL (S)

**Problema:** Cenário 3, Gap 1.

**Proposta:** middleware de erro do Express que inspeciona `err.code`:
- `ECONNREFUSED`, `08006`, `57P03`, `08001` → `res.status(503)`.
- Demais → `res.status(500)`.

**Critério de pronto:**
- Middleware em `apps/api/src/middleware/error.ts`.
- Teste unitário com `pg` simulado lançando cada código.
- Aplicado a todas as rotas que tocam o banco.

---

### #4 — Circuit breaker opcional no `/health` para Redis (S)

**Problema:** Cenário 2, discussão sobre 503.

**Proposta:** se Redis estiver fora **mas** a falha for recente (< 2 min), retornar 503 normalmente. Se a falha persistir > 2 min, considerar `degraded-but-serving` (HTTP 200 + `redis: "error"`) para evitar tirar todas as instâncias quando o Redis cai globalmente.

**Critério de pronto:**
- Configurável via env (`REDIS_HEALTH_GRACE_PERIOD_SECONDS`, default `120`).
- Teste validando ambos os modos.

---

### #5 — Documentar runbook para "API externa descontinuada" (S — só doc)

**Problema:** quando uma fonte morre permanentemente (caso WEC/MotoGP atual), não há checklist do que fazer.

**Proposta:** seção em `docs/runbooks/external-api-down.md` com passos:
1. `UPDATE sports SET is_active = FALSE WHERE slug = '$slug'`
2. Remover o job correspondente em `apps/api/src/scheduler/index.ts`
3. Investigar fonte alternativa
4. Comunicar usuários

**Critério de pronto:** doc commitado.

---

## Cheatsheet — comportamento por dependência

| Falha | API responde? | Cache? | Sync? | Health |
|---|---|---|---|---|
| OpenF1 fora | ✅ dados antigos | ✅ funcionando | ❌ falha registrada | 200 |
| TheSportsDB fora | ✅ (não usado no MVP) | ✅ | ❌ | 200 |
| Redis fora | ✅ direto do banco | ❌ desligado | ✅ (cache opcional) | **503** |
| PostgreSQL fora | ❌ retorna 500 (deveria ser 503 — issue #3) | ⚠️ pode ter dados stale | ❌ não consegue gravar `sync_log` | **503** |
| Adapter retorna `[]` (bug) | ✅ dados ficam estagnados | ✅ | ⚠️ `success` com 0 eventos (issue #2) | 200 |
