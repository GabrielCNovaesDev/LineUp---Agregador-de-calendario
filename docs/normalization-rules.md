# Regras de Normalização — Casos de Borda

> **Escopo:** este documento define o comportamento esperado da camada de normalização (adaptadores + validador + serviço de upsert) diante de cenários ambíguos ou incompletos vindos das APIs externas.
> **Audiência:** desenvolvedores trabalhando nos adaptadores ([packages/adapters/](../packages/adapters/)) e no `EventsService` ([apps/api/src/services/events.service.ts](../apps/api/src/services/events.service.ts)).
> **Princípio geral:** preferir **rejeitar com log** a **salvar dado errado**. Um evento ausente é menos prejudicial à credibilidade do produto do que um evento com horário ou título incorreto.

---

## Caso 1 — Evento sem `endsAt`

### Problema

Algumas fontes retornam apenas o início do evento (`date_start` / `dateEvent` + `strTime`) e omitem o fim. Sem `endsAt`, o export iCal gera um evento de duração zero e o calendário visual fica ilegível.

### Decisão

Quando `endsAt` ausente, calcular `endsAt = startsAt + durationDefault(sportSlug, subtitle)` e preencher `durationMinutes` com o valor usado. A duração padrão é resolvida por uma tabela de fallback consultada na ordem **subtitle exato → palavra-chave → default do esporte**.

### Tabela de durações padrão

| Esporte | Subtitle / palavra-chave | Duração padrão (min) | Fonte da estimativa |
|---|---|---|---|
| F1 | `Corrida`, `Race` | 120 | regulamento FIA: corridas têm limite de 2h |
| F1 | `Qualificação`, `Qualifying` | 60 | Q1+Q2+Q3 ~ 1h |
| F1 | `Sprint` | 30 | corrida sprint dura ~30 min |
| F1 | `Classificação Sprint`, `Sprint Qualifying` | 45 | formato sprint shootout |
| F1 | `Treino Livre 1`, `Treino Livre 2`, `Treino Livre 3`, `Practice` | 60 | sessões de treino livre padrão |
| WEC | título contém `24 Hours` ou `24 Heures` | 1440 (24h) | duração total da prova |
| WEC | título contém `12 Hours` | 720 (12h) | |
| WEC | título contém `8 Hours` | 480 (8h) | |
| WEC | título contém `6 Hours` ou `6 Heures` | 360 (6h) | duração da maioria das etapas |
| WEC | título contém `1000 Miles` | 480 (8h) | limite de tempo da prova |
| WEC | (default WEC) | 360 (6h) | etapa padrão |
| MotoGP | `Corrida`, `Race` | 45 | corrida principal ~ 40-45 min |
| MotoGP | `Qualificação`, `Qualifying`, `Q1`, `Q2` | 30 | |
| MotoGP | `Sprint` | 25 | sprint MotoGP ~ metade da corrida |
| MotoGP | `Treino Livre`, `Practice`, `FP` | 45 | |
| MotoGP | (default MotoGP) | 60 | fallback genérico |
| (qualquer) | (sem match) | 90 | último recurso — log warning |

### Lógica de detecção

```typescript
// packages/shared/src/utils/duration.ts
export function defaultDurationMinutes(
  sportSlug: string,
  subtitle: string | undefined,
  title: string,
): number {
  const haystack = `${subtitle ?? ''} ${title}`.toLowerCase();

  // F1
  if (sportSlug === 'f1') {
    if (/\b(race|corrida)\b/.test(haystack)) return 120;
    if (/\bsprint qualifying|classificação sprint\b/.test(haystack)) return 45;
    if (/\bsprint\b/.test(haystack)) return 30;
    if (/\b(qualifying|qualificação|quali)\b/.test(haystack)) return 60;
    if (/\b(practice|treino livre|fp\d?)\b/.test(haystack)) return 60;
    return 90;
  }

  // WEC — detectar pelo formato no título
  if (sportSlug === 'wec') {
    if (/24\s*(hours|heures|h)\b/.test(haystack)) return 1440;
    if (/12\s*(hours|heures|h)\b/.test(haystack)) return 720;
    if (/8\s*(hours|heures|h)\b/.test(haystack)) return 480;
    if (/(6\s*(hours|heures|h)|1000\s*miles)\b/.test(haystack)) {
      return haystack.includes('1000 miles') ? 480 : 360;
    }
    return 360;
  }

  // MotoGP
  if (sportSlug === 'motogp') {
    if (/\b(race|corrida)\b/.test(haystack)) return 45;
    if (/\bsprint\b/.test(haystack)) return 25;
    if (/\b(qualifying|qualificação|quali|q1|q2)\b/.test(haystack)) return 30;
    if (/\b(practice|treino livre|fp\d?)\b/.test(haystack)) return 45;
    return 60;
  }

  // Fallback global
  logger.warn({ sportSlug, subtitle, title }, 'Duração padrão não definida — usando 90min');
  return 90;
}
```

