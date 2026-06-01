# Plano 008 — Storage locations + stock (Lado Direito/Esquerdo)

Status: **concluído**.

## Context

Implementa as duas telas centrais do inventário: **Lado Direito** e **Lado
Esquerdo** — o espelho físico do galpão. Cada lado tem ~32 ruas fixas
(A–Z sem W + A1–G1, conforme `legacy/db.json`), e cada rua guarda até 4
materiais com suas quantidades. É o primeiro uso real do catálogo (plano 007) como fonte de materiais.

Reusa os padrões do 007: conversor por feature (`withConverter`), hook
genérico `useFirestoreCollection`, mutations com toast. Introduz o
`MaterialCombobox` (busca no catálogo) que será reusado em Fora/Masters/
Aditivos (plano 009).

**Mudança de modelo vs architecture original:** os slots de uma rua passam
a ser um **array no doc da rua** (não subcoleção `stock_items`). Decisão
tomada por simplicidade de leitura (1 query por tela) sem recriar o
monolito legado.

## Decisões consolidadas

| Item                | Escolha                                                                                |
| ------------------- | -------------------------------------------------------------------------------------- |
| Modelo de slots     | Array `slots[]` no doc da rua (até 4). Muda architecture §5.3 (sem subcoleção)         |
| Cor da rua          | Derivada do material do **slot 1** (`slots[0].materialSnapshot.fornecedor`)            |
| Seed das ruas       | Script idempotente `scripts/seed-storage.ts` (ruas fixas de Direito e Esquerdo)        |
| Seletor de material | `MaterialCombobox` (shadcn `command` + `popover`), busca por nome — padrão reusável    |
| Salvamento          | onBlur/onChange (igual legado): muda qtd ou material → persiste o doc da rua           |
| Limpar slot         | Selecionar "— Vazia —" no combobox remove o material do slot                           |
| Snapshot            | Slot guarda `materialSnapshot` (tipo/embal/kgUnit/categoria/fornecedor) p/ resiliência |

## Schema revisado — `/storage_locations/{locationId}`

```ts
interface Slot {
  materialId: string;
  materialSnapshot: {
    tipo: string;
    embal: "SC" | "BB";
    kgUnit: number;
    categoria: "PADRAO" | "MASTER" | "ADITIVO";
    fornecedor: SupplierId | null; // p/ derivar cor sem buscar catálogo
    colorCode: string | null; // p/ masters
  };
  quantidade: number;
}

interface StorageLocation {
  id: string; // "direito_A", "esquerdo_B1"
  area: "direito" | "esquerdo" | "fora" | "masters" | "aditivos";
  rua: string | null; // "A".."Z","A1".."G1" (direito/esquerdo)
  label: string; // "Direito A"
  ordem: number; // ordenação na tela
  slots: Slot[]; // até 4
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string; // uid
}
```

Cor da rua = `SUPPLIERS[slots[0]?.materialSnapshot.fornecedor ?? "none"]`.

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Ajustar `architecture.md`

- §5.2: `storage_locations` ganha `slots: Slot[]` + `updatedAt` + `updatedBy`.
- §5.3: **remover** a subcoleção `stock_items`; substituir pela definição
  de `Slot` embutido. Anotar a justificativa (rua = unidade de edição;
  array pequeno; evita collectionGroup).
- §5.4 (kardex): confirmar que continua referenciando `materialId` +
  snapshot (independe de slots).
- §7 (regras): ajustar — `/storage_locations/{id}` read signed-in, write
  admin; **remover** match de `stock_items`.

### 2. Tipos — `src/features/storage/types.ts`

`Slot`, `StorageArea`, `StorageLocation`, `StorageLocationInput`.
Reaproveita `SupplierId`, `Embal`, `Categoria` do catálogo.

### 3. Conversor — `src/features/storage/firestore.ts`

`storageLocationConverter` (mesmo padrão do catálogo: remove id /
Timestamp→Date / injeta id). `storageCollection`, `storageDoc(id)`.

### 4. Seed — `scripts/seed-storage.ts`

- Admin SDK (mesma infra do `set-role`). Roda contra emulador via
  `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` ou contra prod via
  `GOOGLE_APPLICATION_CREDENTIALS`.
- Cria docs `direito_<rua>` e `esquerdo_<rua>` para a lista **exata** de
  ruas do `legacy/db.json` (A–Z sem W + A1–G1), com `slots: []`, `ordem`
  incremental, `label`. Idempotente (só cria se não existir; usa
  `set(..., { merge: true })` ou checa existência).
- Script npm: `"seed-storage": "tsx scripts/seed-storage.ts"`.

### 5. shadcn adicionais

```
npx shadcn@latest add command popover
```

### 6. `MaterialCombobox` — `src/shared/components/MaterialCombobox.tsx`

- Compõe `Popover` + `Command` (busca). Lista materiais ativos do
  catálogo (`useCatalog`). Opção "— Vazia —" para limpar.
- Props: `value: materialId | null`, `onSelect(material | null)`,
  `disabled`, `categoria?` (filtro opcional p/ Masters/Aditivos depois).
- Mostra swatch de cor (fornecedor/colorCode) ao lado de cada item.
- **Reusável** por Fora/Masters/Aditivos no plano 009.

