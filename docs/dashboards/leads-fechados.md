# Dashboard — Leads Fechados

Operacional: quantos leads foram fechados, por quem, com quantas diárias e qual receita. Segmentação por vendedor e astrônomo.

## Rota

`/comercial/leads-fechados` — perfil `comercial`.

## Estrutura de arquivos

```
src/areas/comercial/leads-fechados/
├── pages/Dashboard.tsx
├── hooks/useClosedLeads.ts
├── types.ts
└── components/
    ├── ClosedFilterBar.tsx
    ├── OverviewBlock.tsx
    ├── VendedorBlock.tsx
    ├── AstronomoBlock.tsx
    └── DetailBlock.tsx
```

## Fonte de dados

`gold.leads_closed` — ver [data-model.md](../data-model.md#goldleads_closed-521-linhas).

A tabela é **restritiva**: apenas leads que:
1. Entraram em `Onboarding Escolas` ou `Onboarding SME`
2. Têm `Vendedor/Consultor` preenchido
3. Têm `Data de Fechamento` e `Data e Hora do Agendamento`
4. `Data de Fechamento < Data e Hora do Agendamento`

### Hook `useClosedLeads()` — [`hooks/useClosedLeads.ts`](../../src/areas/comercial/leads-fechados/hooks/useClosedLeads.ts)

```ts
// Paginado em chunks de 1000
await supabase
  .schema('gold')
  .from('leads_closed')
  .select('*')
  .order('entrada_onboarding_at', { ascending: false })
  .range(from, from + 999);
```

### Hook `useFilteredClosed(leads, filters)`

Aplica filtros:
- `vendedor` (lista de nomes)
- `astronomo` (lista)
- `cancelado`: `'sim' | 'nao' | 'all'`
- `dateRange.from / to`

**Regra importante:** leads cancelados usam `data_cancelamento_fmt` para comparação de data; os demais, `data_fechamento_fmt`.

## Filtros da tela ([`ClosedFilterBar.tsx`](../../src/areas/comercial/leads-fechados/components/ClosedFilterBar.tsx))

- Vendedor (multi)
- Astrônomo (multi)
- Status: Ativos / Cancelados / Todos
- Período

## Abas

| Id | Label | Componente |
|---|---|---|
| `overview` | Visão Geral | `OverviewBlock` |
| `vendedor` | Por Vendedor | `VendedorBlock` |
| `astronomo` | Astrônomos | `AstronomoBlock` |

---

## OverviewBlock — [`components/OverviewBlock.tsx`](../../src/areas/comercial/leads-fechados/components/OverviewBlock.tsx)

### KPI: Total de Leads Fechados
- **Fórmula:** `leads.length`

### KPI: Total de Diárias Fechadas
- **Fórmula:** `Σ parseInt(l.n_diarias) || 0`
- Observação: `n_diarias` é texto; parseado como int

### KPI: Receita Total
- **Fórmula:** `Σ (l.lead_price || 0)`
- **Formato:** BRL

### KPI: Ticket Médio por Diária
- **Fórmula:** `receita_total / total_diarias` (ou 0 se `total_diarias = 0`)
- Ver [business-rules.md → Ticket Médio](../business-rules.md#ticket-médio-por-diária)

### BarChart vertical: Diárias Fechadas por Mês
- **Agrupamento:** mês (YYYY-MM) da data do lead
  - Se cancelado: usa `data_cancelamento_fmt`
  - Senão: `data_fechamento_fmt`
- **Ordenação:** cronológica
- **Cor:** roxo (#A78BFA)
- **Labels:** acima das barras

---

## VendedorBlock — [`components/VendedorBlock.tsx`](../../src/areas/comercial/leads-fechados/components/VendedorBlock.tsx)

Agrupa por `vendedor`.

### BarChart horizontal: Diárias Fechadas por Vendedor
- **Fórmula:** `Σ parseInt(n_diarias)` por vendedor
- **Ordenação:** DESC
- **ReferenceLine amarela tracejada:** média do time = `total_diarias / count(vendedores_unicos)`
- **Labels:** valor à direita de cada barra

### Tabela: Detalhamento por Vendedor

| Coluna | Cálculo |
|---|---|
| Vendedor | `vendedor` |
| Leads Fechados | `count(*)` |
| Diárias Fechadas | `Σ parseInt(n_diarias)` |
| Receita (R$) | `Σ (lead_price || 0)` |
| Ticket Médio (R$) | `receita / diarias` |
| Cancelados | `count(cancelado=true)` |

Ordenação por diárias DESC.

---

## AstronomoBlock — [`components/AstronomoBlock.tsx`](../../src/areas/comercial/leads-fechados/components/AstronomoBlock.tsx)

Estrutura análoga ao `VendedorBlock`, mas agrupado por `astronomo`.

---

## DetailBlock — [`components/DetailBlock.tsx`](../../src/areas/comercial/leads-fechados/components/DetailBlock.tsx)

Listagem detalhada de leads individuais (opcional, acessível via link em outros blocos).

## Notas

- **Diferença para Faturamento:** este dashboard é operacional (lista de leads, por vendedor); o Faturamento agrupa por `data_e_hora_do_agendamento` e tem temática de meta anual.
- **Cancelados** podem aparecer zerados no período se a data de cancelamento estiver fora do range.
