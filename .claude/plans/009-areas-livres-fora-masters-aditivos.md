# Plano 009 — Áreas livres (Fora, Masters, Aditivos)

Status: concluído

## Context

As telas **Fora do Local**, **Masters** e **Aditivos** completam o espelho do
inventário físico. Diferente de Direito/Esquerdo (plano 008), que têm **ruas
fixas** (A–Z, A1–G1) pré-seedadas com badge de letra e label read-only, essas
três áreas são **locais dinâmicos**: o admin cria, renomeia e remove locais de
nome livre ("Doca", "ESTOQUE DE MASTER", "Lado da linha lilás") — exatamente
como o legado (`fora/masters/aditivos` = listas de objetos com `local` livre +
`resina1..4`/`q1..4`).

O modelo de dados (`/storage_locations` com `slots[]` embutido) e quase toda a
infra de UI já suportam isso. O que falta é o **CRUD de localização**
(criar/renomear/excluir um local) — inexistente hoje, pois `RuaCard` assume
estrutura fixa. Reusamos ao máximo o que o 008 e o design system já entregaram.

### Já pronto (reusar sem mudança)

- `useStorageArea(area)` — genérico por `area`, já funciona para fora/masters/aditivos.
- `MaterialCombobox` — já aceita prop `categoria` para filtrar o catálogo.
- `AddRow` — já tem variantes `neutral | masters | aditivos`.
- Tokens `--brand-pink` / `--brand-purple` no design system.
- `swatchColor`/`slotSwatchColor` — já priorizam `colorCode` (swatches de Masters).
- Conversor `storageLocationConverter` + `storageCollection`/`storageDoc`.
- Regras Firestore: `/storage_locations` `write: if isAdmin()` já cobre
  create/update/delete (addDoc e deleteDoc são writes). **Sem mudança de regras.**

## Decisões consolidadas

| Item               | Escolha                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Criar local        | **AddRow inline**: "Adicionar local" revela campo de texto; Enter cria o doc              |
| ID do local        | **Auto-ID Firestore** (`addDoc`). `label` guarda o nome livre editável; `rua: null`       |
| Excluir local      | **AlertDialog de confirmação** (lixeira no card → confirma exclusão do local + materiais) |
| Renomear           | Campo de texto editável no header do card (onBlur salva `label`)                          |
| Filtro de material | Masters → `categoria="MASTER"`; Aditivos → `"ADITIVO"`; Fora → sem filtro (qualquer)      |
| Tema por área      | Fora → neutro; Masters → `brand-pink`; Aditivos → `brand-purple`                          |
| Ordenação          | `ordem: Date.now()` na criação (mais novo por último, estável)                            |
| Limite de slots    | Até 4 por local (paridade com `resina1..4` do legado)                                     |
| Seed               | **Nenhum** — áreas livres começam vazias; dados reais vêm na migração (plano 013)         |
| Componentes        | Extrair `SlotRows` compartilhado; novo `LocalCard`; novo `FreeAreaPage`                   |

## Arquitetura de componentes

`RuaCard` hoje tem as linhas de slot (`FilledSlotRow`/`EmptySlotRow`) privadas.
Para reusar sem duplicar:

1. **Extrair** `FilledSlotRow` + `EmptySlotRow` (e os helpers `formatKg`,
   `slotSwatchColor`) para um módulo compartilhado `src/features/storage/SlotRows.tsx`,
   adicionando uma prop opcional `categoria?: Categoria` que é repassada ao
   `MaterialCombobox`. `RuaCard` passa a importar de lá (sem mudança de comportamento).
2. **`LocalCard`** (novo) — para áreas livres:
   - Header: campo de texto editável (`label`, onBlur salva) + botão lixeira
     (abre `AlertDialog`).
   - Corpo: mesmas `SlotRows`, agora com `categoria` repassado.
   - Acento de cor: igual ao `RuaCard` (cor do slot 0); tema da área aplicado
     no header/borda.
3. **`FreeAreaPage`** (novo) — para fora/masters/aditivos:
   - Header com título/subtítulo + tema da área.
   - Grid de `LocalCard` (reusa layout/skeleton do `StorageAreaPage`).
   - `AddRow` (variante por área) com campo inline para nomear o novo local.
   - Empty state próprio ("Nenhum local ainda. Adicione o primeiro.") — **não**
     mostra "rode o seed" (áreas livres não têm seed).

`StorageAreaPage` (Direito/Esquerdo) permanece intacto, apenas trocando o
import das linhas de slot para o módulo `SlotRows`.

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Criar o arquivo do plano

Gravar este conteúdo em `.claude/plans/009-areas-livres-fora-masters-aditivos.md`.

### 2. Extrair `SlotRows` compartilhado

- Novo `src/features/storage/SlotRows.tsx`: mover `FilledSlotRow`,
  `EmptySlotRow`, `formatKg`, `slotSwatchColor` de `RuaCard.tsx`.
- Adicionar prop opcional `categoria?: Categoria` em ambos, repassada ao
  `MaterialCombobox`.
- `RuaCard.tsx` importa de `./SlotRows` (comportamento idêntico; sem passar `categoria`).
- `npm run typecheck` deve continuar verde.

### 3. Mutations de localização — `src/features/storage/useStorage.ts`

Adicionar a `useStorageMutations()`:

