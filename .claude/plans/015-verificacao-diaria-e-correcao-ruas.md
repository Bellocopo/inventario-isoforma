# Plano 015 — Verificação diária de ruas + correção W/G1

Status: concluído

> O antigo "015 — App Check" é postergado e será renumerado (016+) quando for elaborado.

## Context

Dois ajustes, agrupados porque ambos tocam o domínio de storage (Direito/Esquerdo):

1. **Verificação diária (feature).** Todo dia um funcionário (admin) percorre as
   ruas dos lados Direito e Esquerdo conferindo estoques e ajustando quantidades.
   Precisa marcar quais ruas já conferiu no dia, com feedback visual. A marcação
   acontece de duas formas: (a) ao ajustar uma quantidade **ou** dar focus-out em
   qualquer input de qtd de um slot da rua; (b) clicando num botão "conferir".
   Guardamos a **data** da última verificação por rua — se bater com hoje
   (desconsiderando hora), a rua aparece como conferida; no dia seguinte tudo
   reseta naturalmente, sem job noturno.

2. **Correção das ruas W/G1.** A constante `RUAS` em
   [scripts/lib/legacy.ts:75-108](../../scripts/lib/legacy.ts#L75-L108) está errada:
   **omite a rua W** e **inventa a G1**. O `legacy/db.json` real (fonte da
   migração) tem o conjunto correto: `A`–`Z` (com W, entre V e X) + `A1`–`F1` =
   32 ruas. Como a migração espelha `RUAS` e casa por nome
   (`ruaData.find(r => r.rua === rua)`), a rua **W teve os dados descartados** e a
   **G1 foi criada vazia**. Não mexemos no banco de produção (a fonte da verdade
   ainda é o sistema antigo; a migração é re-rodável a qualquer momento) — basta
   corrigir a constante e garantir que migração/seed continuem corretos.

## Decisões consolidadas

| Tema                                      | Decisão                                                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado de verificação                     | Campo `verifiedOn: string \| null` (`"YYYY-MM-DD"` local) + `verifiedBy: string` (uid) no doc da rua. "Conferida" ⇔ `verifiedOn === hoje (local)`. |
| Por que data-string local (não Timestamp) | Comparação "mesmo dia" trivial e à prova de fuso; reflete o relógio de parede do galpão (BRT). Reset diário é automático.                          |
| Quem confere                              | Admin (modelo atual). Reader vê o estado, não marca. Sem mudança de regras/claims.                                                                 |
| Gatilhos de "conferida"                   | (a) `setSlotQuantidade` (ajuste de qtd / focus-out) marca a rua; (b) botão toggle no card. Trocar **material** NÃO marca.                          |
| Botão conferir                            | Toggle: marca como conferida hoje / desmarca (`verifiedOn = null`).                                                                                |
| Progresso                                 | Contador "X/N conferidas hoje" no header de cada lado.                                                                                             |
| Kardex                                    | Verificação pura NÃO gera entrada no Kardex (não é movimentação). Ajuste de qtd continua gerando como hoje.                                        |
| Regras Firestore                          | Sem alteração — `allow write: if isAdmin()` já cobre os campos novos.                                                                              |
| Correção W/G1                             | Trocar `"G1"` por `"W"` na posição correta da constante `RUAS`. Conjunto passa a bater com `db.json`. Sem patch no Firestore prod.                 |

## Passos de execução

> Execução **passo a passo**: implementar só o passo autorizado e parar.

### Parte A — Correção das ruas W/G1

1. **Corrigir a constante `RUAS`** em [scripts/lib/legacy.ts](../../scripts/lib/legacy.ts#L75-L108):
   inserir `"W"` entre `"V"` e `"X"` e remover `"G1"`. Resultado:
   `A … V, W, X, Y, Z, A1 … F1` (32 ruas, igual ao `db.json`). A contagem segue 32,
   então grids e `ordem` continuam consistentes (índices a partir de W deslocam,
   mas `ordem` é re-derivada na migração/seed).
2. **Ajustar a cópia** em
   [StorageAreaPage.tsx:5-17](../../src/features/storage/StorageAreaPage.tsx#L5-L17):
   `"Ruas A-Z (sem W) e A1-G1"` → `"Ruas A-Z e A1-F1"` (Direito e Esquerdo).
3. **Varredura** por outras referências hardcoded a `G1`/`"sem W"` (grep em `src/`
   e `scripts/`) e corrigir se houver. Esperado: só os dois pontos acima.
4. **Validar migração/seed** com `npm run migrate` (dry-run) e confirmar que o
   resumo lista W e não lista G1. Para o emulador de dev, re-rodar a migração
   (purge+recriar) ou limpar dados do emulador, já que o seed pula docs existentes.

### Parte B — Verificação diária

5. **Helper de data local.** Criar `todayLocalISO(): string` (`"YYYY-MM-DD"` a
   partir de `new Date()` local) em `src/shared/lib/date.ts` (reusar se já existir
   util de data). Adicionar `isVerifiedToday(verifiedOn: string | null): boolean`
   no domínio de storage (ex.: `src/features/storage/verification.ts` ou inline em
   `useStorage`/`RuaCard`).
6. **Modelo de dados.** Em [types.ts](../../src/features/storage/types.ts#L28-L38),
   adicionar a `StorageLocation`: `verifiedOn: string | null` e `verifiedBy: string`.
7. **Converter.** Em [firestore.ts](../../src/features/storage/firestore.ts):
   - `fromFirestore`: `verifiedOn: (data.verifiedOn as string | null) ?? null`,
     `verifiedBy: (data.verifiedBy as string) ?? ""` (defaults para docs antigos/migrados).
   - `toFirestore`: incluir `verifiedOn` e `verifiedBy`.
8. **Mutations** em [useStorage.ts](../../src/features/storage/useStorage.ts):
   - Em `setSlotQuantidade` (linhas 86-124), no `batch.update`, somar
     `verifiedOn: todayLocalISO()` e `verifiedBy: user?.uid ?? ""`. Cobre o gatilho
     "ajustar qtd / focus-out marca conferida" (o `onBlur` já chama o save sempre,
     mesmo sem mudança).
   - `createLocation`: setar `verifiedOn: null`, `verifiedBy: ""` no doc novo.
   - Nova `setRuaVerificada(locationId, verified: boolean)`: `updateDoc` com
     `verifiedOn: verified ? todayLocalISO() : null` e
     `verifiedBy: verified ? (user?.uid ?? "") : ""` (sem tocar `updatedAt`/Kardex).
     Exportar no `useStorageMutations`.
9. **UI do card** em [RuaCard.tsx](../../src/features/storage/RuaCard.tsx):
   - Calcular `verified = isVerifiedToday(location.verifiedOn)`.
   - **Feedback visual** (visível a todos): quando conferida, badge verde com check
     (lucide `CheckCircle2`) tipo "Conferida" no header (à direita, `ml-auto`) e um
     realce sutil no card (ex.: `ring-1 ring-green-500/40` + leve tom verde no
     header). Borda esquerda (cor do fornecedor) permanece intacta.
   - **Botão toggle** (admin only): quando não conferida, botão outline "Conferir";
     quando conferida, o badge vira o alvo de clique para desmarcar. Chama
     `setRuaVerificada(id, !verified)`.
10. **Contador de progresso** em
    [StorageAreaPage.tsx](../../src/features/storage/StorageAreaPage.tsx):
    `conferidas = locations.filter(l => isVerifiedToday(l.verifiedOn)).length`,
    `total = locations.length`. Exibir badge "X/N conferidas hoje" no header
    (verde quando `X === N`).

### Parte C — Docs e numeração

11. **architecture.md** (§5.2 storage_locations): documentar os campos
    `verifiedOn`/`verifiedBy` e a semântica "conferida ⇔ verifiedOn === hoje".
12. **CLAUDE.md** (tabela de planos): 015 = este plano; mover "App Check" para 016
    (pendente). Atualizar data de revisão do architecture.md se aplicável.

## Arquivos criados / modificados

- `scripts/lib/legacy.ts` — constante `RUAS` (W no lugar de G1).
- `src/features/storage/types.ts` — campos `verifiedOn`/`verifiedBy`.
- `src/features/storage/firestore.ts` — converter (defaults + toFirestore).
- `src/shared/lib/date.ts` — **novo**, `todayLocalISO()`.
- `src/features/storage/verification.ts` — **novo** (ou helper inline), `isVerifiedToday`.
- `src/features/storage/useStorage.ts` — `setSlotQuantidade` (marca), `createLocation`, nova `setRuaVerificada`.
- `src/features/storage/RuaCard.tsx` — badge + botão toggle + realce visual.
- `src/features/storage/StorageAreaPage.tsx` — cópia A1-F1 + contador de progresso.
- `.claude/architecture.md`, `CLAUDE.md` — docs e numeração.

## Verificação end-to-end

- `npm run typecheck` e `npm run lint` limpos.
- `npm run migrate` (dry-run): resumo lista **W**, não lista **G1**.
- Emulador (`npm run emu`) + `npm run dev`, login como admin:
  - Editar qtd de um slot e dar focus-out → rua vira "Conferida" (badge verde);
    recarregar → persiste.
  - Botão "Conferir" numa rua sem editar → marca; clicar de novo → desmarca.
  - Contador do topo reflete X/N e fica verde quando completo.
  - Rua **W** aparece nos dois lados; **G1** não existe (após re-seed/migrate).
  - "Dia seguinte": setar `verifiedOn` de uma rua para ontem (ou mudar o relógio)
    → o card desmarca sozinho.
  - Login como reader: vê os badges de conferida, sem botão de conferir.

## Não-objetivos (explícitos)

- App Check (vai para plano 016+).
- Patch/migração do Firestore de produção (fonte da verdade ainda é o legado).
- Papel "conferente" separado — verificação fica como ação de admin.
- Histórico de verificações / Kardex de conferência — guardamos só a última data por rua.
- Verificação nas áreas livres (Fora/Masters/Aditivos) — escopo é Direito/Esquerdo.
