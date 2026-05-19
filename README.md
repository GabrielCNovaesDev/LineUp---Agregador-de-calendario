# LineUp — Agregador de Calendário Esportivo

Calendário unificado de eventos de motorsport (F1, WEC, MotoGP) com conversão automática de fuso horário, agregando dados de múltiplas APIs externas em uma PWA mobile-first.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)

---

## 🎯 Sobre o projeto

Quem acompanha motorsport sabe o problema: calendários espalhados em sites diferentes, fusos horários confusos, e nenhuma fonte única que mostre "o que acontece essa semana" de forma clara. LineUp resolve isso agregando eventos de F1, WEC e MotoGP em um calendário unificado com horários convertidos automaticamente para o fuso do usuário.

O backend consome APIs externas (OpenF1 para Fórmula 1, TheSportsDB para WEC e MotoGP), normaliza os dados em um schema único, e os serve via REST API com cache inteligente. O frontend é uma PWA que funciona offline e prioriza a experiência mobile — onde a maioria dos fãs consulta horários de corrida.

O projeto nasceu de uma necessidade pessoal e evoluiu para uma aplicação com arquitetura de produção: retry com backoff, circuit breaker no health check, detecção de falhas silenciosas, e separação clara entre adaptadores de dados e regras de negócio.

---

## 🏗️ Arquitetura e decisões técnicas

```mermaid
graph TB
    subgraph External["APIs Externas"]
        OF1[OpenF1 API]
        TSDB[TheSportsDB API]
    end

    subgraph Backend["apps/api — Express 5"]
        SCHED[Scheduler / Cron Jobs]
        ADAPT[Adapters — packages/adapters]
        SVC[Services]
        ROUTES[Routes / REST API]
        CACHE[CacheService]
    end

    subgraph Infra["Infraestrutura"]
        PG[(PostgreSQL 16)]
        RD[(Redis 7)]
    end

    subgraph Frontend["apps/web — React 19 PWA"]
        UI[CalendarPage / EventDetail]
        RQ[React Query]
    end

    OF1 --> ADAPT
    TSDB --> ADAPT
    SCHED --> ADAPT
    ADAPT --> SVC
    SVC --> PG
    ROUTES --> SVC
    ROUTES --> CACHE
    CACHE --> RD
    UI --> RQ
    RQ --> ROUTES
```

### Decisões técnicas com trade-offs

> **Decisão:** Monorepo com npm workspaces (sem Turborepo/Nx)
> **Alternativas consideradas:** Monolito único, monorepo com Turborepo, repositórios separados
> **Por quê:** O projeto tem 3 pacotes com dependências claras entre si. Workspaces nativos do npm resolvem o linking sem adicionar complexidade de ferramentas externas.
> **Trade-off aceito:** Sem cache de build distribuído — aceitável para o tamanho atual do projeto.

> **Decisão:** Adapter Pattern para fontes externas com interface `SportAdapter`
> **Alternativas consideradas:** Fetch direto nos services, SDK de cada API, scraping
> **Por quê:** Cada API tem formato, rate limit e comportamento de erro diferentes. O adapter isola essa complexidade e permite adicionar novas fontes sem tocar no scheduler ou nos services.
> **Trade-off aceito:** Mais arquivos e indireção para 3 fontes — compensa quando a quarta chegar.

> **Decisão:** Cache com fallback gracioso (Redis opcional)
> **Alternativas consideradas:** Cache obrigatório (falha = 503), sem cache
> **Por quê:** Redis fora não deve derrubar a API. O `CacheService` trata qualquer erro de Redis como cache miss e vai direto ao banco. O health check usa circuit breaker para evitar que o load balancer drene todas as instâncias em outage global de Redis.
> **Trade-off aceito:** Latência maior quando Redis está fora, mas disponibilidade preservada.

> **Decisão:** Upsert com throttle temporal (`WHERE updated_at < NOW() - INTERVAL '1 hour'`)
> **Alternativas consideradas:** Upsert incondicional, diff de hash, versioning
> **Por quê:** Evita writes desnecessários quando o cron roda a cada 6h mas os dados não mudaram. Reduz I/O no banco sem complexidade de hashing.
> **Trade-off aceito:** Mudanças feitas pela API externa dentro da janela de 1h podem demorar até o próximo ciclo para refletir.

---

## 🛠️ Stack

