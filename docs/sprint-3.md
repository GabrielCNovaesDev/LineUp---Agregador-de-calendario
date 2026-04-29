# Sprint 3 — App Mobile / PWA

> **Duração:** Semanas 5–6  
> **Objetivo:** Construir o frontend PWA com calendário interativo, filtros por esporte, tela de detalhe de evento, conversão de fuso horário e export iCal.  
> **Entregável ao final:** Um usuário consegue acessar o app pelo browser mobile, selecionar seus esportes favoritos, ver os próximos eventos no calendário e exportar para o Google Calendar.

---

## Contexto para a IA

Esta sprint entrega o produto nas mãos dos primeiros usuários. O stack é **React + TypeScript + Tailwind CSS + Vite**, com configuração PWA via `vite-plugin-pwa`.

O foco de UX é **mobile-first** — a maioria dos usuários vai acessar pelo celular para checar horários de forma rápida. A interface deve ser limpa e direta: mínimo de cliques para ver "quando é o próximo evento de F1?".

A conversão de fuso horário é o detalhe mais crítico de UX — um usuário em Aracaju que vê "14:00" e chega na hora errada vai desinstalar o app imediatamente. Toda exibição de horário deve deixar claro que está no horário local do usuário.

---

## Tarefas

---

### TASK-3.1 — Decisão e setup: PWA vs React Native
**Responsável:** Claude  
**Tipo:** Decisão de design + setup

#### Análise da decisão

**PWA (escolha recomendada para o MVP):**

| Critério | PWA | React Native |
|---|---|---|
| Tempo até MVP | 1-2 semanas | 3-4 semanas |
| Notificações push | ✅ Web Push API | ✅ Nativo |
| Add to Home Screen | ✅ Funciona no Android | ✅ App store |
| Distribuição | URL (sem app store) | App store (review ~3 dias) |
| Dev já conhece | ✅ React/Tailwind | ⚠️ Expo é similar mas diferente |
| Offline | ✅ Service Worker | ✅ |
| Performance | ✅ Suficiente para calendário | ✅ |

**Decisão: PWA.** O ganho de React Native não justifica o custo adicional para um MVP de calendário. Se a tração validar o produto, migrar para React Native na v2 é viável — o backend é idêntico.

#### Setup do Vite com PWA

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Sports Calendar',
        short_name: 'SportsCAL',
        description: 'Calendário unificado de eventos esportivos',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-72.png',   sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96.png',   sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128.png',  sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/events/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-events',
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 }
            }
          }
        ]
      }
    })
  ]
});
```

**Estrutura de rotas (React Router):**

```
/                     → redirect para /calendar
/calendar             → tela principal: calendário com filtros
/events/:id           → detalhe de um evento
/settings             → preferências: fuso, esportes favoritos
/onboarding           → seleção de esportes (first run)
```

**Client da API:**

```typescript
// apps/web/src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = {
  getEvents: (params: EventsParams) => 
    fetch(`${BASE_URL}/api/events?${new URLSearchParams(params as any)}`)
      .then(r => r.json()),
  
  getSports: () =>
    fetch(`${BASE_URL}/api/sports`).then(r => r.json()),
  
  getEvent: (id: string, tz?: string) =>
    fetch(`${BASE_URL}/api/events/${id}${tz ? `?tz=${tz}` : ''}`).then(r => r.json()),
  
  exportICal: (params: EventsParams) =>
    `${BASE_URL}/api/events/export/ical?${new URLSearchParams(params as any)}`
    // Retorna URL direta (link de download), não fetch
};
```

#### Definição de pronto
- `npm run dev` abre o app no browser sem erros
- Em mobile (Chrome DevTools device mode): app parece nativo, sem scrollbar horizontal
- Lighthouse PWA score > 80 no modo dev
- Documento `docs/pwa-decision.md` registrando a decisão

---

### TASK-3.2 — Tela principal: calendário com filtros
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Criar a tela principal em `apps/web/src/pages/Calendar.tsx`.

**Layout mobile (375px):**

```
┌─────────────────────────────────────┐
│ Sports Calendar              ⚙ 🔔   │  ← header fixo
├─────────────────────────────────────┤
│ [F1] [WEC] [MotoGP]        Filtros  │  ← filtros de esporte (chips)
├─────────────────────────────────────┤
│ ← Maio 2025 →                       │  ← navegação de mês
│                                     │
│  HOJE                               │  ← agrupamento por data
│  ┌─────────────────────────────┐    │
│  │ 🏎 GP Brasil — Corrida      │    │  ← EventCard
│  │ F1 · Interlagos             │    │
│  │ Dom 16h00 (horário Aracaju) │    │
│  └─────────────────────────────┘    │
│                                     │
│  AMANHÃ                             │
│  ┌─────────────────────────────┐    │
│  │ 🏎 WEC — 6h de Spa          │    │
│  │ WEC · Spa-Francorchamps     │    │
│  │ Sáb 09h00 (horário Aracaju) │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Componente `SportFilterChip`:**

