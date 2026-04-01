# BI Julia — Business Intelligence Kommo CRM

## Visão Geral

**BI Julia** é uma plataforma de Business Intelligence que integra a API do Kommo CRM para gerar dashboards de qualidade e performance comercial. Faz parte do ecossistema Urânia e servirá como base futura para o BI do CRM próprio (crm-urania-labs).

## Stack (Padrão Ecossistema Urânia)

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript + SWC |
| UI/Styling | Tailwind CSS + shadcn/ui (Radix UI) + Lucide Icons |
| Routing | React Router v6 |
| Data Fetching | TanStack React Query 5 + @supabase/supabase-js |
| Forms | React Hook Form + Zod |
| Gráficos | Recharts |
| Backend | Supabase (PostgreSQL + Edge Functions + RLS + Auth) |
| Deploy | Vercel (auto-deploy via GitHub) |
| Versionamento | GitHub (Org: UraniaPlanetario) |

## Integrações

### Kommo CRM API
- **Subdomain:** uraniaplanetario.kommo.com
- **Account ID:** 30633731
- **Dados a consumir:** Leads, funis (pipelines), etapas, contatos, atividades, campos customizados, usuários/responsáveis
- **Autenticação:** OAuth 2.0 ou Long-lived token

## Projetos Irmãos no Ecossistema Urânia

| Projeto | Propósito | Supabase | Status |
|---------|-----------|----------|--------|
| **urania-hub** | Gestão interna (usuários, tickets, agentes IA, notificações) | `poxolucfvuutvcfpjznt` | Produção |
| **crm-urania-labs** | CRM IA-first substituindo Kommo | Novo (separado) | Design (sem código) |
| **bi-urania-tracking-leads-meta** | BI tracking Meta Ads + CAPI | `mziylzfqhnxmxcvshtpv` | Blocos 1-3 OK |
| **bi-julia** (este) | BI Kommo CRM — dashboards de qualidade | A criar | Início |

### Relação com outros projetos
- **crm-urania-labs**: Este BI será base/referência quando migrarmos do Kommo para o CRM próprio
- **bi-urania-tracking-leads-meta**: Projeto irmão de BI focado em Meta Ads/CAPI. Mesmo padrão de stack
- **urania-hub**: Hub central. Padrões de código herdados daqui

## Padrões Obrigatórios (Herdados do Ecossistema)

- `logEvent()` para audit trail em toda mutation
- RLS habilitado em todas as tabelas
- React Query: staleTime 5min, gcTime 10min
- shadcn/ui — NUNCA editar `src/components/ui/` manualmente
- Path alias `@/` → `./src/*`
- Código em **inglês**, UI em **português**
- Datas: `dd/mm/aaaa` com `toLocaleDateString('pt-BR')`
- `AlertDialog` shadcn (NUNCA `window.confirm()`)
- Imports Supabase sempre de `@/integrations/supabase/client`

## Estrutura do Projeto (Planejada)

```
bi-julia/
├── .claude/
│   └── skills/           # 8 skills instaladas
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui (gerado)
│   │   └── dashboard/    # Componentes de dashboard
│   ├── pages/            # Páginas da aplicação
│   ├── hooks/            # Custom hooks
│   ├── integrations/
│   │   └── supabase/     # Cliente + tipos
│   ├── lib/              # Utilitários
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # SQL migrations
├── CLAUDE.md             # Este arquivo
├── package.json
└── ...
```

## Objetivo Inicial

Conectar na API do Kommo e montar um dashboard de qualidade como primeiro entregável. A Julia vai liderar a implementação a partir deste contexto.

## Kommo API — Referência Rápida

### Endpoints principais
- `GET /api/v4/leads` — Listar leads (com filtros por pipeline, status, responsável, datas)
- `GET /api/v4/leads/{id}` — Detalhes de um lead
- `GET /api/v4/leads/pipelines` — Listar pipelines e etapas
- `GET /api/v4/contacts` — Listar contatos
- `GET /api/v4/users` — Listar usuários do CRM
- `GET /api/v4/tasks` — Listar tarefas/atividades
- `GET /api/v4/events` — Eventos (timeline)
- `GET /api/v4/catalogs` — Catálogos (produtos)

### Autenticação
- Base URL: `https://uraniaplanetario.kommo.com`
- Header: `Authorization: Bearer {ACCESS_TOKEN}`
- Rate limit: 7 requests/segundo

### Campos customizados
- Acessíveis via `custom_fields_values` nos leads/contatos
- IDs específicos da conta Urânia (mapear na implementação)

## Decisões Pendentes

- [ ] Qual Supabase project usar (novo ou existente)
- [ ] Quais métricas/KPIs priorizar no dashboard inicial
- [ ] Frequência de sync dos dados do Kommo (real-time via webhook vs polling)
- [ ] Domínio/subdomínio para deploy Vercel
