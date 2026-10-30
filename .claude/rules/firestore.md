---
paths:
  - "firestore/**"
  - "src/features/*/firestore.ts"
  - "src/features/*/use*.ts"
  - "src/shared/hooks/**"
  - "src/shared/lib/firebase.ts"
---

# Firestore — ao mexer em dados

Modelo e regras completos: [.claude/architecture.md §5–7](../architecture.md).

- **Coleção nova** precisa de `match` explícito em `firestore/firestore.rules`
  (o catch-all nega tudo) e de seção em `architecture.md §5`.
- **Query nova com `where` + `orderBy`** (ou `where` em campos diferentes)
  precisa de índice composto em `firestore/firestore.indexes.json`. Sem ele,
  em produção o listener falha só com erro no console.
- Leitura por `useFirestoreCollection` + `withConverter` definido no
  `firestore.ts` da feature. Não criar hook de listener paralelo.
- Escritas que precisam andar juntas (slot + kardex) vão no mesmo
  `writeBatch`.
- Material referenciado sempre por `materialId` + `materialSnapshot`.
- Datas de calendário (`verifiedOn`, `lastCompleteOn`) são `YYYY-MM-DD`
  local via `src/shared/lib/date.ts`; instantes são `serverTimestamp()`.
- Mudou regra ou índice? Lembrar o usuário de rodar `npm run rules:deploy`
  (produção — não rodar por conta própria).