```typescript
interface SportFilterChipProps {
  sport: { slug: string; name: string };
  isActive: boolean;
  onToggle: (slug: string) => void;
}

// Chips horizontais com scroll, sem quebra de linha
// Chip ativo: fundo colorido por categoria (motorsport = vermelho, etc.)
// Chip inativo: borda cinza, fundo transparente
```

**Componente `EventCard`:**

```typescript
interface EventCardProps {
  event: Event;
  userTimezone: string;
  onClick: (id: string) => void;
}

// Card com:
// - Emoji da categoria (🏎 motorsport, 🥊 MMA, 🎾 tênis)
// - Título em destaque
// - Sport + venue em texto secundário
// - Horário local formatado: "Dom, 16 mai · 16h00"
// - Badge de status: "AO VIVO" (vermelho pulsante), "EM 2H" (amarelo), "CONCLUÍDO" (cinza)
// - Status CANCELLED: card com opacity reduzida e texto "Cancelado"
```

**Agrupamento por data:**

```typescript
function groupEventsByDate(events: Event[]): Map<string, Event[]> {
  const groups = new Map<string, Event[]>();
  
  for (const event of events) {
    const dateKey = dayjs(event.localTime).format('YYYY-MM-DD');
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(event);
  }
  
  return new Map([...groups.entries()].sort());
}

function formatDateLabel(dateKey: string, userTimezone: string): string {
  const date = dayjs(dateKey);
  const today = dayjs().tz(userTimezone).format('YYYY-MM-DD');
  const tomorrow = dayjs().tz(userTimezone).add(1, 'day').format('YYYY-MM-DD');
  
  if (dateKey === today) return 'Hoje';
  if (dateKey === tomorrow) return 'Amanhã';
  return date.format('ddd, DD MMM').toUpperCase();  // 'SEG, 19 MAI'
}
```

**Gerenciamento de estado com TanStack Query:**

```typescript
// Estado dos filtros no URL (para compartilhamento e navegação)
// /calendar?sports=f1,wec&month=2025-05

const [searchParams, setSearchParams] = useSearchParams();
const activeSports = searchParams.get('sports')?.split(',') ?? [];
const month = searchParams.get('month') ?? dayjs().format('YYYY-MM');

const { data, isLoading, error } = useQuery({
  queryKey: ['events', activeSports, month],
  queryFn: () => api.getEvents({
    sports: activeSports.join(','),
    from: dayjs(month).startOf('month').toISOString(),
    to:   dayjs(month).endOf('month').toISOString(),
    tz:   userTimezone,
    limit: 100
  })
});
```

**Empty state:**

```
Nenhum evento encontrado para os filtros selecionados.
[Selecionar outros esportes]   ← botão que vai para /settings
```

