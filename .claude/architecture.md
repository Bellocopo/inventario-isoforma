# Inventário Isoforma — Arquitetura

Referência viva das decisões transversais (stack, modelo de dados, contratos,
convenções). Descreve **como o sistema é hoje**, não como chegou aqui — o
histórico fica no git. Ao concluir um plano que mude algo daqui, atualize este
arquivo no mesmo commit.

## 1. Contexto

Reescrita do sistema de inventário físico da Isoforma (resinas, masters e
aditivos por rua/área do galpão). O legado (`legacy/index.html`, local e
gitignored) era uma SPA monolítica com React via CDN, Firestore num único
documento com JSON empacotado, credenciais no HTML e autorização só no
cliente. O produto é preservado (manual em
`legacy/Manual_de_Funcionamento_Inventario_Isoforma.pdf`); os problemas
estruturais, não.

Requisito duro: **front-only + Firestore como cliente em tempo real**. Sem
backend próprio.

## 2. Stack

| Camada          | Escolha                                                      |
| --------------- | ------------------------------------------------------------ |
| Build           | Vite 8                                                       |
| Linguagem       | TypeScript 6 (`strict`)                                      |
| UI              | React 18                                                     |
| Estilo          | Tailwind CSS v4 (build local, sem CDN)                       |
| Componentes     | shadcn/ui (New York, Slate) + Radix (`radix-ui`)             |
| Ícones          | Lucide React                                                 |
| Router          | TanStack Router (file-based, plugin Vite, auto code-split)   |
| State client    | Zustand (UI/filtros); Context para Auth e tema               |
| Dados Firestore | Hooks próprios com `onSnapshot` (sem TanStack Query)         |
| Auth            | Firebase Authentication (email/senha) + Custom Claims        |
| Export Excel    | `exceljs` (chunk lazy, só em `/planilha`)                    |
| Formulários     | `zod` + `react-hook-form` (forms não triviais)               |
| Dev local       | Firebase Emulator Suite (Auth:9099, Firestore:8080, UI:4000) |
| Hospedagem      | GitHub Pages com domínio próprio                             |
| CI              | GitHub Actions                                               |
| Qualidade       | ESLint + Prettier via husky/lint-staged no pre-commit        |

Versões exatas: `package.json`. **Não há suíte de testes configurada** (ver §12).

## 3. Hospedagem, build e segredos

- Produção em **https://inventario.isoforma.com.br** (`public/CNAME`), servido
  pelo GitHub Pages na raiz → Vite `base: "/"`; o router usa
  `basepath` derivado de `import.meta.env.BASE_URL`.
- SPA em history mode: plugin `spaFallback404` em `vite.config.ts` copia
  `index.html` → `404.html` no build para deep-links/refresh funcionarem.
- [deploy.yml](../.github/workflows/deploy.yml): push em `main` (ou manual) →
  `npm ci && npm run build` → `upload-pages-artifact` + `deploy-pages`. Sem
  branch `gh-pages`.
- Segredos `VITE_FIREBASE_*` (6 vars, ver `.env.example`) ficam em
  **Repository secrets** do GitHub — não Environment, o job `build` não
  declara `environment`. Nunca no repo.
- O domínio de produção precisa estar nos **domínios autorizados** do
  Firebase Auth.
- A `apiKey` do Firebase Web é pública por design. A defesa real: regras
  Firestore estritas, domínios autorizados e (futuro) App Check.

### Desenvolvimento local

- `.env.local` (gitignored) a partir de `.env.example`, validado no boot por
  `zod` em `src/shared/lib/env.ts` — falta de var aborta com erro claro.
- `VITE_USE_EMULATORS=true` conecta ao Emulator Suite. `npm run emu` sobe os
  emuladores e roda o seed (`scripts/start-emu.ts` → `seed-emulator.ts`).
- Service account do Admin SDK em `secrets/` (gitignored).
- `scripts/` compila com `tsconfig.scripts.json` (ES2022, NodeNext,
  top-level `await`), separado do tsconfig do bundle.

