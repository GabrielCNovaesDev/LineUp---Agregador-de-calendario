# Runbook — API Externa Indisponível

> **Quando usar:** uma fonte de dados upstream (OpenF1, TheSportsDB) está fora do ar, retornando dados inválidos, ou foi descontinuada.
> **Audiência:** plantão / quem estiver investigando alertas ou reclamações de "calendário sumiu / desatualizou".
> **Princípio:** falhas curtas (< 12h) se resolvem sozinhas. O runbook só é necessário para falhas prolongadas ou permanentes.

---

## Diagnóstico — qual é a falha?

Antes de qualquer ação, classifique:

| Sintoma | Cenário | Próxima seção |
|---|---|---|
| Sync falhou 1–2 vezes seguidas | Falha transitória da API externa | [§1](#1-falha-transitória) |
| Sync sucedendo, mas com `events_upserted = 0` há 3+ ciclos | API mudou contrato, adapter quebrou silenciosamente | [§2](#2-falha-silenciosa-do-adapter) |
| Sync falhando há > 24h | API externa fora prolongadamente | [§3](#3-falha-prolongada) |
| API anuncia descontinuação ou retorna 410/404 permanente | API descontinuada | [§4](#4-api-descontinuada) |

### Comandos de diagnóstico

```bash
# Status dos últimos syncs por esporte
psql "$DATABASE_URL" -c "
  SELECT sport_slug, status, started_at, finished_at, events_upserted, events_skipped, error
  FROM sync_log
  ORDER BY started_at DESC
  LIMIT 20;
"

# Alertas ativos (cobre falha silenciosa automaticamente)
curl -s -H \"Authorization: Bearer \$ADMIN_SECRET\" \
  http://localhost:3000/api/admin/alerts | jq

# Frescor dos dados visto pelo frontend
curl -s http://localhost:3000/api/events/freshness | jq
```

---

## §1 Falha transitória

**Sintoma:** 1–2 entradas recentes em `sync_log` com `status='failed'`, mas algumas com `success` no meio.

**Ação:** nenhuma. O próximo ciclo recupera (F1: ≤ 6h). Avisar interessados se a janela de exibição estiver afetando usuários.

**Quando escalar:** se virar 3+ falhas consecutivas, vai para [§3](#3-falha-prolongada).

---

## §2 Falha silenciosa do adapter

**Sintoma:** `sync_log` mostra `success` mas `events_upserted=0` e `events_skipped=0` em 3 ciclos seguidos. Alerta `silent_failure` ativo em `/api/admin/alerts`.

**Causa típica:** API externa mudou o nome de um campo ou o shape da resposta. O adapter parseou mas não encontrou nada.

**Investigação:**

1. Disparar um sync manual para forçar coleta agora:
   ```bash
   curl -X POST -H "Authorization: Bearer $ADMIN_SECRET" \
     http://localhost:3000/api/admin/sync/f1
   ```
2. Comparar o JSON cru da API com o que o adapter espera. Para OpenF1:
   ```bash
   curl -s "https://api.openf1.org/v1/sessions?year=$(date +%Y)" | jq '.[0]'
   curl -s "https://api.openf1.org/v1/meetings?year=$(date +%Y)" | jq '.[0]'
   ```
   Conferir contra os tipos em [packages/adapters/src/openf1/types.ts](../../packages/adapters/src/openf1/types.ts).
3. Se algum campo obrigatório mudou: corrigir o adapter, fazer fallback se possível, adicionar teste de regressão com fixture do shape novo.

**Pós-fix:**
- Disparar sync manual.
- O `AlertsService.reconcileAfterSync` resolve automaticamente o alerta quando o próximo sync upsertar > 0 eventos.

**Histórico:** [Sprint 1 / abr-2026](../sprint-1.md) — OpenF1 retirou `meeting_name` do `/sessions` em 2026; fix em `OpenF1Adapter.normalize` puxando do `/meetings`.

---

## §3 Falha prolongada

**Sintoma:** API externa está fora há > 12h (mais de 2× o intervalo do job). `/api/events/freshness` retorna `stale: true` para o esporte.

**Investigação:**

1. Confirmar que o problema é da API externa, não da nossa rede:
   ```bash
   # OpenF1
   curl -fI https://api.openf1.org/v1/sessions?year=$(date +%Y) || echo "DOWN"
   ```
2. Checar status page / Twitter da API se houver. OpenF1 não tem statuspage oficial — checar [@OpenF1API](https://twitter.com/OpenF1API) ou GitHub issues de quem usa.
3. Logs do scheduler: `docker logs <api-container> 2>&1 | grep '\[sync\]'`

**Mitigação enquanto a API está fora:**

- A API LineUp continua servindo dados do banco (o que está lá fica).
- O frontend deve mostrar banner "dados podem estar desatualizados" automaticamente via `/api/events/freshness`.
- Não há nada a fazer do nosso lado — esperar a API voltar.

**Quando virar [§4](#4-api-descontinuada):** se passar de 7 dias sem retorno, ou se a API anunciar fim de operação.

---

## §4 API descontinuada

**Sintoma:** confirmação de que a fonte não vai voltar. Pode ser anúncio oficial, mudança de licença, ou simples sumiço prolongado.

**Procedimento:**

### Passo 1 — Desativar o esporte

```sql
-- conexão direta no Postgres
UPDATE sports SET is_active = FALSE WHERE slug = '<slug>';
```

Isso é instantâneo: `EventsService.listEvents` filtra `is_active = TRUE` ([apps/api/src/services/events.service.ts](../../apps/api/src/services/events.service.ts)), então o esporte some das respostas. O frontend para de mostrar.

### Passo 2 — Remover o job do scheduler

Edite [apps/api/src/scheduler/index.ts](../../apps/api/src/scheduler/index.ts) e remova o job correspondente do array `jobs`. Deixar comentário explicando *quando* e *por que* foi removido. Re-deploy.

> Sem isso, o cron continua chamando uma API morta e enchendo `sync_log` com falhas.

### Passo 3 — Resolver alertas pendentes

```sql
UPDATE alerts SET resolved_at = NOW()
WHERE sport_slug = '<slug>' AND resolved_at IS NULL;
```

### Passo 4 — Investigar fonte alternativa

Antes de deletar o adapter:
- Existe outra API com os mesmos dados? (TheSportsDB tier paga, RapidAPI marketplace, scraping com Playwright como último recurso.)
- Vale o esforço (depende do quanto o esporte é demandado pelos usuários)?
- Se sim: criar novo adapter, manter o slug `<slug>` em `sports`, reativar com `is_active = TRUE`.

### Passo 5 — Comunicar usuários

- Banner no app: "<Esporte> não está mais disponível por descontinuação da fonte de dados".
- Post no canal de comunicação oficial.
- Se houver muitos usuários ativos no esporte: e-mail.

### Passo 6 — Limpeza opcional (depois de 30+ dias sem reativação)

- Remover o adapter de `packages/adapters/src/<source>/` se ele não atende mais nenhum esporte ativo.
- Manter os dados históricos (`events`, `sync_log`) — não deletar. Servem para feature de "resultados" futura e auditoria.

---

## Histórico de falhas conhecidas

| Data | Fonte | Esporte | Cenário | Resolução |
|---|---|---|---|---|
| 2026-04-29 | TheSportsDB free tier | WEC, MotoGP | Tier gratuito não cobre as ligas (4370/4497 retornam outros conteúdos) | Aplicado [§4](#4-api-descontinuada) — esportes desativados via [migration 009](../../infra/migrations/009_deactivate_non_mvp_sports.sql); MVP foca só em F1 até resolver chave paga |
| 2026-04-29 | OpenF1 | F1 | API parou de retornar `meeting_name` em `/sessions` para temporada 2026 | Aplicado [§2](#2-falha-silenciosa-do-adapter) — adapter passou a usar `meeting_name` do endpoint `/meetings` |