### 7. Hooks — `src/features/storage/useStorage.ts`

- `useStorageArea(area)` → ruas daquela área, `orderBy("ordem")`
  (via `useFirestoreCollection`).
- `useStorageMutations()`:
  - `setSlotMaterial(locationId, slotIndex, material | null)` — preenche/
    limpa o slot (monta `materialSnapshot` a partir do `Material`).
  - `setSlotQuantidade(locationId, slotIndex, qtd)`.
  - Internamente lê o doc atual, atualiza o array `slots`, grava com
    `updatedAt`/`updatedBy`. Toast em erro.
  - **Sem geração de Kardex** (fica para o plano 010 — deixar comentário
    `// TODO(010): log kardex no diff de quantidade`).

### 8. `RuaCard` — `src/features/storage/RuaCard.tsx`

- `RoadBadge` (letra) + faixa/realce com a cor do slot 1.
- Até 4 linhas de slot: `MaterialCombobox` + input de `quantidade`
  (number, onBlur salva) + `EmbalBadge` (do material) + peso total
  derivado (`qtd × kgUnit`).
- Mostra slots preenchidos + 1 linha vazia (até o limite de 4).
- Tudo `disabled` para não-admin (UX); regras garantem no servidor.

### 9. Rotas — `src/routes/_app/direito.tsx` e `esquerdo.tsx`

- Substituir `<EmConstrucao>` por: header da área + grid/lista de
  `RuaCard` (uma por rua, ordenada). `useStorageArea("direito")` /
  `("esquerdo")`.
- Loading: skeleton simples. Empty (sem ruas): aviso "rode o seed".

### 10. Regras Firestore

- Ajustar `firestore/firestore.rules`: `/storage_locations/{id}` read
  signed-in / write admin; remover bloco `stock_items`.
- (Opcional, registrar como melhoria) validar `slots` size ≤ 4 e
  `quantidade >= 0`.

### 11. Atualizar `CLAUDE.md` + `architecture.md`

- Status do 008; confirmar §12.

### 12. Commit

```
git add -A
git commit -m "feat(storage): Lado Direito/Esquerdo com ruas, slots e MaterialCombobox (#008)"
```

## Arquivos criados / modificados

```
src/features/storage/types.ts                 (novo)
src/features/storage/firestore.ts             (novo)
src/features/storage/useStorage.ts            (novo)
src/features/storage/RuaCard.tsx              (novo)
src/shared/components/MaterialCombobox.tsx    (novo — reusável)
src/shared/components/ui/{command,popover}.tsx (novos — shadcn)
scripts/seed-storage.ts                       (novo)
src/routes/_app/direito.tsx                   (modificado — tela real)
src/routes/_app/esquerdo.tsx                  (modificado — tela real)
firestore/firestore.rules                     (modificado — storage_locations, sem stock_items)
.claude/architecture.md                       (modificado — §5.2/§5.3/§7)
CLAUDE.md / package.json / package-lock.json  (modificados)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`, logado como admin, e catálogo com
alguns materiais (criados no 007):

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **Seed**: rodar `npm run seed-storage` (apontado ao emulador) cria as
   ruas. Rodar de novo não duplica.
3. **Lado Direito**: abre `/direito`, mostra todas as ruas A–Z+A1–G1 na
   ordem. Bate com [prints/desktop-lado-direito.png](../../prints/desktop-lado-direito.png).
4. **Escolher material**: no slot 1 da rua A, abrir combobox, buscar
   "U-8875", selecionar → linha mostra o material, `EmbalBadge`, e a rua
   ganha a cor do fornecedor (Unigel/roxo).
5. **Quantidade**: digitar 22, sair do campo (onBlur) → persiste; peso
   total = 22 × kgUnit aparece.
6. **Segundo slot**: preencher slot 2 com outro material; a cor da rua
   continua a do slot 1.
7. **Limpar slot**: selecionar "— Vazia —" no slot 2 → some.
8. **Tempo real**: 2 abas; editar numa, reflete na outra.
9. **Permissão**: como `reader`, campos `disabled`; escrita manual via
   console → PERMISSION_DENIED.
10. **Mobile** (375px): ruas empilhadas, combobox e qtd usáveis. Bate com
    [prints/mobile-lado-direito.png](../../prints/mobile-lado-direito.png).
11. **Lado Esquerdo**: `/esquerdo` análogo, dados independentes.

## Não-objetivos (explícitos)

- Geração de log no **Kardex** ao mudar quantidade — Plano 010 (deixar
  TODO no mutation).
- Áreas livres (Fora/Masters/Aditivos) — Plano 009 (reusam `MaterialCombobox`).
- Dashboard/agregações — Plano 011.
- Migração dos dados reais do `legacy/db.json` — Plano 013 (aqui só o
  seed das ruas vazias).
- Regra ≤25kg (sacos vs paletes) — Plano 011 (Dashboard).

## Próximos planos

- 009 — Áreas livres (Fora, Masters, Aditivos): docs sem `rua` fixa,
  com `AddRow` para criar/remover locais; reusa `MaterialCombobox`.
- 010 — Kardex: observa diffs de quantidade nos slots e grava log.
