# Plano 012 — Planilha Amarela + export Excel

Status: concluído

## Context

A **Planilha Amarela** é o relatório consolidado de fechamento de inventário —
a "planilha física amarela" que o galpão usa. No legado é uma aba com
pré-visualização de uma tabela amarela e botão **BAIXAR EXCEL**. Hoje a rota
`/planilha` ([planilha.tsx](../../src/routes/_app/planilha.tsx)) é só um
`EmConstrucao`.

Este plano constrói a tela `/planilha` com a tabela consolidada (paridade total
com o legado) e o export para Excel **real (.xlsx) via `exceljs`**
([architecture §2](../architecture.md)), substituindo o hack legado de
HTML-como-`.xls`.

### Como o legado faz (referência, `legacy/index.html`)

- Mesma consolidação do Dashboard (`getConsolidado`, linha 1265): por material,
  guardando o **array `qtds`** (cada quantidade individual), `totalPaletes`
  (Σ qtd) e `totalKg` (Σ qtd×kg).
- Tabela (linhas 3442–3575): cabeçalho amarelo `#ffff00`; colunas
  **TIPO | EMBAL | KG | QTD×10 | TOTAL (UNID) | TOTAL**; uma linha por material;
  se há mais de 10 qtds, o **excedente é somado na 10ª coluna**; sacos
  (`kg ≤ 25`) levam sufixo "scs" no TOTAL (UNID); linhas de master tingidas de
  rosa, aditivo de roxo; ponto colorido (`colorCode`) ao lado do tipo (masters);
  linha final **TOTAIS** com `totalSumPaletes` (exclui sacos) e `totalSumKg`.
- Export (`handleExportExcel`, linha 1368): pega o `innerHTML` da tabela
  `print-consolidated` e baixa como `.xls` (HTML disfarçado). **Trocamos por
  `.xlsx` de verdade com `exceljs`.**

### Já pronto (reusar)

- **Consolidação**: `consolidate(locations)` em
  [aggregate.ts](../../src/features/dashboard/aggregate.ts) — já agrupa por
  material e soma `totalQtd`/`totalKg`. **Falta** capturar os `qtds[]`
  individuais → extensão pequena (passo 2).
- **Totais**: `computeKpis(items)` já entrega `volumePaletes`
  (= `totalSumPaletes`, exclui sacos) e `stockTotalKg` (= `totalSumKg`).
- **Stream**: `useAllStorage()` em
  [useStorage.ts](../../src/features/storage/useStorage.ts).
- **Regra ≤25kg**: `isSaco`/`isPalete` em
  [business.ts](../../src/shared/lib/business.ts).
- `EmbalBadge`, `Card`, tokens `brand-pink`/`brand-purple`, `useAuth`.
- Rota `/planilha` e aba já existem; só trocar o `EmConstrucao`.

## Decisões consolidadas

| Item         | Escolha                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Layout       | **Paridade total**: TIPO/EMBAL/KG + **QTD×10** (excedente somado na 10ª) + TOTAL (UNID) + TOTAL   |
| Consolidação | **Estender o `consolidate` compartilhado** — add `qtds: number[]` ao `ConsolidatedItem` (DRY)     |
| Totais       | Reusar `computeKpis`: `volumePaletes` = TOTAIS (unid, exclui sacos); `stockTotalKg` = TOTAIS (kg) |
| Export       | **`.xlsx` real via `exceljs`** (estilo amarelo, bordas, tints) — substitui o HTML-como-xls        |
| Módulo       | Novo **`features/reports/`** — `planilha.ts` (puro) + `exportExcel.ts` + tipos                    |
| Quem exporta | Qualquer usuário logado (export é leitura; sem escrita) — sem mudança de regras                   |
| Sacos        | `isSaco(kgUnit)` → sufixo "scs" no TOTAL (UNID); excluídos do total de paletes                    |
| Tints        | Masters rosa, aditivos roxo (parità). Ponto `colorCode`: só na **pré-visualização** (não no xlsx) |
| Formatação   | `Intl.NumberFormat("pt-BR")` para kg; data `DD/MM/AAAA` na tela, `AAAA-MM-DD` no nome do arquivo  |

## Modelo — `features/reports/`

```ts
// types.ts
interface PlanilhaRow {
  tipo: string;
  embal: Embal;
  kgUnit: number;
  categoria: Categoria;
  colorCode: string | null;
  qtds: (number | null)[]; // exatamente 10 (excedente somado na 10ª; pad com null)
  totalUnid: number; // item.totalQtd
  isSaco: boolean;
  totalKg: number; // item.totalKg
}
interface PlanilhaData {
  rows: PlanilhaRow[];
  totalUnidPaletes: number; // computeKpis.volumePaletes
  totalKg: number; // computeKpis.stockTotalKg
}

// planilha.ts (puro)
// buildPlanilha(items: ConsolidatedItem[]): PlanilhaData
//   - por item: displayQtds = colapsa >10 (soma índices 9.. na 10ª) e pad p/ 10.
//   - totais via computeKpis(items).

// exportExcel.ts
// exportPlanilhaXlsx(data: PlanilhaData, dateISO: string): Promise<void>
//   - monta Workbook exceljs, estiliza, writeBuffer → Blob → download.
```

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Criar o arquivo do plano

Gravar este conteúdo em `.claude/plans/012-planilha-amarela-export-excel.md`.

### 2. Estender a consolidação — `features/dashboard/{types,aggregate}.ts`