### Comportamento esperado

- `durationMinutes` no banco é sempre preenchido — derivado de `endsAt - startsAt` quando disponível, ou da tabela acima quando inferido.
- Quando inferido, registrar log `info` com `{ sportSlug, subtitle, durationApplied }` para auditoria.
- O frontend pode exibir badge "duração aproximada" quando `endsAt` original não veio da fonte (campo `raw_data` permite verificar).

---

## Caso 2 — Evento duplicado entre fontes

### Problema

O mesmo evento real pode aparecer em mais de uma fonte. Exemplo: o GP da Austrália de F1 está na OpenF1 (sessão `Race`) e pode também estar na TheSportsDB sob outra liga. Se persistirmos os dois, o usuário vê o mesmo card duas vezes no calendário.

### Decisão

**Manter os dois registros no banco.** Não há deduplicação no backend. Justificativa:

1. A constraint única é `UNIQUE(source, external_id)` — fontes diferentes geram chaves diferentes, então não há conflito de banco.
2. As fontes podem ter dados complementares (uma traz `venue` que falta na outra, outra traz `endsAt` que falta na primeira). Apagar uma é jogar fora informação.
3. Permitir múltiplas fontes para o mesmo evento dá redundância: se uma API ficar fora do ar, a outra cobre.
4. Deduplicar via heurística (`title + startsAt`) é frágil — títulos variam ("GP da Austrália" vs "Australian Grand Prix") e startsAt pode diferir em minutos.

A **agregação visual** acontece no frontend, onde temos contexto da preferência do usuário e podemos escolher qual fonte priorizar.

### Regra de agrupamento no frontend

O cliente agrupa cards por chave `(sportSlug, normalize(title), startsAt arredondado a 5 minutos)`:

```typescript
function eventGroupKey(e: EventDto): string {
  const normalizedTitle = e.title
    .toLowerCase()
    .replace(/grande prêmio (do |da |de |dos |das )?/g, '')
    .replace(/grand prix( of)? /g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const rounded = roundToNearestMinutes(e.startsAt, 5).toISOString();
  return `${e.sport.slug}:${normalizedTitle}:${rounded}`;
}
```

Quando há mais de um evento na mesma chave, o frontend escolhe **uma fonte primária** seguindo a ordem de preferência:

| Esporte | Fonte primária | Fonte secundária |
|---|---|---|
| F1 | `openf1` | `thesportsdb` |
| WEC | `thesportsdb` | — |
| MotoGP | `thesportsdb` | — |

A fonte secundária é usada apenas para preencher campos faltantes na primária (`venue`, `country`, etc).

### Exemplo concreto

Banco:
```
events:
  id=A, source=openf1,        external_id=openf1:9158,  title='Australian Grand Prix', subtitle='Corrida', starts_at='2025-03-16T05:00:00Z', venue='Melbourne'
  id=B, source=thesportsdb,   external_id=thesportsdb:1234567, title='Australia GP - Race', subtitle=null, starts_at='2025-03-16T05:00:00Z', venue=null
```

API `/api/events?sports=f1` retorna **ambos** os registros.

Frontend computa `eventGroupKey`:
- A → `f1:australian:2025-03-16T05:00:00.000Z`
- B → `f1:australia:2025-03-16T05:00:00.000Z`

