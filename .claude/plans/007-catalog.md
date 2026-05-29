# Plano 007 — Catálogo (CRUD `/catalog`)

Status: **em execução**.

## Context

Primeiro plano que **toca o Firestore de verdade**. Cria a feature de
catálogo de materiais (resinas, masters, aditivos) com CRUD completo,
gated por admin via regras + UI. Estabelece também os **padrões de
acesso a dados** que as features seguintes (storage, kardex) vão reusar:
conversor tipado por feature (`withConverter`) + hook custom com
`onSnapshot`.

Infra pronta (planos 002-006): cliente Firebase (`db`, `auth`), auth +
`useRole`, design system shadcn, `SupplierSelect`, `suppliers.ts`. Falta
a primeira coleção com leitura/escrita real.

## Decisões consolidadas

| Item           | Escolha                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| Fornecedor     | Atributo do **material** (catálogo). Rua herda a cor. `fornecedorPadrao` sai de §5.2 |
| Navegação      | Aba própria "Catálogo" → `/catalogo` (AppTabs passa a 9 abas)                        |
| Edição         | Permitir editar inline (tipo/kg/cor/fornecedor) — materialId estável protege refs    |
| Soft-delete    | Desativar (`ativo:false`) + toggle "mostrar inativos" + reativar                     |
| Acesso a dados | Conversor `withConverter` em `features/catalog/firestore.ts` + hook `onSnapshot`     |
| Busca          | Filtro de texto simples + filtro por categoria (sem Combobox aqui)                   |
| Feedback       | `sonner` (toast) para sucesso/erro de escrita                                        |
| Auto-prefixo   | Manter comportamento legacy: "MASTER "/"ADITIVO " prefixado ao tipo se ausente       |

## Modelo por categoria (cor)

- **PADRAO**: tem `fornecedor` (SupplierSelect/bandeira). `colorCode = null`.
- **MASTER**: tem `colorCode` (cor real do pigmento via color picker).
  `fornecedor = "masterbatch"` (default) ou null.
- **ADITIVO**: sem cor. `colorCode = null`, `fornecedor = null`.

Schema final `/catalog/{materialId}` (confirma §5.1, mantém `fornecedor`):

```ts
{
  tipo: string;
  embal: "SC" | "BB";
  kg: number;
  categoria: "PADRAO" | "MASTER" | "ADITIVO";
  colorCode: string | null; // hex para MASTER
  fornecedor: SupplierId | null; // bandeira para PADRAO
  ativo: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar para o próximo.

### 1. Ajustar `architecture.md` (consequência do "fornecedor no material")

- §5.1: confirmar `fornecedor: SupplierId | null` (tipado, não string solta).
- §5.2: remover `fornecedorPadrao` de `storage_locations`; anotar que a
  cor da rua é **derivada** do material em `stock_items` (resolver no
  Plano 008).
- §12: renumerar/confirmar (007 = Catálogo).

### 2. Tipos — `src/features/catalog/types.ts`

```ts
import type { SupplierId } from "@/shared/lib/suppliers";

export type Categoria = "PADRAO" | "MASTER" | "ADITIVO";
export type Embal = "SC" | "BB";

export interface Material {
  id: string;
  tipo: string;
  embal: Embal;
  kg: number;
  categoria: Categoria;
  colorCode: string | null;
  fornecedor: SupplierId | null;
  ativo: boolean;
  createdAt: Date; // convertido de Timestamp na borda
  updatedAt: Date;
}