#### Definição de pronto
- Calendário carrega com eventos reais da API
- Filtros de esporte funcionam e atualizam a lista
- Navegação de mês (anterior/próximo) funciona
- Horários exibidos no fuso do usuário (detectado automaticamente via `Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Scroll infinito ou paginação funciona
- Loading skeleton aparece enquanto os dados carregam
- Empty state presente

---

### TASK-3.3 — Tela de detalhe do evento
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Criar `apps/web/src/pages/EventDetail.tsx`.

**Layout:**

```
┌─────────────────────────────────────┐
│ ← Voltar                            │  ← header com back
├─────────────────────────────────────┤
│                                     │
│  🏎 Fórmula 1                       │  ← categoria + esporte
│                                     │
│  Grande Prêmio do Brasil            │  ← título
│  Corrida                            │  ← subtitle
│                                     │
│  📍 Autódromo José Carlos Pace      │  ← venue
│     São Paulo, Brasil               │
│                                     │
│  🕐 Dom, 16 nov · 16h00            │  ← horário local
│     (14h00 UTC · Round 21)          │  ← UTC como referência
│                                     │
│  Duração estimada: 2h               │
│                                     │
│  Status: ● Confirmado               │
│                                     │
├─────────────────────────────────────┤
│  [🔔 Notificar antes]               │  ← ação principal
│  [📅 Adicionar ao Google Calendar]  │  ← export iCal
│  [📋 Copiar horário]                │  ← copia texto formatado
└─────────────────────────────────────┘
```

**Botão "Notificar antes":**

Ao clicar:
1. Se notificações não foram permitidas: abre dialog de permissão do browser
2. Se permitidas: mostra opções de antecedência (15 min, 30 min, 1h, 1 dia)
3. Chama `POST /api/notifications/subscribe`
4. Confirma com toast "Você será notificado Xmin antes do evento"

**Botão "Adicionar ao Google Calendar":**

```typescript
// Gera link direto para Google Calendar (sem precisar de arquivo .ics)
function getGoogleCalendarUrl(event: Event): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🏎 ${event.title}${event.subtitle ? ` — ${event.subtitle}` : ''}`,
    dates: `${formatGCalDate(event.startsAt)}/${formatGCalDate(event.endsAt ?? addHours(event.startsAt, 2))}`,
    details: `${event.sport.name} · Round ${event.roundNumber ?? ''}`,
    location: [event.venue, event.country].filter(Boolean).join(', ')
  });
  
  return `https://calendar.google.com/calendar/render?${params}`;
}

function formatGCalDate(date: string): string {
  // Google Calendar usa formato: 20250316T050000Z
  return new Date(date).toISOString().replace(/[-:]/g, '').replace('.000', '');
}
```

**Botão "Copiar horário":**

```typescript
// Copia texto formatado para a área de transferência
// Exemplo: "🏎 GP Brasil — Corrida (F1)\nDom, 16 nov · 16h00 (Aracaju)"
async function copyEventTime(event: Event, tz: string): Promise<void> {
  const text = formatEventForShare(event, tz);
  await navigator.clipboard.writeText(text);
  // Mostrar toast "Copiado!"
}
```

#### Definição de pronto
- Página carrega com dados do evento corretos
- Horário local e UTC exibidos corretamente
- Botão Google Calendar abre o Google Calendar com os dados preenchidos
- Botão Copiar copia o texto corretamente
- Voltar navega para o calendário na posição correta (não reseta scroll)

---

### TASK-3.4 — Conversão de fuso horário no frontend
**Responsável:** Ambos  
**Tipo:** Implementação + revisão

#### Parte Codex — Implementar detecção e persistência de fuso

```typescript
// apps/web/src/lib/timezone.ts

// Detectar timezone do browser (padrão)
export function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Retorna ex: 'America/Fortaleza' para usuários no NE do Brasil
}

// Persistir preferência no localStorage
export function getUserTimezone(): string {
  return localStorage.getItem('userTimezone') ?? detectTimezone();
}

export function setUserTimezone(tz: string): void {
  localStorage.setItem('userTimezone', tz);
}

// Formatar data para exibição
export function formatEventTime(isoDate: string, tz: string): string {
  return dayjs(isoDate).tz(tz).format('ddd, DD MMM · HH[h]mm');
  // Exemplo: "Dom, 16 nov · 16h00"
}

// Calcular tempo relativo até o evento
export function getTimeUntilEvent(isoDate: string): string {
  const diff = dayjs(isoDate).diff(dayjs(), 'minute');
  
  if (diff < 0) return 'Encerrado';
  if (diff < 60) return `Em ${diff}min`;
  if (diff < 1440) return `Em ${Math.floor(diff / 60)}h`;
  return `Em ${Math.floor(diff / 1440)} dias`;
}
```

**Seletor de fuso na tela de Settings:**

```typescript
// Lista de timezones relevantes para o Brasil e outros países comuns
const COMMON_TIMEZONES = [
  { label: 'Brasília / São Paulo (UTC-3)', value: 'America/Sao_Paulo' },
  { label: 'Fortaleza / Aracaju (UTC-3)', value: 'America/Fortaleza' },
  { label: 'Manaus (UTC-4)', value: 'America/Manaus' },
  { label: 'Lisboa / Portugal (UTC+1)', value: 'Europe/Lisbon' },
  { label: 'Londres (UTC+0/+1)', value: 'Europe/London' },
  { label: 'UTC', value: 'UTC' }
];

