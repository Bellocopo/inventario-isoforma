# Plano 011 — Dashboard + busca + regra ≤25kg

Status: concluído

## Context

O Dashboard (`/`) é a tela de abertura — visão consolidada do estoque. Hoje é
um **mock estático** ([index.tsx](src/routes/_app/index.tsx)): KPIs hardcoded,
lista `MOCK_RESINAS` fixa, busca `disabled`. Os planos 008/009/010 já deixaram
todos os dados reais no Firestore (`/storage_locations` com `slots[]` e
`/catalog`), então dá para ligar o Dashboard de verdade.

Este plano transforma o Dashboard em dados reais, replicando o comportamento do
legado (`getConsolidado`/`getLocations`/`totalSumPaletes`):

1. **KPIs** — Stock Total Bruto (kg), Volume de Paletes (exclui sacos), Tipos de
   Item com saldo.
2. **Busca** "Localizar Material no Estoque" — seleciona um material e lista
   todos os locais com saldo, com unidade (sacos/paletes).
3. **Posição de Estoque** — 3 seções (Resinas Padrão, Masterbatches, Aditivos),
   cada uma com cards consolidados por material.
4. **Regra ≤25kg** — `kg <= 25` é **saco** (rótulo "SACOS", excluído do Volume de
   Paletes); `kg > 25` é **palete**. Centralizada em `shared/lib/business.ts`
   (previsto na [architecture §10](.claude/architecture.md)).

### Como o legado faz (referência, `legacy/index.html`)

- `getConsolidado()` (linha 1265): consolida por material somando `quantidade`
  (→ `totalPaletes`) e `quantidade * kg` (→ `totalKg`); filtra saldo > 0; ordena
  por `totalKg` desc; split por categoria.
- `totalSumPaletes` (linha 1754): `Σ totalPaletes` **só de itens `kg > 25`**.
- `totalSumKg` (linha 1757): `Σ totalKg` de tudo.
- "Tipos de Item": `consol.data.length` (itens com saldo).
- `getLocations(resinaId)` (linha 1315): varre as 5 áreas e devolve
  `{ source, location, qty }` onde há saldo do material.
- Unidade na busca (linha 2026): `kg <= 25 ? "sacos" : "paletes"`.

### Já pronto (reusar sem mudança)

- `useFirestoreCollection<T>(query)` aceita qualquer `Query` — uma
  `CollectionReference` serve, então dá para streamar a coleção inteira.
- `MaterialCombobox` ([MaterialCombobox.tsx](src/shared/components/MaterialCombobox.tsx))
  — value = `materialId`, popover com busca; reusável na busca do Dashboard.
- `EmbalBadge`, `Card`, `useCatalog`, `SUPPLIERS`, `storageCollection`.
- Regras Firestore: `read: isSignedIn` em `/storage_locations` e `/catalog` —
  **sem mudança**. Agregação é **client-side** (dados já vêm via `onSnapshot`).

## Decisões consolidadas

| Item                 | Escolha                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Agregação            | **Client-side** sobre os snapshots já streamados (volume pequeno: ~50 locais × ≤4 slots)                 |
| Módulo               | Novo **`features/dashboard/`** — `aggregate.ts` (puro) + `useDashboard.ts` (hook) + componentes          |
| Regra ≤25kg          | **`shared/lib/business.ts`** compartilhado — `SACK_KG_THRESHOLD = 25`, `isSaco`, `isPalete`, `unitLabel` |
| Seções "Posição"     | **3 seções** (Padrão / Masters / Aditivos) — paridade legado                                             |
| Consolidação         | Por `materialId`, a partir do `materialSnapshot` dos slots (não depende do catálogo)                     |
| `totalQtd`/`totalKg` | `totalQtd = Σ quantidade`; `totalKg = Σ quantidade * kgUnit`; filtra `totalQtd > 0`; ordena kg ↓         |
| Volume de Paletes    | `Σ totalQtd` **só de itens `kgUnit > 25`** (exclui sacos)                                                |
| Busca                | `MaterialCombobox` (lista todo o catálogo) → resultados por local com saldo > 0                          |
| Itens especiais      | OK/CARGA/BAG MOIDO/BRASKEM PEAD **não** voltam (hacks de texto do legado) — ver não-objetivos            |
| Formatação           | `Intl.NumberFormat("pt-BR")` para kg/quantidades (inteiros)                                              |

