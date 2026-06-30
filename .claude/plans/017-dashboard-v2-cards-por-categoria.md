# Plano 017 — Dashboard v2: cards por categoria

Status: concluído

## Context

A dashboard atual ([src/routes/\_app/index.tsx](../../src/routes/_app/index.tsx)) tem 3
KPIs genéricos no topo, a busca, e **três** seções de posição sempre visíveis (resinas,
masters, aditivos empilhadas). A v2 reorganiza a página para destacar os **tipos de
item**: busca no topo, uma faixa fina com os totais globais, três cards de categoria
clicáveis e, abaixo, **apenas** os detalhes da categoria selecionada. Referência
visual aprovada: [prints/desktop-dashboard-v2.png](../../prints/desktop-dashboard-v2.png).

Toda a agregação de dados já existe e é reaproveitada — a mudança é de
composição/UI, não de modelo de dados.

## Decisões consolidadas

| Tema                | Decisão                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subtítulo dos cards | Resinas: `N paletes em estoque` (computado). Masters: label fixa "Volume em sacos e caixas". Aditivos: label fixa "Volume em sacos e bombonas".                 |
| Faixa fina (totais) | Esquerda: `kpis.stockTotalKg` (Stock Total Bruto). Direita: `kpis.volumePaletes` (paletes, exclui sacos, todas as categorias). Reusa `computeKpis` sem mudança. |
| Cores de destaque   | Resinas = azul (`primary`), Masters = rosa (`brand-pink`), Aditivos = roxo (`brand-purple`) — tokens existentes.                                                |
| Tag "N TIPOS"       | Nº de materiais distintos com saldo na categoria (`byCategoria(...).length`).                                                                                   |
| Categoria vazia     | Card aparece com 0 kg / 0 tipos; detalhes mostram "Nenhum item nesta categoria".                                                                                |
| Seleção             | `PADRAO` selecionada por padrão; clique troca a categoria ativa (cor sólida no card + detalhes embaixo).                                                        |
| Busca               | `MaterialSearch` mantida igual, no topo.                                                                                                                        |
| Regra de palete     | `kgUnit > 25` (independe do badge SC/BB) — inalterada.                                                                                                          |

## Passos de execução

1. **Plano oficial.** Criar este arquivo e registrar na tabela de planos do
   [CLAUDE.md](../../CLAUDE.md) e no roadmap de [.claude/architecture.md](../architecture.md).

2. **Agregação por categoria.** Em [aggregate.ts](../../src/features/dashboard/aggregate.ts)
   adicionar `categorySummary(items, categoria)` retornando `{ totalKg, tipos, paletes }`
   (paletes = Σ `totalQtd` onde `isPalete(kgUnit)`). Reusa `byCategoria` e `isPalete`.

3. **Faixa fina de totais — `StockSummaryBar.tsx` (novo).** Faixa escura (`bg-header`/
   token escuro como na print) com "ESTOQUE TOTAL GLOBAL" + kg à esquerda e
   "VOLUME TOTAL" + paletes à direita. Props: `kpis`. Formata com `Intl.NumberFormat("pt-BR")`.

4. **Cards de categoria — `CategoryCards.tsx` (novo).** Config central das 3 categorias
   (id, label exibido "RESINAS PADRÃO"/"MASTERBATCHES"/"ADITIVOS QUÍMICOS", ícone
   `Package2`/`Palette`/`FlaskConical`, accent, subtítulo). Cada card: ícone em badge
   circular (claro quando não selecionado), tag "N TIPOS", nome, total kg em destaque,
   subtítulo sutil. Estado selecionado = fundo sólido da cor da categoria + texto claro;
   não-selecionado = card branco com leve borda/realce da cor. Props: `items`,
   `selected: Categoria`, `onSelect(cat)`. Cores via utilities sobre tokens existentes
   (`bg-primary`, `bg-brand-pink-foreground`, `bg-brand-purple-foreground` para sólidos;
   variantes claras para o ícone) — adicionar token só se algum sólido faltar.

5. **Detalhes da categoria — refatorar `PosicaoSection.tsx` → `CategoryDetails.tsx`.**
   Renderiza **uma** categoria por vez. Header "DETALHES: <NOME>" com a cor da categoria.
   Reaproveita `MaterialRow` e `swatchColor` (mover junto). Lista vazia → "Nenhum item
   nesta categoria". Props: `categoria`, `items` (já filtrados ou filtra internamente).

6. **Reescrever `index.tsx`.** Substituir `KpiCards` por `StockSummaryBar` + `CategoryCards`;
   trocar as 3 `PosicaoSection` por uma `CategoryDetails` da categoria selecionada.
   Layout: busca → faixa → cards → detalhes. Estado `useState<Categoria>("PADRAO")`.
   Ajustar `DashboardSkeleton` para o novo formato.

7. **Remover `KpiCards.tsx`** (substituído pela faixa). Conferir que nada mais importa.

8. **Verificação** (seção abaixo).

## Arquivos criados / modificados

- **Novos:** `src/features/dashboard/StockSummaryBar.tsx`,
  `src/features/dashboard/CategoryCards.tsx`,
  `src/features/dashboard/CategoryDetails.tsx` (refatorado de `PosicaoSection.tsx`).
- **Modificados:** `src/routes/_app/index.tsx`,
  `src/features/dashboard/aggregate.ts`, `CLAUDE.md`, `.claude/architecture.md`.
- **Removidos:** `src/features/dashboard/KpiCards.tsx`,
  `src/features/dashboard/PosicaoSection.tsx` (absorvido por `CategoryDetails`).
- **Reaproveitados sem alterar lógica:** `consolidate`, `byCategoria`, `computeKpis`,
  `findLocations` ([aggregate.ts](../../src/features/dashboard/aggregate.ts)),
  `isPalete`/`unitLabel` ([business.ts](../../src/shared/lib/business.ts)),
  `SUPPLIERS` ([suppliers.ts](../../src/shared/lib/suppliers.ts)),
  `MaterialSearch`, `EmbalBadge`, `useDashboard`.

## Verificação end-to-end

1. `npm run typecheck` e `npm run lint` limpos.
2. `npm run dev` → conferir contra a print:
   - Busca no topo; faixa fina com kg (esq.) e paletes (dir.).
   - 3 cards na ordem resinas/masters/aditivos; resinas selecionada (azul) por padrão.
   - Subtítulos: resinas "N paletes em estoque", master "Volume em sacos e caixas",
     aditivos "Volume em sacos e bombonas"; tag "N TIPOS" correta por categoria.
   - Clique em master/aditivo troca a cor do card e a seção de detalhes abaixo.
   - Categoria vazia mostra "Nenhum item nesta categoria".
3. Conferir mobile (cards empilham; faixa legível).

## Não-objetivos (explícitos)

- Não mexer no modelo de dados (`/catalog`, `storage_locations`, snapshots).
- Não alterar a regra ≤25kg nem `computeKpis`.
- Não mudar a busca de material além de reposicioná-la.
- App Check (Plano 016) segue fora deste escopo.