// Também oferecer campo de busca livre para fusos menos comuns
```

#### Parte Claude — Revisar e validar a UX de fuso horário

Identificar e documentar os pontos de confusão possíveis:

1. **Ambiguidade de "horário local":** quando o app exibe "16h00", o usuário sabe que é o horário **dele**? Verificar se há indicação visual clara (ex: "16h00 · Aracaju" ou "16h00 (seu horário)").

2. **Mudança de horário de verão:** o Brasil aboliu o horário de verão em 2019, mas outros países não. Um evento na Europa em horário de verão europeu pode ser exibido errado se `dayjs.tz()` não estiver atualizado. Verificar se o bundle do dayjs inclui dados de timezone atualizados (`dayjs/locale/pt-br` e `@vvo/tzdb`).

3. **Evento "ao vivo" pode ter started_at no passado mas ainda estar acontecendo:** o badge "AO VIVO" deve basear-se no `status` da API, não em calcular se `now > starts_at`. Confirmar que o frontend usa `event.status === 'live'`, não lógica de tempo.

4. **Consistência entre telas:** o horário em `EventCard` (lista) e em `EventDetail` (detalhe) deve ser idêntico. Verificar se ambos usam a mesma função de formatação.

5. **Primeiro acesso sem timezone configurado:** o app detecta automaticamente o fuso do browser. Mas e se o browser retornar um timezone incorreto (raro mas acontece)? Oferecer feedback claro de qual fuso está sendo usado e como mudar.

**Output:** issues criados para cada problema identificado, com severidade e proposta de correção.

#### Definição de pronto
- Timezone detectado automaticamente no primeiro acesso
- Todos os horários exibidos no fuso do usuário
- Seletor de fuso funciona e persiste a preferência
- Mudança de fuso atualiza todos os horários da tela imediatamente
- Badge "AO VIVO" baseado no campo `status` da API, não em cálculo local

---

### TASK-3.5 — Export iCal (.ics)
**Responsável:** Codex  
**Tipo:** Implementação

#### O que fazer

Implementar o endpoint `GET /api/events/export/ical` no backend e o botão de export no frontend.

**Backend — geração do arquivo .ics:**

Instalar: `npm install ical-generator`

```typescript
// apps/api/src/routes/ical.ts
import ical from 'ical-generator';

router.get('/events/export/ical', async (req, res) => {
  const { sports, from, to } = parseICalParams(req.query);
  
  const events = await eventsService.findEvents({
    sportSlugs: sports,
    from,
    to,
    status: 'scheduled',   // apenas eventos futuros no export padrão
    limit: 500             // limite generoso para export
  });
  
  const calendar = ical({
    name: `Sports Calendar — ${sports.join(', ').toUpperCase()}`,
    timezone: 'UTC',
    prodId: '//Sports Calendar//EN'
  });
  
  for (const event of events.data) {
    calendar.createEvent({
      id: `${event.sport.slug}-${event.externalId}@sportscalendar.app`,
      start: new Date(event.startsAt),
      end: event.endsAt ? new Date(event.endsAt) : addMinutes(new Date(event.startsAt), event.durationMinutes ?? 120),
      summary: `${sportEmoji(event.sport.category)} ${event.title}${event.subtitle ? ` — ${event.subtitle}` : ''}`,
      description: [
        `${event.sport.name}`,
        event.roundNumber ? `Round ${event.roundNumber}` : null,
        event.venue ?? null
      ].filter(Boolean).join(' · '),
      location: [event.venue, event.country].filter(Boolean).join(', '),
      status: event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
      url: `${process.env.FRONTEND_URL}/events/${event.id}`
    });
  }
  
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sports-calendar.ics"`);
  res.send(calendar.toString());
});
```

**Frontend — botão de export:**

```typescript
// Na tela de Settings ou no header do calendário
function ExportButton({ activeSports, month }: ExportButtonProps) {
  const url = api.exportICal({
    sports: activeSports.join(','),
    from: dayjs(month).startOf('month').toISOString(),
    to:   dayjs(month).add(6, 'month').endOf('month').toISOString()
    // Exporta os próximos 6 meses por padrão
  });
  
  return (
    <div>
      <a href={url} download="sports-calendar.ics">
        Exportar para Google Calendar / iCal
      </a>
      <p>Funciona com Google Calendar, Apple Calendar e Outlook</p>
    </div>
  );
}
```

#### Definição de pronto
- Download do arquivo `.ics` funciona no browser
- Arquivo importado no Google Calendar cria os eventos corretamente
- `UID` é determinístico (reimportar não cria duplicatas)
- Eventos cancelados têm `STATUS:CANCELLED` no iCal
- Filename do download é descritivo: `sports-calendar-f1-wec.ics`

---

### TASK-3.6 — Revisão de UX do onboarding
**Responsável:** Claude  
**Tipo:** Revisão e implementação

#### O que fazer

O onboarding é o primeiro contato do usuário com o produto. Se ele confundir ou não mostrar valor imediatamente, o usuário vai embora.

**Fluxo de onboarding proposto:**

```
1. Usuário acessa / pela primeira vez
   → Detectado por ausência de localStorage 'onboardingCompleted'
   → Redirect para /onboarding

