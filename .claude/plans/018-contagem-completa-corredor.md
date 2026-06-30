# Plano 018 — Data da última contagem completa por corredor

Status: em execução

## Context

Incrementa o Plano 017. No card de **Resinas Padrão** da dashboard, queremos uma linha
sutil ao final mostrando a data da última **contagem completa** de cada corredor
(Direito e Esquerdo) — ou seja, o último dia em que **todas** as ruas daquele lado
ficaram conferidas (`verifiedOn === aquele dia`).

Hoje "rua conferida hoje" já existe ([verification.ts](../../src/features/storage/verification.ts),
[useStorage.ts:105](../../src/features/storage/useStorage.ts) e
[setRuaVerificada](../../src/features/storage/useStorage.ts)), e a página do corredor já
computa `allDone` ([StorageAreaPage.tsx:49](../../src/features/storage/StorageAreaPage.tsx)).
Mas isso é efêmero: se uma rua for desmarcada depois, a informação de "houve contagem
completa no dia D" se perde. Por isso **persistimos** a data num doc de controle, que só
é sobrescrito quando um **novo** dia atinge a completude — nunca apagado ao desmarcar.

## Decisões consolidadas

| Tema                    | Decisão                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Definição de "completa" | Todas as ruas do corredor (`area` direito/esquerdo) com `verifiedOn === hoje`. Vale tanto pelo botão "Conferir" quanto pelo ajuste de quantidade (ambos marcam `verifiedOn`). |
| Quando gravar           | **Na escrita.** Após marcar/ajustar uma rua, relê as ruas do corredor; se completas e o controle ainda não é hoje, grava hoje.                                                |
| Onde guardar            | Coleção `control`, **um doc por corredor**: `control/direito` e `control/esquerdo`, com `{ lastCompleteOn: "YYYY-MM-DD" \| null, updatedAt, updatedBy }`.                     |
| Não-regressão           | Desmarcar rua nunca altera/apaga o controle. Só sobrescreve quando um novo dia completa.                                                                                      |
| Permissão               | `control` write `isAdmin` (consistente: marcar ruas já é admin-only). Read `isSignedIn`.                                                                                      |
| Exibição                | Linha única sutil **só no card PADRAO**: `Contagem completa · Dir 30/06 · Esq 28/06`; `—` quando nunca houve.                                                                 |

## Passos de execução

1. **Plano oficial.** Criar este arquivo e registrar nas tabelas do
   [CLAUDE.md](../../CLAUDE.md) e roadmap do [.claude/architecture.md](../architecture.md).

2. **Rules.** Em [firestore.rules](../../firestore/firestore.rules) adicionar
   `match /control/{docId} { allow read: if isSignedIn(); allow write: if isAdmin(); }`.
   (Deploy via `npm run rules:deploy` é passo manual fora do código.)

3. **Feature `control` (nova).** Criar `src/features/control/`:
   - `types.ts`: `interface CorridorCount { area: "direito" | "esquerdo"; lastCompleteOn: string | null }`.
   - `firestore.ts`: converter + `controlCollection = collection(db, "control").withConverter(...)`
     (fromFirestore: `area = snapshot.id`, `lastCompleteOn = data.lastCompleteOn ?? null`).
   - `useCorridorCounts.ts`: lê via `useFirestoreCollection(query(controlCollection))` e
     retorna `{ direito: string | null; esquerdo: string | null }` (map por `area`).
     Reusa [useFirestoreCollection](../../src/shared/hooks/useFirestoreCollection.ts).

4. **Helper de data.** Em [date.ts](../../src/shared/lib/date.ts) adicionar
   `formatLocalISOToBr(iso: string): string` (`"YYYY-MM-DD" → "dd/mm"` ou `dd/mm/aa`;
   alinhar com o formato curto da linha). Mesma lógica já duplicada em reports — aqui
   fica a versão canônica (não refatorar reports neste plano).

5. **Gravação na escrita — [useStorage.ts](../../src/features/storage/useStorage.ts).**
   Adicionar helper interno `maybeMarkCorridorComplete(area)` em `useStorageMutations`:
   - retorna cedo se `area` não for direito/esquerdo;
   - `getDoc(control/{area})`; se `lastCompleteOn === hoje`, retorna (evita reler ruas);
   - `getDocs(query(storageCollection, where("area","==",area)))`; se não-vazio e
     **todas** com `verifiedOn === hoje`, `setDoc(doc(db,"control",area), { lastCompleteOn: hoje,
updatedAt: serverTimestamp(), updatedBy }, { merge: true })`.
   - Chamar **após** sucesso de `setSlotQuantidade` (usando `snap.data().area`) e de
     `setRuaVerificada(...true)`. Estender a assinatura de `setRuaVerificada` para receber
     a `area` (passada pelo RuaCard); **não** chamar ao desmarcar (`verified === false`).
   - Imports novos: `getDocs`, `setDoc`.

6. **RuaCard.** Em [RuaCard.tsx](../../src/features/storage/RuaCard.tsx) passar
   `location.area` na chamada `setRuaVerificada(id, location.area, !verified)`.

7. **Card de resinas.** Em [CategoryCards.tsx](../../src/features/dashboard/CategoryCards.tsx)
   adicionar prop `corridorCounts?: { direito: string | null; esquerdo: string | null }`
   e, **somente** quando `cat.id === "PADRAO"`, renderizar ao final uma linha sutil
   (`text-white/60` selecionado / `text-muted-foreground` idle):
   `Contagem completa · Dir {fmt(direito)} · Esq {fmt(esquerdo)}` (`—` quando null).

8. **Ligação na dashboard.** Em [index.tsx](../../src/routes/_app/index.tsx) chamar
   `useCorridorCounts()` e passar `corridorCounts` para `CategoryCards`.

9. **Verificação** (seção abaixo).

## Arquivos criados / modificados

- **Novos:** `src/features/control/types.ts`, `src/features/control/firestore.ts`,
  `src/features/control/useCorridorCounts.ts`.
- **Modificados:** `firestore/firestore.rules`, `src/shared/lib/date.ts`,
  `src/features/storage/useStorage.ts`, `src/features/storage/RuaCard.tsx`,
  `src/features/dashboard/CategoryCards.tsx`, `src/routes/_app/index.tsx`,
  `CLAUDE.md`, `.claude/architecture.md`.
- **Reaproveitados:** `useFirestoreCollection`, `todayLocalISO`/`isVerifiedToday`,
  `storageCollection`, padrão de converter de
  [catalog/firestore.ts](../../src/features/catalog/firestore.ts).

## Verificação end-to-end

1. `npm run typecheck` e `npm run lint` limpos.
2. Emulador (`npm run emu`) + `npm run dev`:
   - Conferir todas as ruas de um corredor (botão ou ajustando qtd) → `control/{area}`
     ganha `lastCompleteOn = hoje`; card de resinas mostra a data do lado.
   - Desmarcar uma rua → a data **permanece** (não recalcula nem apaga).
   - Corredor incompleto desde o início → linha mostra `—` para aquele lado.
   - Marcar/ajustar com o corredor já completo hoje → sem write redundante (guard do getDoc).
3. Conferir com usuário **reader**: não dispara escrita (mutations já são admin-only).

## Não-objetivos (explícitos)

- Não criar histórico de contagens (só a última data por corredor).
- Não tocar masters/aditivos/fora (sem conceito de contagem completa de corredor).
- Não refatorar as funções de formatação de data duplicadas em `features/reports`.
- Não automatizar deploy das rules (continua `npm run rules:deploy` manual).