## Modelo de agregação — `features/dashboard/aggregate.ts` (puro)

```ts
interface ConsolidatedItem {
  materialId: string;
  tipo: string;
  embal: Embal;
  kgUnit: number;
  categoria: Categoria;
  fornecedor: SupplierId | null;
  colorCode: string | null;
  totalQtd: number; // Σ quantidade
  totalKg: number; // Σ quantidade * kgUnit
}

interface DashboardKpis {
  stockTotalKg: number; // Σ totalKg (tudo)
  volumePaletes: number; // Σ totalQtd onde kgUnit > 25
  tiposComSaldo: number; // itens com totalQtd > 0
}

interface MaterialLocation {
  area: StorageArea;
  source: string; // nome humano da área ("Lado Direito", ...)
  label: string; // label do local
  qtd: number;
}

// consolidate(locations): varre locations[].slots, agrupa por materialId
//   (usando o materialSnapshot), soma totalQtd/totalKg, filtra > 0,
//   ordena por totalKg desc.
// computeKpis(items): deriva os 3 KPIs (volumePaletes usa isPalete(kgUnit)).
// findLocations(locations, materialId): locais com saldo > 0 desse material.
// byCategoria(items, cat): filtra para as seções de Posição.
// AREA_LABELS: Record<StorageArea, string> — nomes humanos das áreas.
```

## Regra de negócio — `shared/lib/business.ts`

```ts
export const SACK_KG_THRESHOLD = 25;
export const isSaco = (kgUnit: number) => kgUnit <= SACK_KG_THRESHOLD;
export const isPalete = (kgUnit: number) => kgUnit > SACK_KG_THRESHOLD;
// rótulo da unidade conforme a regra (plural p/ badge; singular opcional)
export const unitLabel = (kgUnit: number, plural = true) =>
  isSaco(kgUnit) ? (plural ? "SACOS" : "SACO") : plural ? "PALETES" : "PALETE";
```

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Criar o arquivo do plano

Gravar este conteúdo em `.claude/plans/011-dashboard-busca-regra-25kg.md`.

### 2. Regra ≤25kg — `src/shared/lib/business.ts` (novo)

`SACK_KG_THRESHOLD`, `isSaco`, `isPalete`, `unitLabel` (acima). Sem dependências.

### 3. Stream de todos os locais — `src/features/storage/useStorage.ts`

Adicionar `useAllStorage()`:

```ts
export function useAllStorage() {
  const q = useMemo(() => query(storageCollection, orderBy("ordem")), []);
  const { data: locations, loading, error } = useFirestoreCollection(q);
  return { locations, loading, error };
}
```

(Espelha `useStorageArea` sem o `where("area", ...)`. Lê a coleção inteira — ~50
docs, barato.)

### 4. Agregação — `src/features/dashboard/types.ts` + `aggregate.ts` (novos)

- `types.ts`: `ConsolidatedItem`, `DashboardKpis`, `MaterialLocation` (acima).
- `aggregate.ts` (funções puras, testáveis): `consolidate(locations)`,
  `computeKpis(items)`, `findLocations(locations, materialId)`,
  `byCategoria(items, cat)`, e `AREA_LABELS: Record<StorageArea, string>`
  (nomes humanos das áreas para a busca).

### 5. Hook — `src/features/dashboard/useDashboard.ts` (novo)

`useDashboard()`: chama `useAllStorage()`, memoiza `items = consolidate(locations)`
e `kpis = computeKpis(items)`. Retorna `{ locations, items, kpis, loading, error }`.
A busca usa `findLocations(locations, materialId)` direto no componente (sob demanda).

### 6. Componentes — `src/features/dashboard/`

- `KpiCards.tsx` — extrai o `KpiCard` atual de index.tsx; 3 cards ligados a `kpis`
  (Stock Total Bruto, Volume de Paletes c/ nota "\*exclui sacos", Tipos de Item
  destacado). Formata com `Intl.NumberFormat("pt-BR")`.
