# Plano 010 — Kardex (log de movimentação)

Status: concluído

## Context

O Kardex é o **log imutável de movimentação de estoque** — toda vez que a
quantidade de um material num slot muda, registra-se uma ENTRADA ou SAIDA com
material, local, quantidade movimentada, kg, usuário e data. No legado isso é
feito no `onBlur` do campo de quantidade (`handleBlurLog`), cobre as 5 áreas
(Direito, Esquerdo, Fora, Masters, Aditivos) e tem exclusão admin.

O schema já está definido na [architecture.md §5.4](.claude/architecture.md) e
as regras Firestore para `/kardex` já existem
([firestore.rules](firestore/firestore.rules): `read` signed-in, `create`/`delete`
admin, `update` proibido). Os planos 008/009 deixaram o marcador
`// TODO(010): log kardex no diff de quantidade` exatamente no ponto de injeção:
`setSlotQuantidade` em [useStorage.ts:81](src/features/storage/useStorage.ts).
Como esse mutation é **compartilhado por todas as áreas** (via `SlotRows`),
injetar o log ali cobre as 5 telas de uma vez.

Este plano: (a) injeta a escrita do Kardex no diff de quantidade e (b) constrói
a tela `/kardex` com resumo, filtros, paginação e exclusão admin.

### Já pronto (reusar sem mudança)

- Regras `/kardex` em [firestore.rules](firestore/firestore.rules) — **sem mudança**.
- Hook genérico [useFirestoreCollection](src/shared/hooks/useFirestoreCollection.ts).
- Padrão de conversor por feature (`withConverter` + `collection` + `doc`) —
  espelhar [storage/firestore.ts](src/features/storage/firestore.ts).
- [useAuth](src/features/auth/useAuth.ts) expõe `user` e `displayName`;
  helper [getDisplayName](src/features/auth/displayName.ts) como fallback.
- shadcn já instalados: `table`, `select`, `badge`, `alert-dialog`, `card`,
  `button`. `MaterialCombobox` e `EmbalBadge` reusáveis nos filtros/linhas.
- Aba "Kardex" → `/kardex` já existe em [AppTabs.tsx](src/shared/components/AppTabs.tsx).

## Decisões consolidadas

| Item                      | Escolha                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Gatilho do log            | Diff de **quantidade** em `setSlotQuantidade`. ENTRADA se delta>0, SAIDA se delta<0; delta=0 → nada |
| `qtd` / `kgTotal`         | `qtd = abs(delta)` (sempre positivo); `kgTotal = abs(delta) * kgUnit`                               |
| Troca/limpeza de material | **Não gera log** (paridade legado) — só quantidade move o Kardex                                    |
| Atomicidade               | `writeBatch`: atualiza o doc da rua + cria a entrada do Kardex juntos (all-or-nothing)              |
| `tipo` enum               | `"ENTRADA" \| "SAIDA"` (sem acento, conforme §5.4)                                                  |
| Tela                      | Cards de resumo (entradas/saídas/balanço) + filtros + tabela + paginação + exclusão admin           |
| Filtros                   | Material (`MaterialCombobox`), local (`Select`), tipo (`Select`) — **server-side**                  |
| Paginação                 | Cursor-based (`startAfter` + pilha de cursores) + seletor de tamanho + `getCountFromServer`         |
| UI de paginação           | shadcn `pagination` (só visual); navegação real por cursor (ver nota Firestore abaixo)              |
| Exclusão                  | Admin, via `AlertDialog` de confirmação → `deleteDoc`                                               |

### Nota Firestore sobre paginação

Firestore é **cursor-based**, não tem offset barato. O componente `pagination`
do shadcn é apenas a UI (botões/números). A navegação real:

- **Próxima**: `query(..., startAfter(últimoDoc), limit(pageSize))`; empilha o
  cursor.
- **Anterior**: desempilha o cursor anterior.
- **Total de páginas**: `getCountFromServer(query)` (1 leitura agregada barata)
  → `ceil(total / pageSize)`.
- Os botões numerados navegam **sequencialmente** pelos cursores já visitados;
  pulo direto a uma página distante não é gratuito no Firestore (custaria ler
  os docs intermediários) — fica fora do escopo. Anterior/Próxima + indicador
  "Página X de N" cobrem o uso de chão de fábrica.

## Schema — `/kardex/{logId}` (espelho de architecture §5.4)

