# Sprint 4 — Notificações e Lançamento

> **Duração:** Semanas 7–8  
> **Objetivo:** Implementar notificações push, realizar testes com usuários reais, otimizar performance, fazer o deploy de produção e lançar o produto.  
> **Entregável ao final:** Produto em produção, acessível por URL pública, com notificações push funcionando, landing page no ar e primeiros usuários externos usando.

---

## Contexto para a IA

Esta é a sprint de "go to market". O produto está funcionando — agora precisa estar em produção, ser encontrado, e os primeiros usuários reais precisam ter uma boa experiência.

Dois elementos são críticos nesta sprint: (1) as **notificações push**, que são o principal diferencial de retenção do produto (um app de calendário sem notificações não tem motivo para ser aberto ativamente), e (2) a **performance e confiabilidade** do sistema em produção real.

O lançamento não precisa ser grandioso — um post bem colocado no r/formula1 ou em grupos de motorsport pode trazer os primeiros 100–500 usuários e validar o produto.

---

## Tarefas

---

### TASK-4.1 — Sistema de notificações push (Web Push)
**Responsável:** Codex  
**Tipo:** Implementação complexa

#### O que fazer

Implementar o sistema completo de notificações Web Push usando o protocolo VAPID.

**Passo 1 — Gerar chaves VAPID:**

```bash
# Instalar web-push globalmente para gerar as chaves
npx web-push generate-vapid-keys
# Salvar os valores gerados em VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env
```

**Passo 2 — Backend: endpoint de inscrição:**

```typescript
// apps/api/src/routes/notifications.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/notifications/subscribe
router.post('/notifications/subscribe', async (req, res) => {
  const schema = z.object({
    eventId:       z.string().uuid(),
    minutesBefore: z.number().int().min(5).max(1440).default(30),
    subscription: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth:   z.string()
      })
    })
  });
  
  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: data.error.flatten() });
  
  const { eventId, minutesBefore, subscription } = data.data;
  
  // Verificar se o evento existe e ainda não aconteceu
  const event = await eventsService.findById(eventId);
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  
  const eventTime = new Date(event.startsAt);
  if (eventTime < new Date()) {
    return res.status(422).json({ error: 'Evento já aconteceu' });
  }
  
  // Salvar inscrição (userId é opcional no MVP — identificar por endpoint)
  await db.query(`
    INSERT INTO notification_subscriptions 
      (event_id, minutes_before, push_endpoint, push_keys)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (push_endpoint, event_id, minutes_before) DO NOTHING
  `, [eventId, minutesBefore, subscription.endpoint, JSON.stringify(subscription.keys)]);
  
  res.status(201).json({ message: 'Inscrição realizada com sucesso' });
});

// DELETE /api/notifications/:id
router.delete('/notifications/:id', async (req, res) => {
  await db.query('DELETE FROM notification_subscriptions WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
```

**Passo 3 — Backend: cron job de disparo:**

```typescript
// apps/api/src/scheduler/jobs/notifications.job.ts
export async function dispatchPendingNotifications(db: Pool): Promise<void> {
  // Buscar notificações que devem ser enviadas agora
  const pending = await db.query(`
    SELECT ns.*, e.title, e.subtitle, e.sport_id, e.starts_at,
           s.name as sport_name, s.category as sport_category
    FROM notification_subscriptions ns
    JOIN events e ON ns.event_id = e.id
    JOIN sports s ON e.sport_id = s.id
    WHERE ns.sent_at IS NULL
      AND e.starts_at <= NOW() + (ns.minutes_before || ' minutes')::interval
      AND e.starts_at > NOW()  -- evento ainda não começou
      AND e.status != 'cancelled'
  `);
  
  for (const notif of pending.rows) {
    try {
      const payload = JSON.stringify({
        title: `${sportEmoji(notif.sport_category)} ${notif.sport_name} começa em ${notif.minutes_before}min!`,
        body:  `${notif.title}${notif.subtitle ? ` — ${notif.subtitle}` : ''}`,
        icon:  `/icons/icon-192.png`,
        data:  { eventId: notif.event_id, url: `/events/${notif.event_id}` }
      });
      
      await webpush.sendNotification(
        {
          endpoint: notif.push_endpoint,
          keys:     notif.push_keys
        },
        payload
      );
      
      await db.query(
        'UPDATE notification_subscriptions SET sent_at = NOW() WHERE id = $1',
        [notif.id]
      );
      
    } catch (err) {
      if (err.statusCode === 410) {
        // Endpoint inválido (usuário removeu permissão) — deletar
        await db.query(
          'DELETE FROM notification_subscriptions WHERE id = $1',
          [notif.id]
        );
        logger.info({ notifId: notif.id }, 'Inscrição removida: endpoint inválido (410)');
      } else {
        logger.error({ notifId: notif.id, err }, 'Falha ao enviar notificação');
      }
    }
  }
}
```

