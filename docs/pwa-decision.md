# Decisão: PWA vs React Native para o MVP

> **Decisão:** entregar o MVP como **PWA** (React + TypeScript + Vite + Tailwind + `vite-plugin-pwa`).
> **Status:** ratificada na TASK-3.1. Reavaliar quando houver tração validada.

---

## Resumo da decisão

| Critério | PWA (escolhido) | React Native | Veredito |
|---|---|---|---|
| Tempo até MVP | 1–2 semanas | 3–4 semanas | PWA — projeto pessoal, time-to-market manda |
| Distribuição | URL pública (sem revisão) | App stores (review ~3 dias por iteração) | PWA — itera mais rápido |
| Notificações push | Web Push (limitado no iOS < 16.4) | Nativo (APNs/FCM) | RN ganha em iOS antigo, mas o gap fecha em iOS 16.4+ |
| "Add to Home Screen" | Funciona em Android e iOS | App ícone nativo | Empate funcional |
| Offline | Service Worker (Workbox via plugin) | RN AsyncStorage + cache manual | Empate |
| Performance | Suficiente para listas e calendário | Suficiente, vantagem em animações pesadas | Empate (caso de uso é leve) |
| Stack já dominada | React/Tailwind ✅ | Expo é parecido mas com pegadinhas | PWA |
| Custo de migração depois | Médio (rewrite de UI) | n/a | Aceitável: backend é o mesmo |

**Conclusão:** o ganho do React Native (push iOS impecável, animações nativas) não compensa o custo extra para o MVP. Se a tração validar, migrar para RN na v2 reaproveita 100% do backend.

---

## Stack do PWA

| Camada | Escolha | Versão | Por quê |
|---|---|---|---|
| Bundler | Vite | 6.x | Dev server rápido, HMR nativo, suporte direto a TS/JSX |
| Framework | React | 19.x | Já usado pelo time; ecossistema maduro |
| Estilos | Tailwind CSS | 4.x | Mobile-first com utilitários; design tokens via `@theme` |
| Roteamento | react-router-dom | 7.x | Padrão de fato; suporta `createBrowserRouter` |
| Estado de servidor | @tanstack/react-query | 5.x | Cache, retry e revalidação prontos |
| Datas / fuso | dayjs + plugins `utc`, `timezone` | 1.x | Bundle leve; cobre toda a UX de horário |
| PWA | vite-plugin-pwa (Workbox) | 0.x | Manifest + service worker com runtime caching |

`@tailwindcss/vite` foi adotado em vez do PostCSS para alinhar com Tailwind v4 (sem `tailwind.config.js` — tokens em `src/styles.css`).

---

## Estrutura de rotas

```
/                  → Navigate replace para /calendar
/calendar          → Tela principal (TASK-3.2)
/events/:id        → Detalhe de evento (TASK-3.3)
/settings          → Preferências de fuso e esportes (TASK-3.4)
/onboarding        → Primeiro acesso (TASK-3.6)
/*                 → Navigate replace para /calendar
```

Todas as rotas compartilham o `AppLayout` (header sticky + container mobile-first com `max-width: 480px` e safe-area paddings).

---

## Manifest e service worker

- `manifest.webmanifest` é gerado por `vite-plugin-pwa`. Os ícones estão em `apps/web/public/icons/` (192×192, 512×512 e variante `maskable`). Os PNGs atuais são placeholders 1×1 — devem ser substituídos por arte definitiva antes do lançamento.
- Estratégias de cache em runtime (Workbox):
  - `GET /api/events` e `GET /api/events?...` → `NetworkFirst`, TTL 1h, timeout 5s.
  - `GET /api/events/:id` → `NetworkFirst`, TTL 15min.
  - `GET /api/sports` → `StaleWhileRevalidate`, TTL 24h.
- `navigateFallback: '/index.html'` permite a SPA carregar offline a partir do shell.
- `devOptions.enabled: false` — o SW só ativa em build de produção / preview, evitando comportamentos surpresa em dev (cache "fantasma" de respostas).

---

## Cliente da API

`apps/web/src/lib/api.ts` expõe um wrapper `fetch` tipado, com `ApiError` no caminho de erro. Tudo passa pelo TanStack Query:

```ts
const { data } = useQuery({
  queryKey: ['events', filter],
  queryFn: () => api.getEvents(filter)
});
```

`VITE_API_URL` (default `http://localhost:3000`) determina a base. Em produção, será apontado para o domínio do backend.

---

## Fuso horário

`src/lib/timezone.ts` detecta com `Intl.DateTimeFormat().resolvedOptions().timeZone` e persiste em `localStorage`. O `TimezoneContext` deixa o valor disponível em qualquer página e dispara re-render quando o usuário troca o fuso. A formatação canônica (`formatEventTime`) gera strings tipo `Dom, 16 nov · 16h00`.

---

## Checklist da definição de pronto

- [x] `npm run dev` (workspace `apps/web`) abre o app sem erros.
- [x] Layout mobile-first sem scrollbar horizontal em 375px (container `max-w-[480px]`, `overflow-x: hidden` no body).
- [x] `npm run build` gera `dist/` com `manifest.webmanifest`, ícones e service worker.
- [x] Documento `docs/pwa-decision.md` registrando a decisão.
- [ ] Lighthouse PWA score > 80 — checar no preview/produção (icons placeholder podem custar pontos até a arte final entrar).

---

## Pendências conhecidas para sprints seguintes

- **Ícones definitivos.** Placeholders 1×1 atendem o manifest mas não passam no Lighthouse de produção. Trocar por PNGs 192/512 e variante maskable antes do lançamento.
- **Detecção de instalabilidade.** Adicionar handler para `beforeinstallprompt` quando a TASK-3.6 (onboarding) entrar — boa hora para sugerir "Adicionar à tela inicial".
- **Web Push.** Sprint 4 traz a integração com `POST /api/notifications/subscribe`; o esqueleto do service worker já está pronto para receber `push` events.
- **Tema claro.** Hoje só existe o tema escuro definido em `@theme`. Avaliar `prefers-color-scheme` na Sprint 4.