| Camada | Tecnologia | Por que escolhi |
|--------|-----------|-----------------|
| Runtime | Node.js 20 + TypeScript 5.8 | Type safety end-to-end entre API e frontend |
| API | Express 5 | Framework maduro, middleware ecosystem, suporte nativo a async handlers |
| Banco | PostgreSQL 16 | JSONB para raw_data, UUID nativo, TIMESTAMPTZ para datas em UTC |
| Cache | Redis 7 + ioredis | TTL granular por tipo de dado, invalidação por pattern após sync |
| Scheduler | node-cron | Leve, sem dependência externa, suficiente para jobs periódicos |
| Frontend | React 19 + Vite 6 | HMR rápido, tree-shaking, build otimizado para PWA |
| Styling | Tailwind CSS 4 | Utility-first, sem CSS custom, dark mode nativo |
| Data fetching | TanStack Query 5 | Cache client-side, paginação infinita, stale-while-revalidate |
| PWA | vite-plugin-pwa + Workbox | Service worker gerado automaticamente, offline support |
| Infra local | Docker Compose | PostgreSQL + Redis com um comando, sem instalar nada na máquina |

---

## 📁 Estrutura de pastas

```
LineUp---Agregador-de-calendario/
├── apps/
│   ├── api/                    # Backend REST — Express 5
│   │   ├── src/
│   │   │   ├── config/         # Variáveis de ambiente tipadas
│   │   │   ├── lib/            # Database pool, Redis client, CacheService
│   │   │   ├── middleware/     # Error handler centralizado
│   │   │   ├── routes/         # Endpoints REST (events, health, admin)
│   │   │   ├── scheduler/      # Cron jobs + SyncRunner
│   │   │   └── services/       # Regras de negócio (upsert, listagem, freshness, alertas)
│   │   └── openapi.yaml        # Especificação OpenAPI 3.0 completa
│   └── web/                    # Frontend PWA — React 19
│       └── src/
│           ├── app/            # Layout, router, contextos (timezone)
│           ├── lib/            # API client, tipos, utilitários de timezone
│           └── pages/          # CalendarPage, EventDetail, Settings, Onboarding
├── packages/
│   ├── adapters/               # Adaptadores para APIs externas (OpenF1, TheSportsDB)
│   └── shared/                 # Tipos compartilhados (EventStatus, etc.)
├── infra/
│   ├── docker-compose.yml      # PostgreSQL 16 + Redis 7
│   ├── migrate.js              # Runner de migrations
│   └── migrations/             # 12 migrations SQL sequenciais
├── docs/                       # ADRs, runbooks, estratégia de resiliência
└── package.json                # Workspace root
```

---

## 🚀 Como rodar localmente

### Pré-requisitos

- Node.js 20+
- Docker 24+ e Docker Compose
- npm 10+

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/GabrielCNovaesDev/LineUp---Agregador-de-calendario.git
cd LineUp---Agregador-de-calendario

# 2. Instale as dependências (workspaces resolvem tudo)
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. Suba a infraestrutura (PostgreSQL + Redis)
docker compose -f infra/docker-compose.yml up -d

# 5. Rode as migrations
npm run migrate

# 6. Inicie API + Frontend simultaneamente
npm run dev
```

### Verificando que funcionou

- **API:** `http://localhost:3000/health` → deve retornar `{ "status": "ok" }`
- **Frontend:** `http://localhost:5173` → calendário com eventos carregados
- **Endpoints:** `http://localhost:3000/api/events` → lista de eventos paginada

O comando `npm run dev` já sobe a infra, roda migrations e inicia ambos os servidores com hot reload.

---

## 🔐 Variáveis de ambiente

| Variável | Descrição | Exemplo | Obrigatória? |
|----------|-----------|---------|:------------:|
| `DATABASE_URL` | Connection string do PostgreSQL | `postgresql://postgres:postgres@localhost:5432/sportscalendar` | Sim |
| `REDIS_URL` | Connection string do Redis | `redis://localhost:6379` | Sim |
| `PORT` | Porta da API | `3000` | Não (default: 3000) |
| `NODE_ENV` | Ambiente de execução | `development` | Não |
| `FRONTEND_URL` | URL do frontend (CORS) | `http://localhost:5173` | Sim |
| `ADMIN_SECRET` | Token para endpoints administrativos | `change-me-in-development` | Sim |
| `THESPORTSDB_API_KEY` | Chave da API TheSportsDB | `3` (chave pública de teste) | Sim |
| `SCHEDULER_ENABLED` | Ativa/desativa cron jobs | `true` | Não (default: true) |
| `SCHEDULER_RUN_ON_START` | Sync inicial ao subir o servidor | `true` | Não (default: true) |
| `REDIS_HEALTH_GRACE_PERIOD_SECONDS` | Tempo antes do circuit breaker aceitar Redis fora | `120` | Não (default: 120) |