**Registrar no scheduler com frequência de 5 minutos:**

```typescript
cron.schedule('*/5 * * * *', () => dispatchPendingNotifications(db));
```

**Passo 4 — Frontend: inscrição com Service Worker:**

```typescript
// apps/web/src/lib/push.ts

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;   // browser não suporta
  }
  
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  return subscription;
}

export async function subscribeToEvent(eventId: string, minutesBefore: number): Promise<void> {
  const subscription = await subscribeToPush();
  if (!subscription) throw new Error('Notificações não disponíveis neste dispositivo');
  
  await api.subscribeToNotification({
    eventId,
    minutesBefore,
    subscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth:   arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}
```

**Service Worker — receber notificação em background (`public/sw.js`):**

```javascript
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Sports Calendar', {
      body:    data.body,
      icon:    data.icon ?? '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      data:    data.data,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const url = event.notification.data?.url ?? '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
```

#### Definição de pronto
- Clicar em "Notificar antes" em um evento inscreve o browser corretamente
- Notificação aparece no dispositivo no horário configurado
- Se o usuário revogar permissão, a inscrição é deletada no próximo disparo (status 410)
- Cron job de notificações roda a cada 5 min (verificar nos logs)
- Funciona em Android Chrome (principal plataforma mobile)
- Teste manual: criar evento com `starts_at = NOW() + 6 minutos`, inscrever com 5 min antes, aguardar

---

### TASK-4.2 — Testes com usuários reais
**Responsável:** Ambos  
**Tipo:** Pesquisa e validação

#### O que fazer

Antes de lançar publicamente, realizar testes com 5–10 pessoas reais do nicho de motorsport.

**Codex — preparar ambiente de staging:**

Criar uma instância de staging no Railway ou Render com dados reais populados. O ambiente deve ser acessível por URL pública mas não indexado por search engines (header `X-Robots-Tag: noindex`).

Script para popular staging com dados realistas:

```typescript
// infra/seed-staging.ts
// Roda sync completo de todos os adaptadores
// Cria alguns eventos "ao vivo" simulados para demonstração
```

**Claude — definir roteiro de testes e analisar resultados:**

**Perfil dos testadores:**
- 3–5 fãs de motorsport (F1, WEC ou MotoGP)
- Diversidade de dispositivos: Android e iOS, diferentes navegadores
- Preferencialmente de diferentes fusos horários (para validar a conversão)

**Tarefas do teste (cada testador faz individualmente, sem ajuda):**

```
1. "Abra o app e me diga quando é o próximo evento de Fórmula 1"
   → Mede: tempo até encontrar a informação, clareza dos filtros

2. "Adicione o próximo GP ao seu Google Calendar"
   → Mede: descobribilidade do botão, funcionalidade do export

3. "Configure para receber uma notificação 30 minutos antes da próxima corrida da WEC"
   → Mede: fluxo de notificações, clareza do feedback

4. "Mude o horário para mostrar no horário de Lisboa"
   → Mede: descobribilidade das settings, clareza da mudança de fuso
```

**O que coletar:**
- Tempo em cada tarefa
- Pontos onde o testador hesitou ou precisou de ajuda
- Comentários espontâneos ("achei legal que...", "fiquei confuso quando...")
- Rating final: "Em uma escala de 1-10, o quanto você usaria esse app regularmente?"

**Critérios de validação do produto:**
- Rating médio ≥ 7/10
- Tarefa 1 concluída em < 30 segundos por pelo menos 80% dos testadores
- Pelo menos 3 dos 5 testadores completam o export para o Google Calendar sem ajuda

**Output:** documento `docs/user-testing-results.md` com achados e lista priorizada de melhorias.

---

### TASK-4.3 — Revisão final de performance
**Responsável:** Claude  
**Tipo:** Revisão

#### O que fazer

Identificar e corrigir gargalos de performance antes do lançamento público.

**1. Queries lentas no banco:**

Executar todas as queries principais com `EXPLAIN ANALYZE` e verificar:

