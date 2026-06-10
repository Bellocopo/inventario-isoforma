# Plano 013 — Migração `legacy/db.json` → Firestore

Status: concluído

## Context

Para validar a nova versão com dados reais, é preciso carregar o inventário do
sistema legado no Firestore. A fonte é
[legacy/db.json](../../legacy/db.json) — o export do **documento único** do
legado (formato Firestore REST: `fields.<area>.stringValue` com arrays
`JSON.stringify`ados: `catalogo`, `direito`, `esquerdo`, `fora`, `masters`,
`aditivos`).

O usuário vai **recarregar esse inventário várias vezes** enquanto valida a nova
versão (o db.json é atualizado com novas contagens). Logo o script precisa ser
**re-executável de forma previsível**: cada carga reflete fielmente o db.json.

**Reuso central:** [scripts/seed-emulator.ts](../../scripts/seed-emulator.ts) **já
implementa todo o mapeamento legacy → schema novo** e está validado em uso:
`parseLegacyDb`, `supplierMap` (cor da rua → `SupplierId`), `inferCategoria`,
`catalogDocId` (ID **determinístico** `tipo-slug_embal`), `buildSlots`, lista
`RUAS`, áreas livres. Porém ele (a) mira só o **emulador** e (b) **pula** docs
existentes (não atualiza). Este plano extrai esse mapeamento para um módulo
compartilhado e cria um script de migração que mira um **projeto Firebase real**
e faz **purge + recriação**.

### Achados da análise do db.json (validados)

- `catalogo`: 67 itens `{ tipo, embal, kg, colorCode?, categoria? }`. **57/67 sem
  `categoria`** → inferida por heurística (`inferCategoria`). 15 com `colorCode`.
- `direito`/`esquerdo`: 32 ruas cada, `{ rua, color, resina1..3, q1..3, ... }`.
  `color` = fornecedor (`innova, amsty, unigel, petrocuyo, essentia, estyrenics,
braskem`) — **só existe nas ruas**, não no catálogo.
- `fora`/`masters`/`aditivos`: `{ id, local, resina1..4, q1..4 }` (até 4 slots).
- `resinaN` = `"tipo|embal"`. **Integridade referencial: 37 refs distintas, 0
  ausentes** no catálogo. Migração limpa.

## Decisões consolidadas

| Item              | Escolha                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Estratégia re-run | **Purge + recriar** `catalog` + `storage_locations` (db.json = fonte da verdade; sem órfãos)        |
| Alvo              | **Projeto Firebase real** via `applicationDefault()` (service account, como `set-role.ts`)          |
| Alvo alternativo  | Flag **`--emulator`** → seta `FIRESTORE_EMULATOR_HOST` e recarrega o emulador local                 |
| Kardex            | **Preservado** — o script só toca `catalog` + `storage_locations`; nunca apaga `kardex`             |
| Segurança         | **`--dry-run` é o default**; escrita real exige `--commit`; em projeto real (não-emu) exige `--yes` |
| Mapeamento        | **Extraído** de `seed-emulator.ts` p/ `scripts/lib/legacy.ts` (builders puros) — DRY, sem drift     |
| Auth/usuários     | **Fora** — migração é só dados; usuários do projeto real são geridos no console + `set-role`        |
| IDs               | Determinísticos (`catalogDocId`, `<area>_<rua>`, `<area>_<legacyId>`) — estáveis entre cargas       |

## Arquitetura do script

```
scripts/
├── lib/
│   └── legacy.ts          (NOVO — mapeamento puro, sem I/O de Firestore)
├── seed-emulator.ts       (refatorado — passa a importar de lib/legacy.ts)
└── migrate-legacy-to-firestore.ts  (NOVO — alvo real, purge+recriar, dry-run)
```

`scripts/lib/legacy.ts` expõe (tudo puro, retorna objetos de doc — **sem**
`serverTimestamp`, que o writer injeta):

```ts
// tipos: SupplierId, Categoria, Embal, LegacyCatalogItem, LegacyRua, LegacyFreeItem
parseLegacyDb(path): { catalogo, direito, esquerdo, fora, masters, aditivos }
buildSupplierMap(ruas): Map<"tipo|embal", SupplierId>
inferCategoria(item): Categoria
catalogDocId(tipo, embal): string
buildCatalogDocs(legacy): { id, data }[]            // data sem timestamps
buildStorageLocationDocs(legacy): { id, data }[]    // direito/esquerdo (RUAS fixas) + free
validateRefs(legacy): { resolved: number; missing: string[] }
```

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Criar o arquivo do plano

Gravar este conteúdo em `.claude/plans/013-migracao-legacy-db-json-firestore.md`.

### 2. Extrair mapeamento — `scripts/lib/legacy.ts` (novo)