2. Tela /onboarding:
   "Bem-vindo ao Sports Calendar"
   "Quais esportes você quer acompanhar?"
   
   [🏎 Fórmula 1]  [🏎 WEC]  [🏎 MotoGP]
   (todos pré-selecionados para motorsport)
   
   "Seu horário local: América/Fortaleza (UTC-3)"
   [Parece correto ✓]  [Mudar fuso]
   
   [Ver meu calendário →]

3. Salva preferências no localStorage
4. Redirect para /calendar com os filtros já aplicados
```

**Revisar e validar:**

1. A seleção prévia de todos os esportes de motorsport é a decisão certa? Ou melhor mostrar sem nenhum pré-selecionado e obrigar o usuário a escolher ativamente?
   - Recomendação: pré-selecionar todos — mostrar valor imediatamente é mais importante do que forçar escolha ativa.

2. O fuso detectado automaticamente deve ser exibido em linguagem humana ("Horário de Brasília") ou técnico ("America/Sao_Paulo")? 
   - Recomendação: linguagem humana. Mapear os timezones brasileiros para nomes amigáveis.

3. Deve existir um passo de e-mail para cadastro? 
   - No MVP: não. Funcionalidade sem login primeiro, e-mail apenas para habilitar notificações push.

4. O que acontece se o usuário fechar o onboarding sem completar?
   - Salvar o estado parcial e perguntar na próxima visita, ou jogar direto para o calendário com filtros padrão (motorsport)?

**Implementar as correções identificadas e criar `apps/web/src/pages/Onboarding.tsx`.**

#### Definição de pronto
- Primeiro acesso sempre passa pelo onboarding
- Após onboarding, calendário abre com eventos visíveis imediatamente
- Fuso horário exibido em linguagem humana no onboarding
- Teste manual: abrir em modo incógnito e confirmar que o fluxo funciona do início ao fim

---

## Checklist de Conclusão da Sprint

- [ ] PWA instalável no Android Chrome (prompt "Adicionar à tela inicial")
- [ ] Calendário exibe eventos reais com filtros funcionando
- [ ] Todos os horários no fuso do usuário
- [ ] Tela de detalhe com botão Google Calendar funcionando
- [ ] Export iCal gera arquivo importável
- [ ] Onboarding funciona no primeiro acesso
- [ ] App funciona offline com dados em cache (testar com DevTools → Network → Offline)
- [ ] Lighthouse PWA score > 80
- [ ] Responsivo em 375px (iPhone SE) e 390px (iPhone 14)
- [ ] Sem erros no console em nenhuma das telas

---

## Dependências e Bloqueios

- Sprint 2 deve estar 100% concluída (API de eventos funcionando)
- **TASK-3.1 deve ser feita primeiro** — setup base antes de qualquer componente
- **TASK-3.2 e TASK-3.5 (backend do iCal) podem ser feitas em paralelo**
- **TASK-3.3 depende de TASK-3.2** — detalhe do evento pressupõe lista funcionando
- **TASK-3.4 pode ser feita em paralelo com TASK-3.2 e TASK-3.3**
- **TASK-3.6 pode ser feita em paralelo** — onboarding é uma página independente

---

## Notas Técnicas

- `vite-plugin-pwa` em modo dev não registra o Service Worker por padrão — usar `npm run preview` para testar o PWA completo
- Instalar `dayjs` com plugins: `npm install dayjs` — os plugins `utc` e `timezone` já vêm incluídos mas precisam ser ativados explicitamente
- `ical-generator` no backend — não existe equivalente leve para o frontend, então o export sempre vem da API
- TanStack Query: configurar `staleTime: 5 * 60 * 1000` (5 min) para eventos — evita refetch desnecessário ao navegar entre telas
- O link do Google Calendar (`calendar.google.com/render?action=TEMPLATE`) funciona sem autenticação — o Google pede login apenas na hora de salvar
- Testar notificações push requer HTTPS — usar ngrok ou similar em desenvolvimento, ou testar direto no deploy de staging