- `createLocation(area, label)` → `addDoc(storageCollection, { area, rua: null,
label, ordem: Date.now(), slots: [], createdAt: serverTimestamp(),
updatedAt: serverTimestamp(), updatedBy: uid })`.
- `setLocationLabel(locationId, label)` → `updateDoc(... { label, updatedAt, updatedBy })`.
- `deleteLocation(locationId)` → `deleteDoc(storageDoc(locationId))`.
- Toast em erro, mesmo padrão fire-and-forget dos mutations existentes.
- Nota: o conversor `toFirestore` não inclui `createdAt`; no `createLocation`
  passar o objeto cru via `addDoc(collection(db,"storage_locations"), {...})`
  (sem converter) para gravar `createdAt`, igual o seed do 008.

### 4. shadcn `alert-dialog` (se faltar)

`npx shadcn@latest add alert-dialog` — confirmar se já existe em
`src/shared/components/ui/`. Usado na exclusão de local.

### 5. `LocalCard` — `src/features/storage/LocalCard.tsx`

- Props: `location: StorageLocation`, `categoria?: Categoria`, `variant: "neutral" | "masters" | "aditivos"`.
- Header editável: `<input>` com `label` (onBlur → `setLocationLabel`), só admin;
  reader vê texto estático.
- Botão lixeira (só admin) → `AlertDialog` de confirmação → `deleteLocation`.
- Corpo: `slots.map(FilledSlotRow)` + `EmptySlotRow` (admin, se `< 4`),
  passando `categoria`.
- Acento de cor do slot 0 (reusa lógica do `RuaCard`).

### 6. `FreeAreaPage` — `src/features/storage/FreeAreaPage.tsx`

- Props: `area: "fora" | "masters" | "aditivos"`, com `categoria` e `variant`
  derivados internamente por um map `AREA_CONFIG`.
- `useStorageArea(area)`; loading com skeleton (reusar `RuaCardSkeleton` ou
  extrair para compartilhado).
- Grid igual ao `StorageAreaPage`; cada item é `LocalCard`.
- `AddRow` no fim: clique abre campo inline (`useState` local) para digitar nome;
  Enter chama `createLocation(area, nome)` e limpa o campo. Esc/clique fora cancela.
- Empty state sem material: mostra só o `AddRow`.

### 7. Ativar rotas — `src/routes/_app/{fora,masters,aditivos}.tsx`

Trocar `<EmConstrucao>` por:

```tsx
// fora.tsx
component: () => <FreeAreaPage area="fora" />,
// masters.tsx
component: () => <FreeAreaPage area="masters" />,
// aditivos.tsx
component: () => <FreeAreaPage area="aditivos" />,
```

### 8. Atualizar `CLAUDE.md` + `architecture.md`

- `CLAUDE.md`: status do plano 009 → concluído na tabela.
- `architecture.md`: §5.2 — anotar que áreas livres usam auto-ID (não slug)
  e `rua: null`; confirmar §10 (mapeamento já lista as três rotas).

### 9. Commit

```
git add -A
git commit -m "feat(storage): áreas livres Fora/Masters/Aditivos com CRUD de local (#009)"
```

## Arquivos criados / modificados

```
src/features/storage/SlotRows.tsx        (novo — extraído de RuaCard)
src/features/storage/LocalCard.tsx       (novo)
src/features/storage/FreeAreaPage.tsx    (novo)
src/features/storage/useStorage.ts       (modificado — create/rename/delete location)
src/features/storage/RuaCard.tsx         (modificado — importa SlotRows)
src/shared/components/ui/alert-dialog.tsx (novo — shadcn, se faltar)
src/routes/_app/fora.tsx                 (modificado — FreeAreaPage)
src/routes/_app/masters.tsx              (modificado — FreeAreaPage)
src/routes/_app/aditivos.tsx             (modificado — FreeAreaPage)
.claude/plans/009-areas-livres-fora-masters-aditivos.md (novo)
.claude/architecture.md                  (modificado — nota auto-ID áreas livres)
CLAUDE.md                                (modificado — status 009)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`, logado como **admin**, catálogo com
materiais PADRAO, MASTER e ADITIVO:

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **Fora** (`/fora`): vazio mostra só "Adicionar local". Criar "Doca" via
   AddRow inline → card aparece. Preencher slot 1 com qualquer material; qtd
   salva no onBlur; peso total aparece.
3. **Masters** (`/masters`): tema rosa. Criar local; combobox lista **só**
   materiais MASTER; swatch usa `colorCode`.
4. **Aditivos** (`/aditivos`): tema roxo. Combobox lista **só** ADITIVO.
5. **Renomear**: editar o nome no header de um local → onBlur persiste; recarregar mantém.
6. **Excluir**: lixeira → AlertDialog → confirmar → local some. Cancelar mantém.
7. **Tempo real**: 2 abas; criar/editar/excluir numa reflete na outra.
8. **Permissão**: como `reader`, sem AddRow, sem lixeira, campos read-only;
   escrita manual via console → PERMISSION_DENIED.
9. **Regressão 008**: `/direito` e `/esquerdo` seguem idênticos (SlotRows extraído).
10. **Mobile** (375px): cards empilhados, AddRow e combobox usáveis.

## Não-objetivos (explícitos)

- Geração de log no **Kardex** ao mudar quantidade/criar/excluir local — plano 010.
- Dashboard/agregações das três áreas — plano 011.
- Migração dos dados reais (`legacy/db.json`) — plano 013 (aqui locais começam vazios).
- Regra ≤25kg (sacos vs paletes) — plano 011.
- Validação de `slots.length ≤ 4` / `quantidade >= 0` nas regras — melhoria futura.