```sql
-- Query crítica: listar eventos filtrados
EXPLAIN ANALYZE
SELECT e.*, s.slug, s.name, s.category
FROM events e
JOIN sports s ON e.sport_id = s.id
WHERE s.slug = ANY(ARRAY['f1', 'wec'])
  AND e.starts_at >= '2025-05-01'
  AND e.starts_at <= '2025-05-31'
  AND s.is_active = true
ORDER BY e.starts_at
LIMIT 50;

-- Verificar: está usando os índices? (Bitmap Index Scan ou Index Scan, não Seq Scan)
-- Se Seq Scan: adicionar índice composto em (sport_id, starts_at)
```

Queries suspeitas a verificar:
- `findEvents` com múltiplos esportes e range de datas
- Query de notificações pendentes (crítica — roda a cada 5 min)
- Contagem total para paginação (`COUNT(*)` pode ser lento)

**Otimização de COUNT para paginação:**

```sql
-- Evitar COUNT(*) completo — usar estimate do postgres para listas grandes
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'events';
-- Suficiente para mostrar "~1.200 eventos" sem query cara
```

**2. Bundle size do frontend:**

```bash
npm run build --workspace=apps/web
# Verificar output do Vite — o bundle principal deve ser < 200KB gzipped

# Suspects comuns de bundle grande:
# - dayjs com todos os locales (usar import seletivo)
# - Importação de ical-generator no frontend (não deve estar — é só backend)
# - Importação de módulos Node.js via polyfill (checar se algo usa path, fs, etc.)
```

**Ações para reduzir bundle:**
- Lazy loading de rotas com `React.lazy()` e `Suspense`
- Tree shaking do dayjs: `import dayjs from 'dayjs'` + plugins específicos (não `import 'dayjs/plugin/all'`)
- Verificar se alguma dependência grande pode ser substituída por alternativa menor

**3. Tempo de carregamento no mobile:**

Testar no Chrome DevTools com throttle de "Slow 3G":
- First Contentful Paint deve ser < 3s
- Time to Interactive deve ser < 5s

Se estiver acima: ativar `preconnect` para o domínio da API e verificar se as fontes estão sendo carregadas de forma eficiente.

**Output:** relatório `docs/performance-review.md` com queries problemáticas identificadas, bundle size antes e depois, e TTI medido.

---

### TASK-4.4 — Deploy: backend em Railway + PWA em Vercel
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

**1. Backend no Railway:**

```yaml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/api/Dockerfile"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"

[[services]]
name = "postgres"
image = "postgres:16-alpine"

[[services]]
name = "redis"
image = "redis:7-alpine"
```

Configurar no Railway:
- Variáveis de ambiente via painel (nunca via arquivo commitado)
- Volume persistente para PostgreSQL
- Domínio personalizado: `api.sportscalendar.app`

**2. Frontend no Vercel:**

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

O Service Worker precisa de header `Cache-Control: no-cache` para que o browser verifique atualizações a cada visita.

**3. CI/CD com GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: api

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**4. Monitoramento básico:**

- **UptimeRobot** (gratuito): checar `GET /health` a cada 5 minutos. Alerta por e-mail se cair.
- **Railway logs**: disponível no painel, sem configuração adicional
- **Vercel Analytics**: ativar para ver pageviews e Web Vitals

#### Definição de pronto
- API acessível em `https://api.sportscalendar.app/health` retornando 200
- PWA acessível em `https://sportscalendar.app` e instalável no Android
- Deploy automático ao fazer push na `main` (testar com um commit de teste)
- UptimeRobot configurado e enviando alertas para o e-mail do dev
- Migrations aplicadas automaticamente no deploy (script de migration roda antes do start)

---

### TASK-4.5 — Landing page e estratégia de lançamento
**Responsável:** Claude  
**Tipo:** Conteúdo e estratégia

#### O que fazer

**Landing page simples (`/landing` ou domínio separado):**

Estrutura mínima para converter visitantes:

```
[Header]
Sports Calendar
O calendário que reúne F1, WEC e MotoGP em um só lugar

[Hero]
Nunca mais perca uma largada
Todos os horários no seu fuso, com notificação push antes de começar

[3 features]
🗓 Calendário unificado    🔔 Notificações push    📅 Export para Google Calendar
F1, WEC, MotoGP            Avise-me antes          Um clique para sua agenda

[CTA]
[Abrir o calendário →]    (sem cadastro necessário)

[Footer]
Feito para fãs de motorsport · Gratuito · Sem anúncios
```