export type MaterialInput = Omit<Material, "id" | "createdAt" | "updatedAt">;
```

### 3. Conversor Firestore — `src/features/catalog/firestore.ts`

- `catalogConverter: FirestoreDataConverter<Material>` —
  `toFirestore` grava `Timestamp` e remove `id`; `fromFirestore`
  converte `Timestamp → Date` e injeta `id` do snapshot.
- `catalogCollection = collection(db, "catalog").withConverter(catalogConverter)`.
- Helpers: `catalogDoc(id)`.

Esse arquivo é o **padrão de referência** para conversores das próximas
features.

### 4. Hook genérico — `src/shared/hooks/useFirestoreCollection.ts`

```ts
export function useFirestoreCollection<T>(query: Query<T> | null): {
  data: T[];
  loading: boolean;
  error: FirebaseError | null;
};
```

- Encapsula `onSnapshot`, cleanup no unmount, estados loading/error.
- `query` nulo → não escuta (útil enquanto auth não está pronto).

### 5. Hooks do catálogo — `src/features/catalog/useCatalog.ts`

- `useCatalog({ includeInactive }): { materials, loading, error }`
  - Query: `orderBy("tipo")`; filtra `ativo` no cliente (ou
    `where("ativo","==",true)` quando `!includeInactive`).
- `useCatalogMutations()` retorna:
  - `addMaterial(input: MaterialInput)` — `addDoc` com `createdAt/updatedAt = serverTimestamp()`, `ativo: true`. Aplica auto-prefixo.
  - `updateMaterial(id, patch)` — `updateDoc` + `updatedAt`.
  - `setActive(id, ativo)` — soft-delete/reactivate.
  - Todas tratam erro e disparam toast (sonner).

### 6. shadcn adicionais (via CLI)

```
npx shadcn@latest add table switch radio-group form sonner
```

- `table`: lista no desktop.
- `switch`: toggle "mostrar inativos".
- `radio-group`: seletor de categoria (Resina Padrão / Masterbatch / Aditivo).
- `form`: wrapper que integra react-hook-form + zod.
- `sonner`: toasts. Montar `<Toaster />` no `__root` ou `_app`.

### 7. Form de material — `src/features/catalog/CatalogForm.tsx`

Inline (nunca modal). Espelha o legacy:

- `RadioGroup` categoria: Resina Padrão | Masterbatch | Aditivo.
- Campo `tipo` (uppercase on blur), `embal` (`Select` SC/BB), `kg` (number).
- Condicional por categoria:
  - PADRAO → `SupplierSelect` (fornecedor).
  - MASTER → color picker (`<input type="color">`) para `colorCode`.
  - ADITIVO → nenhum campo de cor.
- Validação com zod (`tipo` não-vazio, `kg > 0`).
- Modo duplo: **adicionar** (campos limpos no topo da lista) e **editar**
  (mesma estrutura, pré-preenchida na linha em edição).
- Só renderiza/habilita para `isAdmin`; reader vê a lista mas não o form.

### 8. Lista — `src/features/catalog/CatalogList.tsx` + `CatalogRow.tsx`

- Desktop: `Table` shadcn (colunas: Tipo, Categoria, Embal, KG, Cor/
  Fornecedor, Ações).
- Mobile: cards empilhados (mesma info).
- Cada linha: badge de categoria, `EmbalBadge`, swatch de cor (fornecedor
  ou colorCode), e ações admin (Editar, Desativar/Reativar).
- Linha inativa: opacidade reduzida + tag "inativo".
- Topo: input de busca por texto + filtro por categoria + `Switch`
  "mostrar inativos".

### 9. Rota — `src/routes/_app/catalogo.tsx`

- `createFileRoute("/_app/catalogo")`.
- Compõe `CatalogForm` (admin) + `CatalogList`.
- Usa `useCatalog` + `useCatalogMutations`.

### 10. Aba no `AppTabs`

- Adicionar item "Catálogo" → `/catalogo`, ícone Lucide `BookMarked`
  (ou `Library`). AppTabs passa a 9 abas.
- Não existe placeholder de catálogo (nunca foi criado) — só adicionar
  a nova.

### 11. Regras Firestore

- Já cobrem `/catalog` (read signed-in, write admin). **Sem mudança**
  obrigatória.
- Opcional (registrar como melhoria, não implementar agora): validar
  no rules que `categoria` ∈ enum e `kg > 0`.

### 12. Atualizar `CLAUDE.md`

- Marcar 006 concluído (se ainda não), 007 em execução.
- Confirmar tabela renumerada.

### 13. Commit

```
git add -A
git commit -m "feat(catalog): CRUD de materiais em /catalogo com soft-delete (#007)"
```

## Arquivos criados / modificados

```
src/features/catalog/types.ts                 (novo)
src/features/catalog/firestore.ts             (novo — conversor padrão)
src/features/catalog/useCatalog.ts            (novo)
src/features/catalog/CatalogForm.tsx          (novo)
src/features/catalog/CatalogList.tsx          (novo)
src/features/catalog/CatalogRow.tsx           (novo)
src/shared/hooks/useFirestoreCollection.ts    (novo — padrão de leitura)
src/shared/components/ui/{table,switch,radio-group,form,sonner}.tsx (novos — shadcn)
src/routes/_app/catalogo.tsx                  (novo)
src/shared/components/AppTabs.tsx             (modificado — aba Catálogo)
src/routes/__root.tsx ou _app.tsx             (modificado — <Toaster /> do sonner)
.claude/architecture.md                       (modificado — §5.1/§5.2/§12)
CLAUDE.md                                     (modificado — status)
package.json / package-lock.json              (modificado — shadcn deps)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`, logado como usuário com claim
`{"role":"admin"}`:

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **Aba Catálogo** aparece no AppTabs e abre `/catalogo`.
3. **Adicionar PADRAO**: tipo "R-350-L", embal SC, kg 1500, fornecedor
   Innova → aparece na lista com swatch vermelho. Toast de sucesso.
4. **Adicionar MASTER**: tipo "PSAI BRANCO 001" → vira "MASTER PSAI
   BRANCO 001" (auto-prefixo), color picker define swatch.
5. **Adicionar ADITIVO**: sem cor; auto-prefixo "ADITIVO ".
6. **Editar**: muda kg de um material → persiste, `updatedAt` atualiza.
7. **Desativar**: material some da lista padrão. Toggle "mostrar
   inativos" → reaparece marcado como inativo. **Reativar** → volta.
8. **Tempo real**: abrir 2 abas; adicionar numa, aparece na outra sem
   reload (onSnapshot).
9. **Gating de permissão**:
   - Logar como `reader` (sem claim admin) → vê a lista, **não** vê o
     form nem botões de ação. Tentar escrita manual (via console)
     → bloqueado pelas regras (PERMISSION_DENIED).
10. **Busca/filtro**: filtrar por texto e por categoria reduz a lista.
11. **Persistência offline**: cortar a rede (DevTools offline) → lista
    ainda visível (cache); escrita enfileira e sincroniza ao voltar.

## Não-objetivos (explícitos)

- Selecionar material numa rua (Combobox de busca) — Plano 008.
- Migração do catálogo legado — Plano 013.
- Planilha Amarela — Plano 012.
- Validação de schema nas regras Firestore — registrar como melhoria.
- Edição em massa / import CSV — fora de escopo.

## Próximos planos

- 008 — Storage locations + stock items (Lado Direito/Esquerdo); usa o
  catálogo via Combobox e deriva a cor da rua do `fornecedor` do material.
- 009 — Áreas livres (Fora, Masters, Aditivos).