## 4. Organização do código

- `src/routes/` — file-based. `_app.tsx` é o layout autenticado (guard);
  `_app/*.tsx` são as abas. `routeTree.gen.ts` é gerado — não editar.
- `src/features/<domínio>/` — lógica de negócio por feature: `auth`,
  `catalog`, `storage`, `kardex`, `dashboard`, `reports`, `control`, `theme`.
  Padrão por feature: `types.ts`, `firestore.ts` (converter + collection),
  `use*.ts` (hooks), componentes.
- `src/shared/` — o que é usado por mais de uma feature: `components/`
  (próprios) e `components/ui/` (shadcn), `hooks/`, `lib/`, `stores/`.
- Regra: **módulo usado por mais de uma feature sobe para `shared/`**; senão
  fica na feature.

## 5. Modelo de dados Firestore

Coleções normalizadas. Nunca voltar ao padrão "1 documento com
`JSON.stringify` de tudo". Converters (`withConverter<T>()`) em
`features/<feature>/firestore.ts`.

### 5.1 `/catalog/{materialId}`

```ts
{
  tipo: string; // "R-350-L", "MASTER PSAI BRANCO 001", ...
  embal: "SC" | "BB"; // saco / big-bag
  kg: number; // peso por unidade de embalagem
  categoria: "PADRAO" | "MASTER" | "ADITIVO";
  colorCode: string | null; // hex — só MASTER
  fornecedor: SupplierId | null; // cor de bandeira — só PADRAO
  ativo: boolean; // soft-delete; excluir de verdade só via script
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`materialId` é estável: renomear `tipo` não quebra `storage_locations` nem
`kardex` (eles guardam FK + snapshot). IDs migrados do legado são
determinísticos (`catalogDocId` = `tipo-slug_embal`); novos são auto-ID.

### 5.2 `/storage_locations/{locationId}`

Uma rua/área física, com os slots **embutidos** (sem subcoleção — a rua é a
unidade de edição e tem ≤ 4 slots).

```ts
interface Slot {
  materialId: string;
  materialSnapshot: {
    tipo: string;
    embal: "SC" | "BB";
    kgUnit: number;
    categoria: "PADRAO" | "MASTER" | "ADITIVO";
    fornecedor: SupplierId | null;
    colorCode: string | null;
  };
  quantidade: number;
}