- `MaterialSearch.tsx` — `Card` + `MaterialCombobox` (estado local `materialId`);
  ao selecionar, renderiza grid de `findLocations(...)` (`source` + `label` + qtd
  com `unitLabel(kgUnit)`); empty state "Nenhuma quantidade encontrada".
- `PosicaoSection.tsx` — recebe `title`, `icon`, `variant` e `items`; renderiza
  grid de cards (tipo + `EmbalBadge` + `totalKg` + `totalQtd` com `unitLabel`).
  Reaproveita o layout do `MaterialRow` atual. Variantes de cor: neutra /
  `brand-pink` (masters) / `brand-purple` (aditivos), como nas outras telas.

### 7. Tela — `src/routes/_app/index.tsx` (reescrever)

Substituir o mock por: `useDashboard()` → `<KpiCards>`, `<MaterialSearch>`,
e 3 `<PosicaoSection>` (`byCategoria(items,"PADRAO"|"MASTER"|"ADITIVO")`).
Estados: skeleton no `loading`; empty ("Nenhum material com saldo.") quando
`items` vazio. Remover `MOCK_RESINAS`.

### 8. Atualizar `architecture.md` + `CLAUDE.md`

- `architecture.md`: §4 — anotar `features/dashboard/`; §10 — confirmar
  `shared/lib/business.ts` (`isSaco`/`isPalete`/`unitLabel`, threshold 25);
  nota curta de que o Dashboard agrega client-side a partir dos snapshots.
- `CLAUDE.md`: status do plano 011 → concluído.

### 9. Verificação + commit

`npm run typecheck && npm run lint && npm run build`; depois:

```
git add -A
git commit -m "feat(dashboard): KPIs reais, busca de material e regra ≤25kg (#011)"
```

## Arquivos criados / modificados

```
src/shared/lib/business.ts                  (novo — regra ≤25kg)
src/features/dashboard/types.ts             (novo)
src/features/dashboard/aggregate.ts         (novo — consolidate/computeKpis/findLocations)
src/features/dashboard/useDashboard.ts      (novo — hook)
src/features/dashboard/KpiCards.tsx         (novo)
src/features/dashboard/MaterialSearch.tsx   (novo)
src/features/dashboard/PosicaoSection.tsx   (novo)
src/features/storage/useStorage.ts          (modificado — useAllStorage)
src/routes/_app/index.tsx                   (modificado — liga dados reais; remove mock)
.claude/plans/011-dashboard-busca-regra-25kg.md (novo)
.claude/architecture.md                     (modificado — §4/§10)
CLAUDE.md                                    (modificado — status 011)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`, logado, com ruas/áreas seedadas e catálogo:

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **KPIs**: Stock Total Bruto = Σ(qtd×kg) de tudo; Volume de Paletes ignora
   itens `kg ≤ 25`; Tipos de Item = nº de materiais com saldo. Conferir contra
   uns slots manuais.
3. **Regra ≤25kg**: material com `kg = 25` aparece rotulado "SACOS" e **não**
   entra no Volume de Paletes; material `kg = 1500` rotula "PALETES" e entra.
4. **Tempo real**: alterar uma quantidade em `/direito` → KPIs e Posição
   atualizam sozinhos (onSnapshot).
5. **Busca**: selecionar material com saldo → lista os locais certos
   (`source` + label) com qtd e unidade; material sem saldo → empty state.
6. **Posição (3 seções)**: Padrão/Masters/Aditivos populam por categoria;
   ordenação por kg desc; cards com cor da seção.
7. **Empty**: base sem saldo → KPIs zerados e empty state, sem quebrar.
8. **Mobile (375px)**: KPIs empilham; grids colapsam para 1 coluna; busca usável.

## Não-objetivos (explícitos)

- **Export Excel / Planilha Amarela** — plano 012.
- **Itens especiais** (OK/CARGA/BAG MOIDO/BRASKEM PEAD) — eram texto livre no
  legado; fora do modelo normalizado. Não retornam.
- **Agregação server-side** (`getCountFromServer`/aggregation queries) —
  desnecessária no volume atual; agregação client-side basta.
- **Filtros/ordenações configuráveis** nas seções de Posição — fixo em kg desc.
- **Drill-down** clicável do card para a aba da área — melhoria futura.