> **Atenção:** o exemplo acima ilustra que o agrupamento simples por título normalizado pode falhar quando os títulos divergem semanticamente ("Australian" vs "Australia"). Para o MVP, aceita-se essa imprecisão — F1 só tem `openf1` como fonte primária; agrupamento entre fontes vira problema relevante apenas se WEC/MotoGP ganharem segunda fonte. Revisitar quando isso acontecer.

---

## Caso 3 — Evento com data no passado

### Problema

Quando rodamos sync da temporada inteira (`fetchEvents(2025)`), recebemos eventos que já aconteceram. Faz sentido salvá-los?

### Decisão

**Sim — salvar todos os eventos retornados pela fonte, incluindo passados.**

Justificativas:
1. **Feature futura "Resultados":** sprint 3 ou v1.1 prevê exibir histórico. Sem dados persistidos agora, teríamos que voltar e reprocessar depois.
2. **Custo é trivial:** uma temporada inteira de F1 tem ~24 etapas × 5 sessões = ~120 eventos. Multiplicado por 3 esportes, ~400 linhas/temporada. Insignificante.
3. **O filtro é responsabilidade da query, não do sync:** o endpoint `/api/events` já aceita `?from=` e `?to=` para limitar a janela exibida.

### Comportamento esperado

- Adaptadores não filtram por data — retornam tudo que a API trouxe.
- O `EventsService.upsertEvents` persiste todos.
- Default do endpoint `/api/events` (sem `from`/`to`) é retornar eventos com `starts_at >= NOW() - INTERVAL '1 day'` para não inundar o cliente com histórico.
- Para acessar histórico, o cliente passa `?from=2025-01-01` explicitamente.

### Validação

A regra `event.startsAt.getFullYear() < 2020 → rejeitar` (em [TASK-1.5 validador](sprint-1.md)) **não é "rejeitar evento passado"**. É uma sanity check para datas claramente erradas (ex: API devolveu epoch zero ou ano default `1970`). Eventos de 2024, 2023 etc são perfeitamente válidos.

---

## Caso 4 — Evento com status `cancelled` ou `postponed`

### Problema

Eventos cancelados ou adiados não devem desaparecer do banco — são dados históricos relevantes ("o GP do Bahrein foi cancelado em 2020"). Mas precisam ser tratados de forma diferenciada na UI.

### Decisão

- **Backend:** persistir normalmente. `status = 'cancelled'` ou `status = 'postponed'` é um valor válido do enum.
- **Sync:** atualizar `status` em todo upsert. Se a API mudar de `'scheduled'` para `'cancelled'`, refletir.
- **API:** o endpoint `/api/events` retorna eventos cancelados por padrão. Cliente pode filtrar com `?status=scheduled` se quiser.
- **Frontend:** exibir cards com:
  - Texto do título com `text-decoration: line-through` (riscado).
  - Badge "Cancelado" ou "Adiado" em destaque.
  - Cor neutra (cinza) em vez da cor do esporte.
  - Botão "Notificar" desabilitado.
- **Notificações pendentes:** quando um evento muda para `cancelled`, o cron job de envio deve **deletar** as notificações pendentes (`WHERE event_id = X AND sent_at IS NULL`) para não disparar push de evento que não vai acontecer.

### Comportamento de `postponed` sem nova data

Algumas fontes marcam `'Postponed'` mas mantêm a `startsAt` antiga. Regra:

- Se `status = 'postponed'` e `starts_at` é igual ao da última sync → manter `starts_at` (a fonte ainda não tem data nova).
- Quando a fonte trouxer nova data, o upsert a aplicará automaticamente. O frontend pode mostrar "remarcado para…" comparando `created_at` vs `updated_at` se quiser.

---

## Caso 5 — API retorna `null` para campo

### Decisão por campo