---

## 📡 Endpoints principais

| Método | Rota | Descrição | Auth? |
|--------|------|-----------|:-----:|
| GET | `/health` | Health check (DB + Redis + circuit breaker) | Não |
| GET | `/api/events` | Listar eventos com filtros, paginação e timezone | Não |
| GET | `/api/events/:id` | Detalhe de um evento por UUID | Não |
| GET | `/api/events/freshness` | Frescor dos dados por esporte (stale detection) | Não |
| GET | `/api/sports` | Listar esportes ativos | Não |
| POST | `/api/admin/sync/:sportSlug` | Disparar sync manual de um esporte | Sim |
| GET | `/api/admin/sync-log` | Histórico de execuções do scheduler | Sim |
| GET | `/api/admin/alerts` | Alertas de falhas silenciosas | Sim |

Especificação OpenAPI completa em [`apps/api/openapi.yaml`](apps/api/openapi.yaml).

---

## 🧪 Testes

```bash
# Rodar todos os testes (API)
npm test --workspace=apps/api

# Typecheck do monorepo inteiro
npm run typecheck
```

**Estratégia de testes:**
- **Unitários:** Services (upsert, validação, freshness, alertas), middleware de erro, parser de query params, sync runner, adapters (OpenF1, TheSportsDB) — todos com fixtures determinísticas
- **Framework:** Node.js native test runner (`node:test` + `node:assert`) — zero dependências externas para testes
- **Adapters:** Testados com fetch mockado e fixtures reais das APIs externas

---

## 🗺️ Roadmap

- [x] Schema do banco + migrations (sports, seasons, events, users, sync_log, alerts)
- [x] Adaptador OpenF1 (Fórmula 1) com retry + backoff
- [x] Adaptador TheSportsDB (WEC + MotoGP) com throttle
- [x] API REST completa com paginação, filtros e conversão de timezone
- [x] Cache Redis com invalidação automática pós-sync
- [x] Cron jobs para atualização periódica (F1: 6h, WEC: 12h, MotoGP: 12h)
- [x] Health check com circuit breaker para Redis
- [x] Sistema de alertas para detecção de falhas silenciosas
- [x] Frontend PWA com calendário, filtros por esporte e detalhe de evento
- [x] Conversão de fuso horário no frontend
- [x] Endpoint de freshness para banner "dados desatualizados"
- [x] Especificação OpenAPI 3.0
- [x] Notificações push via PWA para eventos próximos
- [x] CI/CD com GitHub Actions
- [x] Dockerfile para deploy do backend
- [x] Configuração Vercel para deploy do frontend
- [ ] Deploy em cloud (Railway) + domínio personalizado
- [ ] Novos esportes: UFC e Tênis (adapters já preparados)
- [ ] Refresh token e autenticação de usuários

---

## 📚 Aprendizados

- Implementei retry com backoff exponencial nos adapters e percebi na prática que sem timeout no `fetch` o retry vira uma fila infinita — o `AbortController` com deadline fixa foi essencial para manter o scheduler previsível.

- Descobri que tratar Redis como "opcional que pode cair a qualquer momento" desde o início simplifica muito a arquitetura. O `CacheService` com try/catch em toda operação eliminou uma classe inteira de bugs de produção antes de chegar lá.

- O circuit breaker no health check parece over-engineering para um MVP, mas a lógica é uma função pura de 10 linhas que evita um cenário real: Redis global fora = load balancer drena todas as instâncias = downtime total mesmo com banco saudável.

- Aprendi que `ON CONFLICT DO UPDATE` sem throttle temporal gera writes desnecessários a cada ciclo de sync. A cláusula `WHERE updated_at < NOW() - INTERVAL '1 hour'` reduziu os upserts efetivos em ~90% nos ciclos sem mudanças reais.

- A detecção de "3 syncs consecutivos com 0 eventos" foi a feature mais difícil de justificar e a mais importante: falhas silenciosas (adapter retorna `[]` por mudança de API) não disparam nenhum catch e podem passar dias sem ninguém perceber.

- Separar os adapters em um pacote independente (`packages/adapters`) com interface `SportAdapter` tornou trivial adicionar WEC e MotoGP depois do F1 — cada adapter é um arquivo isolado que implementa `fetchEvents(season)` e não sabe nada sobre banco, cache ou scheduler.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

**Gabriel Novaes**

- [LinkedIn](https://www.linkedin.com/in/gabrielhcnovaes/)
- [GitHub](https://github.com/GabrielCNovaesDev)