```ts
interface KardexEntry {
  id: string;
  timestamp: Date; // serverTimestamp na escrita; Date na borda do hook
  materialId: string;
  materialSnapshot: { tipo: string; embal: "SC" | "BB"; kgUnit: number };
  locationId: string;
  locationLabel: string; // snapshot do label na hora
  tipo: "ENTRADA" | "SAIDA";
  qtd: number; // sempre positivo (abs do delta)
  kgTotal: number; // qtd * kgUnit
  userId: string;
  userDisplay: string; // snapshot do nome exibido
}
```

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Criar o arquivo do plano

Gravar este conteúdo em `.claude/plans/010-kardex.md`.

### 2. shadcn `pagination`

`npx shadcn@latest add pagination` → `src/shared/components/ui/pagination.tsx`.

### 3. Tipos — `src/features/kardex/types.ts`

`KardexEntry` (acima), `KardexEntryInput` (`Omit<KardexEntry,"id"|"timestamp">`),
`KardexTipo = "ENTRADA" | "SAIDA"`, e `KardexFilters` (`materialId?`, `locationId?`,
`tipo?`). Reaproveita `Embal` do catálogo.

### 4. Firestore — `src/features/kardex/firestore.ts`

- `kardexConverter` (mesmo padrão do storage: `toFirestore` grava campos;
  `fromFirestore` injeta `id` e converte `Timestamp→Date`).
- `kardexCollection = collection(db,"kardex").withConverter(...)`, `kardexDoc(id)`.
- `buildKardexEntry({ slot, locationId, locationLabel, delta, userId, userDisplay })`
  → monta `KardexEntryInput` (decide `tipo`, `qtd=abs(delta)`, `kgTotal`).
- `writeKardexEntryToBatch(batch, input)` — adiciona um `set` em doc auto-ID com
  `timestamp: serverTimestamp()`. (Função pura/sem hook, reusável pelo storage.)

### 5. Injetar log no diff — `src/features/storage/useStorage.ts`

Em `setSlotQuantidade` (substituindo o `// TODO(010)`):

- `const old = slots[slotIndex].quantidade; const delta = qtd - old;`
- Trocar o `updateDoc` por um `writeBatch(db)`:
  - `batch.update(doc(db,"storage_locations",locationId), { slots, updatedAt, updatedBy })`.
  - Se `delta !== 0`: `writeKardexEntryToBatch(batch, buildKardexEntry({ slot, locationId, locationLabel: data.label, delta, userId, userDisplay }))`.
  - `await batch.commit()`.
- `useStorageMutations` passa a ler `displayName` de `useAuth` (`userDisplay =
displayName ?? getDisplayName(user) ?? ""`).
- `setSlotMaterial` permanece **sem** log (decisão paridade legado).

### 6. Hook — `src/features/kardex/useKardex.ts`

- `useKardex({ filters, pageSize })`:
  - Monta a query base `query(kardexCollection, ...whereDosFiltros, orderBy("timestamp","desc"), limit(pageSize))`.
  - Estado de paginação: pilha de cursores (`startAfter`), página atual, `goNext`/`goPrev`.
  - `total` via `getCountFromServer(queryFiltradaSemLimit)` → `totalPages`.
  - Retorna `{ entries, loading, page, totalPages, goNext, goPrev, hasNext }`.
- `useKardexMutations()`: `deleteEntry(id)` → `deleteDoc(kardexDoc(id))` com toast.
- Filtros são **mutuamente exclusivos entre material e local** (raramente combinados);
  `tipo` combina com qualquer um.

### 7. Tela — `src/routes/_app/kardex.tsx`

Substituir `<EmConstrucao>` por:

- **Cards de resumo** (sobre o conjunto carregado): Total Entradas (kg, verde),
  Total Saídas (kg, vermelho), Balanço.
- **Barra de filtros**: `MaterialCombobox` (material), `Select` de local
  (lista de `storage_locations` por label), `Select` de tipo (Todos/ENTRADA/SAIDA),
  botão "Limpar filtros".
- **Tabela** (shadcn `table`): Data/Hora | Operação (badge verde/vermelho) |
  Material (+`EmbalBadge`) | Qtd / Peso | Local | Usuário (`hidden md:table-cell`) |
  Ações (lixeira, só admin).
- **Paginação**: shadcn `pagination` + `Select` de tamanho (25/50/100) +
  "Página X de N" (ver nota Firestore).