Mover de `seed-emulator.ts`: tipos `Legacy*`/`SupplierId`/`Categoria`/`Embal`,
`VALID_SUPPLIER_IDS`/`toSupplierId`, `inferCategoria`, `catalogDocId`, `RUAS`,
`parseLegacyDb`, `buildSupplierMap`, `buildSlots`. Acrescentar os builders
`buildCatalogDocs`, `buildStorageLocationDocs`, `validateRefs` (puros, retornam
`{ id, data }` sem `serverTimestamp`).

### 3. Refatorar `scripts/seed-emulator.ts`

Passar a **importar** de `lib/legacy.ts` em vez de definir localmente; manter o
comportamento atual (skip-if-exists, seed de usuários, hosts do emulador). O
writer adiciona `createdAt/updatedAt: serverTimestamp()` e `updatedBy: "seed"`.

### 4. Script de migração — `scripts/migrate-legacy-to-firestore.ts` (novo)

- **Args:** `--dry-run` (default), `--commit`, `--yes`, `--emulator`.
- **Init alvo:**
  - `--emulator` → `process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"` antes
    de `initializeApp({ credential: applicationDefault(), projectId })`.
  - senão → projeto real via `applicationDefault()`
    (`GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json`).
- **Fluxo:**
  1. Echo: `projectId`, alvo (REAL/EMULADOR), modo (DRY-RUN/COMMIT).
  2. `parseLegacyDb` → `buildCatalogDocs` + `buildStorageLocationDocs` +
     `validateRefs`. Imprime **resumo** (counts por coleção, refs resolvidas,
     `missing` se houver).
  3. **Guard:** se alvo REAL e `--commit` sem `--yes` → aborta pedindo `--yes`.
  4. **dry-run:** para após o resumo (não escreve).
  5. **commit:**
     - **Purge** (chunked, ≤500/batch): apaga **todos** os docs de `catalog` e de
       `storage_locations`. **`kardex` intocado.**
     - **Write** (chunked): `set` de cada `{ id, data }` com
       `createdAt/updatedAt: serverTimestamp()`, `updatedBy: "migration"`.
  6. Imprime counts finais.

### 5. Comando npm + docs

- `package.json`: `"migrate": "tsx --tsconfig tsconfig.scripts.json scripts/migrate-legacy-to-firestore.ts"`.
- `README.md`: seção "Migrar `legacy/db.json` para o Firestore" (service account em
  `secrets/`, `GOOGLE_APPLICATION_CREDENTIALS`, exemplos de uso + `--emulator`).
- `architecture.md` §8: script existe; **purge+recriar**; preserva kardex;
  dry-run default; aponta para `scripts/lib/legacy.ts` como mapeamento canônico.
- `CLAUDE.md`: tabela de comandos npm (+ `migrate`); status do plano 013 → concluído.

### 6. Verificação + commit

`npm run typecheck && npm run lint && npm run build`; depois:

```
git add -A
git commit -m "feat(migration): script legacy/db.json → Firestore (purge+recriar, dry-run) (#013)"
```

## Arquivos criados / modificados

```
scripts/lib/legacy.ts                       (novo — mapeamento puro compartilhado)
scripts/migrate-legacy-to-firestore.ts      (novo — migração alvo real, purge+recriar)
scripts/seed-emulator.ts                    (modificado — importa lib/legacy.ts)
package.json                                (modificado — script "migrate")
README.md                                   (modificado — como migrar)
.claude/plans/013-migracao-legacy-db-json-firestore.md (novo)
.claude/architecture.md                     (modificado — §8)
CLAUDE.md                                    (modificado — comandos + status 013)
```

## Verificação end-to-end

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **Dry-run (default):** `npm run migrate` (com credenciais) imprime alvo,
   projectId, modo DRY-RUN e resumo: ~67 catalog, ~64 ruas + ~N livres,
   **0 refs ausentes**. **Nada é escrito.**
3. **Emulador:** com `npm run emu` rodando, `npm run migrate -- --emulator
--commit` recarrega o emulador; o app (`npm run dev`) mostra catálogo, ruas e
   áreas livres do db.json.
4. **Idempotência de conteúdo:** rodar de novo sem mudar o db.json → mesmo
   resultado (purge+recriar); counts iguais.
5. **Atualização:** editar uma `qN` no db.json, recarregar → o app reflete a nova
   quantidade; materiais/locais removidos do db.json **somem** (purge).
6. **Kardex preservado:** gerar uma movimentação no app, recarregar a migração →
   o `/kardex` continua intacto.
7. **Guard:** alvo real + `--commit` sem `--yes` → aborta com instrução; com
   `--yes` → executa.
8. **Seed do emulador inalterado:** `npm run emu` continua seedando como antes
   (refator não quebrou `seed-emulator.ts`).

## Não-objetivos (explícitos)

- **Migrar usuários/Auth** — fora; geridos no console + `set-role`.
- **Migrar histórico de Kardex** — não existe no db.json; kardex começa/permanece
  como está.
- **Merge inteligente** (preservar edições do app) — descartado a favor de
  purge+recriar (db.json é a fonte da verdade na validação).
- **UI de importação** no app — é script de operador, roda local.
- **Agendamento/automação** da migração — manual por enquanto.