**Não usar:** formulário de e-mail, waitlist, ou qualquer fricção. O CTA vai direto para o app.

**Estratégia de lançamento para os primeiros usuários:**

Escrever posts para os seguintes canais (1 por canal, adaptado ao tom de cada um):

**Reddit r/formula1 (500k membros):**
```
Título: "Fiz um app gratuito que junta o calendário de F1, WEC e MotoGP — 
         com notificação push antes das largadas"

Texto: [descrever o problema pessoal que levou a criar], [o que o app faz],
       [link], [screenshots do calendário e da notificação]
       "Sem cadastro, sem anúncios, código aberto no futuro"
```

**Reddit r/wec (nicho mais receptivo a ferramentas novas):**
```
Adaptar o mesmo texto com foco em WEC — mencionar que não existe nada parecido
específico para endurance racing
```

**Grupos de Facebook / WhatsApp de motorsport brasileiros:**
Texto mais informal, em português, focando no horário local (problema concreto para brasileiros que assistem corridas europeias às 8h da manhã)

**Regras para o post no Reddit:**
- Postar na hora de maior atividade (10h–14h horário de Brasília = 13h–17h UTC)
- Responder todos os comentários nas primeiras 2 horas
- Não ser defensivo com críticas — usar como feedback
- Ter o app 100% funcional antes de postar (zero bugs visíveis)

**Métricas de sucesso do lançamento:**
- 100 usuários únicos na primeira semana
- 20+ inscrições em notificações push
- Rating ≥ 4/5 em comentários do Reddit
- Pelo menos 1 bug crítico identificado pela comunidade (sinal de uso real)

#### Definição de pronto
- Landing page no ar em `sportscalendar.app` (ou subdomínio)
- Posts escritos e revisados (ainda não publicados)
- App em produção sem bugs críticos conhecidos
- Monitoramento ativo para detectar problemas nas primeiras horas após lançamento

---

## Checklist Final do MVP

- [ ] Notificações push funcionando em Android Chrome
- [ ] Deploy em produção (API no Railway + PWA no Vercel)
- [ ] CI/CD configurado e testado
- [ ] UptimeRobot monitorando o /health
- [ ] Testes com 5 usuários reais realizados e resultados documentados
- [ ] Performance: FCP < 3s em 3G lento, queries < 100ms
- [ ] Landing page no ar
- [ ] Posts de lançamento escritos e prontos para publicar
- [ ] Zero bugs críticos conhecidos
- [ ] Documento `docs/user-testing-results.md` criado

---

## O que não entrou no MVP (backlog v1.1)

- **UFC e Tênis** (estrutura já preparada na Sprint 2 — apenas ativar os adaptadores)
- **Autenticação e perfil de usuário** (MVP funciona sem login)
- **Resultados históricos** (campo `raw_data` já armazena os dados)
- **App na Google Play Store** (PWA é suficiente para MVP)
- **Filtro por país/venue** (adicionar query param na API)
- **Dark mode** (base de CSS já permite, falta implementar toggle)
- **Compartilhar evento** (Web Share API — 2h de implementação, reservar para v1.1)

---

## Dependências e Bloqueios

- Sprint 3 deve estar 100% concluída
- **TASK-4.1 pode começar imediatamente** — não depende de outras tasks desta sprint
- **TASK-4.4 pode ser feita em paralelo com TASK-4.1**
- **TASK-4.2 depende de TASK-4.4** — testes com usuários precisam de URL pública
- **TASK-4.3 pode ser feita a qualquer momento após Sprint 3**
- **TASK-4.5 deve ser a última** — lançar apenas depois que tudo estiver validado

---

## Notas Técnicas

- Web Push não funciona em iOS Safari (versões < 16.4) — mencionar esta limitação na landing page e focar no Android para MVP
- iOS 16.4+ suporta Web Push mas apenas para PWAs instaladas (adicionadas à tela inicial) — não via browser diretamente
- O `VAPID_PUBLIC_KEY` vai para o frontend (variável `VITE_VAPID_PUBLIC_KEY`) — é seguro ser público
- O `VAPID_PRIVATE_KEY` fica apenas no backend — nunca expor no frontend
- Railway gratuito tem 500h/mês de uso — suficiente para o MVP, mas monitorar o consumo
- Vercel gratuito tem 100GB de bandwidth/mês — mais do que suficiente para o início