| Campo | `null` ou ausente | Ação | Justificativa |
|---|---|---|---|
| `external_id` | rejeitar | log `error`, não salvar | sem ID, não há como deduplicar nem atualizar |
| `source` | impossível | n/a | preenchido pelo adaptador, nunca vem da API |
| `title` | rejeitar | log `error`, não salvar | título vazio quebra UI e iCal |
| `starts_at` | rejeitar | log `error`, não salvar | sem data, evento não cabe no calendário |
| `starts_at` inválido (NaN) | rejeitar | log `error`, não salvar | parsing falhou, dado é lixo |
| `starts_at` < ano 2020 | rejeitar | log `error`, não salvar | sanity check anti-epoch-zero |
| `ends_at` < `starts_at` | rejeitar | log `error`, não salvar | inversão de campos pela fonte |
| `ends_at` | aceitar | preencher via `defaultDurationMinutes` | ver Caso 1 |
| `subtitle` | aceitar | salvar `null` | nem todo evento tem sub-sessões |
| `venue` | aceitar | salvar `null` | UI exibe "Local não informado" |
| `country` | aceitar | salvar `null` | UI omite a bandeira |
| `round_number` | aceitar | salvar `null` | nem todo formato tem round (ex: lutas avulsas) |
| `duration_minutes` | aceitar | calcular do `ends_at` ou via fallback | ver Caso 1 |
| `status` | aceitar com fallback | usar `'scheduled'` + log `warn` | default seguro |
| `status` desconhecido | aceitar com fallback | usar `'scheduled'` + log `warn` | não conhecemos o vocabulário da fonte; assumir o caso comum |
| `raw_data` | aceitar | salvar `null` ou objeto vazio | sem impacto funcional |

### Implementação no validador

```typescript
// apps/api/src/services/events.validator.ts
export function validateNormalizedEvent(event: NormalizedEvent): ValidationResult {
  const errors: string[] = [];

  // Campos obrigatórios — rejeitar
  if (!event.externalId) errors.push('externalId é obrigatório');
  if (!event.source) errors.push('source é obrigatório');
  if (!event.title || event.title.trim().length === 0) errors.push('title é obrigatório');
  if (!event.startsAt || isNaN(event.startsAt.getTime())) errors.push('startsAt inválido');
  if (event.startsAt && event.startsAt.getFullYear() < 2020) errors.push('startsAt parece incorreto — ano < 2020');
  if (event.endsAt && event.endsAt <= event.startsAt) errors.push('endsAt deve ser após startsAt');

  return { valid: errors.length === 0, errors };
}
```

### Comportamento do batch

Eventos rejeitados **não param o batch**. O `EventsService.upsertEvents` captura o erro de validação por item, incrementa `results.skipped`, anexa em `results.errors[]` e segue para o próximo. O `sync_log` no fim recebe `events_skipped` para auditoria.

---

## Cheatsheet — Resumo Operacional

| Cenário | Ação |
|---|---|
| `endsAt` ausente | calcular via tabela de durações + log info |
| Mesmo evento em duas fontes | salvar os dois; frontend agrupa |
| Evento no passado | salvar; cliente filtra com `?from=` se quiser |
| Evento cancelado | salvar; UI risca; deletar notificações pendentes |
| `title` ou `startsAt` nulos | rejeitar item, registrar erro, seguir batch |
| `venue`/`country`/`subtitle` nulos | aceitar como `null` |
| Status desconhecido | usar `'scheduled'` + log warn |
| Data sem fuso horário | assumir UTC + log warn (ver [docs/README.md §5](README.md#5-normalização-de-dados)) |

---

## Pendências e revisões futuras

- **WEC com formatos não-padrão** ("Petit Le Mans", "Bathurst 12 Hour fora do calendário oficial"): revisar a tabela quando aparecerem.
- **MotoGP `Moto2`/`Moto3`**: TheSportsDB pode misturar as três classes na mesma liga. Decidir se viram esportes separados (`motogp`, `moto2`, `moto3`) ou se ficam todos sob `motogp` com `subtitle` indicando a classe. Recomendação: manter todos sob `motogp` por ora; criar slugs separados se feedback de usuários pedir filtros independentes.
- **Agrupamento entre fontes:** revisitar quando WEC ou MotoGP ganharem fonte secundária — a heurística de `eventGroupKey` provavelmente precisará ser mais robusta.