- **Exclusão**: lixeira → `AlertDialog` → `deleteEntry`.
- Estados: skeleton no loading; empty ("Nenhuma movimentação registrada.").

### 8. Índices — `firestore/firestore.indexes.json`

Adicionar índices compound (campo `timestamp` desc + filtros):

- `(materialId asc, timestamp desc)`
- `(locationId asc, timestamp desc)`
- `(tipo asc, timestamp desc)`
- `(materialId asc, tipo asc, timestamp desc)`
- `(locationId asc, tipo asc, timestamp desc)`

(`timestamp desc` puro usa índice single-field automático.) Deploy via
`npm run rules:deploy` cobre regras; índices via `firebase deploy --only
firestore:indexes` (anotar no plano). No emulador, índices não são exigidos;
em prod, query sem índice retorna erro com link de criação 1-clique.

### 9. Atualizar `architecture.md` + `CLAUDE.md`

- `architecture.md`: §5.4 confirmar `tipo: "ENTRADA"|"SAIDA"`; anotar tela com
  filtros + paginação cursor-based; §11 — remover/atualizar item de arquivamento
  se necessário.
- `CLAUDE.md`: status do plano 010 → concluído.

### 10. Commit

```
git add -A
git commit -m "feat(kardex): log de movimentação no diff de quantidade + tela /kardex (#010)"
```

## Arquivos criados / modificados

```
src/features/kardex/types.ts             (novo)
src/features/kardex/firestore.ts         (novo — converter, collection, buildKardexEntry, writeKardexEntryToBatch)
src/features/kardex/useKardex.ts         (novo — hook listagem/paginação/filtros + delete)
src/features/storage/useStorage.ts       (modificado — writeBatch + log no diff)
src/routes/_app/kardex.tsx               (modificado — tela real)
src/shared/components/ui/pagination.tsx  (novo — shadcn)
firestore/firestore.indexes.json         (modificado — 5 índices compound)
.claude/plans/010-kardex.md              (novo)
.claude/architecture.md                  (modificado — §5.4/§11)
CLAUDE.md / package.json / package-lock.json (modificados)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`, logado como **admin**, ruas seedadas e
catálogo com materiais:

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **ENTRADA**: na rua A (Direito), slot 1 com material X, mudar qtd 0→10
   (onBlur) → aparece 1 entrada ENTRADA, qtd 10, kgTotal = 10×kgUnit, usuário
   e data corretos.
3. **SAIDA**: mudar 10→4 → entrada SAIDA, qtd 6, kgTotal = 6×kgUnit.
4. **Sem movimento**: re-salvar mesma qtd (4→4) → nenhuma entrada nova.
5. **Atomicidade**: a qtd da rua e a entrada do Kardex aparecem juntas (batch).
6. **Cobertura de áreas**: repetir mudando qtd em Masters/Aditivos/Fora →
   também logam, com `locationLabel` certo.
7. **Troca de material**: trocar o material do slot (sem mudar qtd) → **não**
   gera entrada (paridade legado).
8. **Filtros**: filtrar por material → só entradas daquele material; por local;
   por tipo ENTRADA/SAIDA; combinar material+tipo. (Se faltar índice em prod,
   usar o link do erro para criar.)
9. **Paginação**: definir pageSize=25; "Página X de N" coerente com
   `getCountFromServer`; Próxima/Anterior navegam por cursor.
10. **Exclusão**: lixeira → AlertDialog → confirmar → entrada some; cancelar mantém.
11. **Tempo real**: 2 abas; gerar movimento numa, aparece na lista da outra.
12. **Permissão**: como `reader`, sem lixeira; tentativa de create/delete via
    console → PERMISSION_DENIED. Reader não edita qtd, então não gera log.
13. **Mobile** (375px): coluna Usuário oculta; tabela com scroll; filtros usáveis.

## Não-objetivos (explícitos)

- Log de **troca/limpeza de material** — fora (paridade legado); reavaliar no futuro.
- Busca de material com histórico no **Dashboard** — plano 011 (reusa os índices).
- **Export Excel** do Kardex — plano 012.
- **Arquivamento/partição** do Kardex por ano — melhoria futura (architecture §11).
- **Edição** de entradas — proibida por design (`update: if false`).
- Pulo direto a página distante arbitrária (offset) — limitação Firestore assumida.