interface StorageLocation {
  area: "direito" | "esquerdo" | "fora" | "masters" | "aditivos";
  rua: string | null; // "A".."Z" (com W) e "A1".."F1"; null em áreas livres
  label: string;
  ordem: number;
  slots: Slot[]; // até 4
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string; // uid
  verifiedOn: string | null; // "YYYY-MM-DD" local (BRT); null = nunca
  verifiedBy: string;
}
```

- Cor da rua = `SUPPLIERS[slots[0]?.materialSnapshot.fornecedor ?? "none"]`.
- **Direito/Esquerdo:** 32 ruas fixas por lado (A–Z com W + A1–F1), ID
  `<area>_<rua>` (`direito_A`, `esquerdo_B1`), pré-seedadas.
- **Áreas livres (Fora/Masters/Aditivos):** auto-ID, `rua: null`, `label`
  livre editável, `ordem: Date.now()` na criação.
- **Verificação diária** (só Direito/Esquerdo): rua "conferida hoje" quando
  `verifiedOn === todayLocalISO()`. Reset implícito na virada do dia, sem job.
  Marcada pelo botão "Conferir" ou por ajuste de quantidade. Não gera Kardex.

### 5.3 `/kardex/{logId}`

Log de movimentação, append-only (admin pode excluir entradas — paridade com
o legado).

```ts
{
  timestamp: Timestamp;
  materialId: string;
  materialSnapshot: {
    tipo: string;
    embal: "SC" | "BB";
    kgUnit: number;
  }
  locationId: string;
  locationLabel: string; // snapshot
  tipo: "ENTRADA" | "SAIDA";
  qtd: number; // sempre positivo
  kgTotal: number; // qtd * kgUnit
  userId: string;
  userDisplay: string; // snapshot
}
```

- Gatilho: diff de quantidade em `setSlotQuantidade`. delta > 0 → ENTRADA,
  < 0 → SAIDA, 0 → nada. Gravado no mesmo `writeBatch` do slot.
- Trocar/limpar material do slot **não** gera log (paridade legado).
- Tela: filtros server-side (material/local/tipo), paginação por cursor
  (`startAfter` + pilha), total via `getCountFromServer`.

### 5.4 `/control/{area}`

Metadados de controle. Hoje: `control/direito` e `control/esquerdo`.

```ts
{
  lastCompleteOn: string | null;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

- `lastCompleteOn` = último dia em que **todas** as ruas do corredor ficaram
  conferidas. Gravado na escrita (`maybeMarkCorridorComplete` em
  `useStorage.ts`) após conferir/ajustar uma rua.
- Nunca regride: desmarcar uma rua não apaga; só sobrescreve quando um novo
  dia completa. Sem histórico — só a última data.

### 5.5 `/users/{uid}` (reservada)

Prevista como espelho de leitura do perfil/role para UI; **não usada** hoje.
Regras já negam escrita pelo cliente. A autoridade de role é sempre o claim.

### 5.6 Índices

Compostos em [firestore.indexes.json](../firestore/firestore.indexes.json).
**Toda query nova com `where` + `orderBy` em campos diferentes precisa de
índice lá** — em produção a falta quebra o listener silenciosamente (só
erro no console).

## 6. Autenticação e autorização

- Firebase Auth email/senha. Role por **Custom Claim** `role: "admin" | "reader"`;
  sem claim = reader na UI e barrado nas regras.
- Claims aplicados só via Admin SDK: `npm run set-role` ou `npm run users`.
  Sem UI de gestão.
- `AuthProvider` (Context) expõe `status: 'loading' | 'signed-in' | 'signed-out'`,
  `user`, `role`, `displayName`. `onAuthStateChanged` lê a claim do cache;
  `signIn()` força refresh do token para pegar claim recém-aplicada.
- `displayName`: `user.displayName` ou parte local do email capitalizada
  (`features/auth/displayName.ts`).
- Router: `createRootRouteWithContext<{ auth }>()`; `_app.tsx` redireciona
  para `/login?redirect=…` quando signed-out; `login.tsx` faz o inverso.
  `AuthSplash` enquanto `loading`.
- **`disabled` para não-admin é UX, não segurança.** A defesa real são as
  regras.

## 7. Regras do Firestore

Fonte: [firestore.rules](../firestore/firestore.rules). Deploy manual:
`npm run rules:deploy`.

- Leitura: qualquer usuário autenticado. Escrita: só `isAdmin()`.
- `kardex`: create/delete admin, update proibido (imutável).
- `users`: escrita proibida pelo cliente.
- `artifacts/**`: documento do sistema legado, mantido acessível (admin
  escreve, autenticado lê).
- Catch-all nega o resto — **coleção nova exige `match` explícito**.

Refinamentos em aberto: validar `slots.size() <= 4`, `quantidade >= 0` e o
`materialSnapshot` no create do kardex.

## 8. Migração do legado

Mapeamento canônico `legacy/db.json` → schema em
[scripts/lib/legacy.ts](../scripts/lib/legacy.ts) (funções puras, sem I/O;
builders retornam `{ id, data }` sem timestamps — o writer injeta). Usado por:

- `scripts/seed-emulator.ts` — skip-if-exists, cria também usuários no Auth.
- `scripts/migrate-legacy-to-firestore.ts` — `npm run migrate`.

Migração: **purge + recriar** `catalog` e `storage_locations` (db.json é a
fonte da verdade); **`kardex` nunca é tocado**. Dry-run é o default;
escrever exige `--commit`, e em produção também `--yes`. `--emulator` mira
o emulador.

## 9. Convenções

- TypeScript estrito; `any` só em fronteira comprovadamente intratável, com
  comentário.
- Comentários só para invariantes não-óbvias. Sem narração.
- Datas: `Timestamp` na escrita, `Date` na borda do hook. Datas "de
  calendário" (verificação, contagem) são string `YYYY-MM-DD` local, via
  `src/shared/lib/date.ts`.
- Tipos da entidade em `features/<f>/types.ts`; tipos de form/derivados
  ficam junto do uso.
- Regra de negócio ≤ 25 kg centralizada em `src/shared/lib/business.ts`:
  `kg ≤ 25` é **saco** (fora do volume de paletes), `kg > 25` é **palete**.
  Independe do badge SC/BB.
- Commits: Conventional Commits em português (`feat(escopo): …`, `fix:`,
  `chore:`, `build:`).

## 10. Telas

| Legado (manual §4)        | Rota                             | Feature                   |
| ------------------------- | -------------------------------- | ------------------------- |
| Dashboard                 | `/`                              | `dashboard` (+ `control`) |
| Lado Direito / Esquerdo   | `/direito`, `/esquerdo`          | `storage`                 |
| Fora / Masters / Aditivos | `/fora`, `/masters`, `/aditivos` | `storage`                 |
| Kardex                    | `/kardex`                        | `kardex`                  |
| Planilha Amarela + Excel  | `/planilha`                      | `reports`                 |
| Gerir materiais           | `/catalogo`                      | `catalog`                 |
| Login                     | `/login`                         | `auth`                    |

- **Dashboard:** agrega **no cliente** a partir dos snapshots de
  `storage_locations` (~70 locais × ≤ 4 slots). `aggregate.ts` é puro
  (`consolidate`, `computeKpis`, `byCategoria`, `categorySummary`,
  `findLocations`). Layout: busca de material → faixa de totais
  (`StockSummaryBar`: kg total + volume de paletes) → 3 cards de categoria
  (`CategoryCards`; PADRAO selecionada por padrão) → detalhes só da categoria
  selecionada (`CategoryDetails`). O card de resinas mostra a última
  contagem completa por corredor (`useCorridorCounts`, §5.4).
- **Planilha Amarela:** reusa `consolidate()`; `buildPlanilha()` distribui as
  quantidades em 10 colunas QTD (excedente colapsa na 10ª). Totais de
  `computeKpis`. Export `.xlsx` real via `exceljs`.

## 11. Design system

Referência visual: [prints/](../prints/) (legado + dashboard v2). Fidelidade
ao **fluxo** do legado (mesmas abas, ordem e terminologia); liberdade visual
onde melhora.

- **Tokens** OKLCH em `src/styles/globals.css` (`@theme inline`, `:root` +
  `.dark`). Extras Isoforma além dos do shadcn: `--header` (header sempre
  escuro, não inverte com o tema), `--success`, `--warning`,
  `--brand-pink` (Masters), `--brand-purple` (Aditivos).
- Cores de fornecedor: HEX fixo em `src/shared/lib/suppliers.ts`, não mudam
  com o tema.
- Inter (400–900); radius base `0.75rem`.
- Tema Light/Dark/System em `features/theme` (`localStorage`
  `inventario-theme`).
- Componentes próprios em `shared/components/` **compõem** os primitivos
  shadcn/Radix (herdam a11y). `AppTabs` usa `Link` do router, não `<Tabs>`.
- **Forms sempre inline** (`AddRow`) — nunca modal para adicionar/editar.

## 12. Decisões em aberto

- **App Check (reCAPTCHA v3)** — próximo reforço de segurança, ainda não
  planejado.
- **Testes** — não há Vitest/Testing Library configurado. Candidatos naturais:
  funções puras (`aggregate.ts`, `planilha.ts`, `scripts/lib/legacy.ts`).
- **Tela de gestão de usuários** — fora de escopo; o CLI `npm run users` cobre.
- **Arquivamento do Kardex** — cresce sem limite; particionar só se virar
  custo.
- **PWA/offline** — não previsto; o cache offline do SDK cobre o básico.