- `types.ts`: add `qtds: number[]` ao `ConsolidatedItem`.
- `aggregate.ts` `consolidate`: no `existing` → `existing.qtds.push(slot.quantidade)`;
  no novo → `qtds: [slot.quantidade]`. (Dashboard ignora o campo.)

### 3. Dependência — `exceljs`

`npm install exceljs` (+ `@types` se necessário; exceljs já traz tipos). Anotar
no `package.json`/`package-lock.json`.

### 4. Lógica pura — `src/features/reports/types.ts` + `planilha.ts` (novos)

`PlanilhaRow`/`PlanilhaData` (acima) e `buildPlanilha(items)` — colapso da 10ª
coluna + pad; totais reusando `computeKpis`. Usa `isSaco` de `business.ts`.

### 5. Export — `src/features/reports/exportExcel.ts` (novo)

`exportPlanilhaXlsx(data, dateISO)` com `exceljs`:

- Worksheet "Planilha Amarela"; larguras aproximando o legado (TIPO larga,
  QTD estreitas).
- Cabeçalho (2 linhas): fill `FFFFFF00` (amarelo), **bold**, bordas finas
  pretas, centralizado; linha 1 com DATA (merge) + data + TOTAL (UNID) + TOTAL.
- Linhas de dados: bordas; master fill rosa, aditivo fill roxo; TIPO à esquerda;
  TOTAL (UNID) com " scs" se `isSaco`; números pt-BR.
- Linha **TOTAIS** amarela: rótulo à direita (merge) + `totalUnidPaletes` paletes
  - `totalKg`.
- `await workbook.xlsx.writeBuffer()` → `Blob` (mime
  `...spreadsheetml.sheet`) → `<a download="Planilha_Amarela_<dateISO>.xlsx">`.

### 6. Tela — `src/routes/_app/planilha.tsx` (reescrever)

- `useAllStorage()` → `consolidate()` → `buildPlanilha()`.
- **Pré-visualização**: tabela amarela (parità) com `colorCode` dot p/ masters,
  tints rosa/roxo, sufixo "scs", linha TOTAIS. Header com a data de hoje.
- Botão **"Baixar Excel"** (verde, ícone `Download`) → `exportPlanilhaXlsx`
  (com toast de erro). `overflow-x-auto` no container (tabela larga).
- Estados: skeleton no `loading`; empty ("Nenhum material com saldo para
  consolidar.") quando `rows` vazio.

### 7. Atualizar `architecture.md` + `CLAUDE.md`

- `architecture.md`: confirmar `features/reports/` (planilha + exceljs); nota de
  que `ConsolidatedItem.qtds` alimenta as colunas QTD.
- `CLAUDE.md`: status do plano 012 → concluído.

### 8. Verificação + commit

`npm run typecheck && npm run lint && npm run build`; depois:

```
git add -A
git commit -m "feat(reports): Planilha Amarela consolidada + export .xlsx via exceljs (#012)"
```

## Arquivos criados / modificados

```
src/features/dashboard/types.ts            (modificado — qtds em ConsolidatedItem)
src/features/dashboard/aggregate.ts        (modificado — acumula qtds)
src/features/reports/types.ts              (novo — PlanilhaRow/PlanilhaData)
src/features/reports/planilha.ts           (novo — buildPlanilha)
src/features/reports/exportExcel.ts        (novo — exceljs → .xlsx)
src/routes/_app/planilha.tsx               (modificado — tela real + export)
package.json / package-lock.json           (modificados — exceljs)
.claude/plans/012-planilha-amarela-export-excel.md (novo)
.claude/architecture.md                    (modificado — features/reports)
CLAUDE.md                                   (modificado — status 012)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`, logado, com ruas/áreas seedadas e catálogo:

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **Pré-visualização**: `/planilha` mostra a tabela amarela consolidada; uma
   linha por material com saldo; ordenação por kg desc (herda do `consolidate`).
3. **Colunas QTD**: material espalhado em ≤10 locais → cada qtd numa coluna;
   em >10 locais → 10ª coluna soma o excedente; colunas vazias ficam em branco.
4. **Sacos**: material `kg ≤ 25` → TOTAL (UNID) com "scs" e **fora** do total de
   paletes; `kg = 1500` entra normal.
5. **Tints**: master rosa + dot da cor; aditivo roxo; padrão neutro.
6. **TOTAIS**: paletes (exclui sacos) e kg batem com os KPIs do Dashboard
   (`computeKpis`).
7. **Tempo real**: alterar uma qtd em `/direito` → pré-visualização atualiza.
8. **Export**: "Baixar Excel" baixa `Planilha_Amarela_AAAA-MM-DD.xlsx`; abre no
   Excel/LibreOffice com cabeçalho amarelo, bordas, tints e totais corretos;
   números coerentes com a tela.
9. **Empty**: base sem saldo → empty state, botão desabilitado, sem quebrar.
10. **Mobile (375px)**: tabela com scroll horizontal; botão acessível.

## Não-objetivos (explícitos)

- **Export PDF** / print stylesheet — fora; só `.xlsx`.
- **Ponto de cor (`colorCode`) dentro do .xlsx** — só na pré-visualização; no
  Excel a categoria é sinalizada pelo tint da linha.
- **Colunas/filtros configuráveis** — layout fixo (parità legado).
- **Itens especiais** (OK/CARGA/…) — já fora desde o plano 011.
- **Agendamento/histórico de planilhas** — melhoria futura.
