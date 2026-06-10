# Inventário Isoforma — Arquitetura

> Documento de referência para a reescrita do sistema. Toda decisão estrutural
> consolidada aqui; planos posteriores em `.claude/plans/nnn-*.md` devem
> consultar/atualizar este arquivo em vez de redefinir conceitos.

Status: **vivo** — atualize ao tomar novas decisões transversais.

Última revisão: 2026-06-10 (deploy GH Pages).

---

## 1. Contexto e objetivos

O sistema atual (`legacy/index.html`, ~3.9k linhas em um único arquivo) é uma
SPA React+Babel-in-browser que controla o inventário físico da Isoforma:
resinas em ruas A–Z e A1–G1 dos lados Direito e Esquerdo, mais áreas
especiais (Fora do Local, Sala dos Masters, Aditivos), com Kardex automatizado
por evento `onBlur` e exportação Excel.

Problemas centrais da implementação atual:

- **Credenciais expostas:** `firebaseConfig` hardcoded no HTML público.
- **Autorização inexistente do lado do servidor:** o app só compara
  `user.email === EMAIL_ADMINISTRADOR` no cliente. Sem regras decentes no
  Firestore, qualquer usuário autenticado pode escrever em qualquer documento.
- **Modelo de dados ruim:** todo o estado vive em **um único documento**
  (`artifacts/inventario-isoforma/public/data/inventario/estado_atual`) com
  campos `direito/esquerdo/fora/masters/aditivos/catalogo` armazenados como
  **JSON.stringify**. Updates exigem reescrever o documento inteiro, sem
  granularidade nem regras finas.
- **Sem build pipeline:** Babel standalone no navegador, Tailwind via CDN,
  React via UMD. Sem TypeScript, sem testes, sem tree-shaking.

A reescrita preserva o produto (manual em `legacy/Manual_de_Funcionamento_Inventario_Isoforma.pdf`) e ataca esses
problemas. **Front-only + Firestore como cliente em tempo real** é requisito
duro: nada de backend próprio.

## 2. Stack

| Camada          | Escolha                                                      |
| --------------- | ------------------------------------------------------------ |
| Build           | Vite                                                         |
| Linguagem       | TypeScript                                                   |
| UI              | React 18                                                     |
| Estilo          | Tailwind CSS v4 (build local, não CDN)                       |
| Componentes     | shadcn/ui (New York, Slate) + Radix UI (via shadcn)          |
| Tipografia      | Inter (Google Fonts, pesos 400–900)                          |
| Router          | TanStack Router (file-based, com plugin Vite)                |
| State client    | Zustand (UI/filters); Context para Auth                      |
| Dados Firestore | Hooks custom com `onSnapshot` (sem TanStack Query)           |
| Auth            | Firebase Authentication (email/senha)                        |
| Autorização     | Firebase Custom Claims (`role`)                              |
| Banco           | Firestore (coleções normalizadas, ver §5)                    |
| Export Excel    | `exceljs`                                                    |
| Validação form  | `zod` + `react-hook-form` (formularios não triviais)         |
| Dev local       | Firebase Emulator Suite (Auth:9099, Firestore:8080, UI:4000) |
| Hospedagem      | GitHub Pages                                                 |
| CI/build        | GitHub Actions                                               |
| Segredos        | GitHub Actions Secrets (`VITE_FIREBASE_*`)                   |

Versões fixadas no `package.json` quando o plano de bootstrap rodar.

## 3. Hospedagem, build e segredos

- **GitHub Pages (project page)** serve o build estático em
  `https://bellocopo.github.io/inventario-isoforma/`. Como o app vive sob o
  subcaminho `/inventario-isoforma/`, o Vite usa `base` (só no build) e o
  TanStack Router usa `basepath` (`import.meta.env.BASE_URL`). SPA em history
  mode precisa de fallback → um plugin no build copia `index.html` para
  `404.html` (truque padrão GH Pages: deep-links/refresh reidratam a SPA).
- **GitHub Actions** ([.github/workflows/deploy.yml](../.github/workflows/deploy.yml))
  roda `npm ci && npm run build` em push para `main` (e `workflow_dispatch`) e
  publica via **deploy oficial do Pages** (`upload-pages-artifact` +
  `deploy-pages`) — sem branch `gh-pages`. Source do Pages = "GitHub Actions".
- **Segredos:** variáveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` ficam em GitHub
  **Repository secrets** (não Environment — o job `build` não declara
  `environment`) e são injetadas no step de build. **Não** ficam no repo.
  `bellocopo.github.io` precisa estar nos **domínios autorizados** do Auth.
- **Realidade da `apiKey`:** Firebase Web API Key é pública por design — quem
  baixar o JS do site sempre vai vê-la. A defesa real são (a) **regras
  Firestore estritas**, (b) **domínios autorizados** no console Firebase
  (whitelist do domínio do GH Pages), e (c) **App Check** como reforço futuro
  (ver §11).

### Desenvolvimento local

- Variáveis de ambiente em `.env.local` (gitignored), copiadas de `.env.example`.
  Validadas no boot via `zod` em `src/shared/lib/env.ts` — o app aborta
  imediatamente com erro descritivo se alguma var faltar.
- `VITE_USE_EMULATORS=true` em `.env.local` conecta o cliente ao Emulator
  Suite em vez do Firebase produção. Emuladores sobem com `npm run emu`
  (`firebase.json` configura as portas).
- Service account para o script Admin SDK fica em `secrets/` (gitignored).
  Ver README → "Promover usuário a admin".
- `tsconfig.scripts.json` específico para `scripts/` (target ES2022,
  module NodeNext) — garante top-level `await` sem comprometer o tsconfig
  do bundle cliente.

## 4. Estrutura de pastas

```
inventario-isoforma/
├── .claude/
│   ├── architecture.md         # este arquivo
│   └── plans/
│       └── nnn-slug.md
├── .github/
│   └── workflows/
│       └── deploy.yml          # build + deploy gh-pages
├── legacy/                     # sistema antigo (read-only, referência)
├── firestore/
│   ├── firestore.rules         # regras de segurança
│   └── firestore.indexes.json
├── scripts/
│   ├── migrate-legacy-to-firestore.ts   # one-shot, lê legacy/db.json
│   └── set-role.ts             # promove usuário (custom claim)
├── public/                     # estáticos servidos como estão
├── src/
│   ├── main.tsx
│   ├── routeTree.gen.ts        # gerado pelo TanStack Router
│   ├── routes/                 # roteamento file-based
│   │   ├── __root.tsx
│   │   ├── login.tsx
│   │   └── _app.tsx            # layout autenticado (guard)
│   │   └── _app/
│   │       ├── index.tsx       # Dashboard
│   │       ├── direito.tsx
│   │       ├── esquerdo.tsx
│   │       ├── fora.tsx
│   │       ├── masters.tsx
│   │       ├── aditivos.tsx
│   │       ├── kardex.tsx
│   │       ├── planilha.tsx
│   │       └── catalogo.tsx
│   ├── features/               # lógica de negócio colocada por feature
│   │   ├── auth/               # AuthProvider, useAuth, role helpers
│   │   ├── catalog/            # CRUD do catálogo de materiais
│   │   ├── storage/            # ruas, paletes, mover/editar stock
│   │   ├── kardex/             # listeners, escrita de logs, queries
│   │   ├── dashboard/          # agregação client-side (KPIs, busca, posição)
│   │   └── reports/            # Planilha Amarela + export .xlsx (exceljs)
│   ├── shared/
│   │   ├── components/         # Modal, Button, Card, ConfirmDialog...
│   │   ├── hooks/              # useFirestoreDoc, useFirestoreCollection
│   │   ├── lib/
│   │   │   ├── firebase.ts     # initApp, getDb, getAuth, exports
│   │   │   └── utils.ts
│   │   ├── stores/             # zustand stores (UI state)
│   │   └── types/              # types compartilhados (Material, StockItem...)
│   └── styles/
│       └── globals.css         # Tailwind directives
├── index.html                  # entry do Vite (na raiz)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

Convenção: **se um módulo é usado por mais de uma feature, ele sobe para
`shared/`**; senão, fica dentro da feature.

## 5. Modelo de dados Firestore

Coleções normalizadas. IDs são auto-gerados pelo Firestore (UUID-like) salvo
quando indicado. Datas em milissegundos epoch (`number`) ou `Timestamp` do
Firestore conforme conveniência — definir no plano de bootstrap.

### 5.1 `/catalog/{materialId}`

Catálogo unificado de resinas, masters e aditivos.

```ts
{
  tipo: string; // "R-350-L", "MASTER PSAI BRANCO 001", ...
  embal: "SC" | "BB"; // saco / big-bag
  kg: number; // peso por unidade de embalagem
  categoria: "PADRAO" | "MASTER" | "ADITIVO";
  colorCode: string | null; // hex (#RRGGBB) — exclusivo de MASTER
  fornecedor: SupplierId | null; // tipado — bandeira de cor para PADRAO; null para MASTER/ADITIVO
  ativo: boolean; // soft-delete: false = obsoleto, não some do histórico
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Notas:

- **Identidade estável**: `materialId` é o auto-ID. Renomear `tipo` não quebra
  `stock_items` nem `kardex`.
- Materiais "obsoletos" usam `ativo: false` (não delete). Excluir de verdade
  só via script.

### 5.2 `/storage_locations/{locationId}`

Uma rua/área física.

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
  area: "direito" | "esquerdo" | "fora" | "masters" | "aditivos";
  rua: string | null; // "A".."Z", "A1".."G1" para direito/esquerdo; null para áreas livres
  label: string; // nome amigável ("Direito A", "Doca", "Sala dos Masters - bloco 1")
  ordem: number; // ordenação na UI
  slots: Slot[]; // até 4; embutido no doc da rua (ver §5.3)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string; // uid
}
```

Cor da rua = `SUPPLIERS[slots[0]?.materialSnapshot.fornecedor ?? "none"]`.

IDs convencionados:

- Lados (Direito/Esquerdo): `direito_A`, `direito_B1`, `esquerdo_M`, ...
  (formato `<area>_<rua>`). Pré-seedados; `rua` contém a letra da rua.
- Áreas livres (Fora/Masters/Aditivos): **auto-ID Firestore** (`addDoc`).
  `rua: null`; `label` guarda o nome livre editável ("Doca", "ESTOQUE DE
  MASTER", etc.). `ordem: Date.now()` na criação — mais novo por último.

### 5.3 Slots embutidos (decisão Plano 008)

A subcoleção `stock_items` foi **removida** em favor de `slots: Slot[]`
embutido no doc da rua (§5.2).

Justificativa: a rua é a unidade natural de edição (salva-se o doc inteiro
no `onBlur`); o array é pequeno (≤ 4 slots); evita a necessidade de
`collectionGroup` e queries secundárias. O modelo recria intencionalmente
parte da granularidade do legado, mas sem o `JSON.stringify` monolítico.

### 5.4 `/kardex/{logId}`

Log imutável de movimentação. Append-only para usuários normais; admin pode
excluir entradas individuais (espelha comportamento atual).

```ts
{
  timestamp: Timestamp;
  materialId: string; // FK
  materialSnapshot: {
    // FK + snapshot (resiliência a renames)
    tipo: string;
    embal: "SC" | "BB";
    kgUnit: number;
  }
  locationId: string; // FK -> /storage_locations
  locationLabel: string; // snapshot do label na hora
  tipo: "ENTRADA" | "SAIDA";
  qtd: number; // sempre positivo
  kgTotal: number; // qtd * kgUnit
  userId: string;
  userDisplay: string; // snapshot do nome exibido
}
```

Gatilho: diff de quantidade em `setSlotQuantidade` — `delta = qtd - old`;
ENTRADA se delta > 0, SAIDA se delta < 0; delta = 0 → sem log. Escrita
atômica via `writeBatch` junto com a atualização do slot. Troca/limpeza
de material **não** gera log (paridade legado).

Tela `/kardex`: cards de resumo (entradas/saídas/balanço da página),
filtros server-side por material/local/tipo, tabela paginada com
cursor-based pagination (`startAfter` + pilha de cursores;
`getCountFromServer` para total de páginas), exclusão admin via
`AlertDialog`.

Índices compound em `firestore/firestore.indexes.json`:

- `(materialId asc, timestamp desc)`
- `(locationId asc, timestamp desc)`
- `(tipo asc, timestamp desc)`
- `(materialId asc, tipo asc, timestamp desc)`
- `(locationId asc, tipo asc, timestamp desc)`
- `timestamp desc` — índice single-field automático (listagem geral).

### 5.5 `/users/{uid}` (opcional, fase 2)

Perfil mínimo do usuário (display name, role atual para UI exibir badge). A
**autoridade de role continua sendo o custom claim** — `/users` é só leitura
amigável para UI. Não usada por regras.

```ts
{
  email: string;
  displayName: string;
  role: "admin" | "reader"; // espelho do claim, atualizado pelo script set-role
  updatedAt: Timestamp;
}
```

## 6. Autenticação e autorização

- **Auth**: Firebase Authentication com email/senha. Mantém usuários atuais.
- **Roles**: Custom Claims. Cada usuário recebe `{ role: "admin" | "reader" }`.
  Sem claim explícito = `null` (tratado como reader na UI, barrado nas regras).
- **Configuração inicial**: script `scripts/set-role.ts` (Node + Firebase
  Admin SDK), executado localmente pelo dono usando uma service account.
  Documentado no README. Sem UI de gerenciamento por agora.
- **Estado no cliente**: `AuthProvider` (React Context) escuta
  `onAuthStateChanged` e expõe `status: 'loading' | 'signed-in' | 'signed-out'`,
  `user`, `role`, `displayName`. `status` começa em `'loading'` até o
  listener resolver — evita flash de redirect no boot.
- **Leitura da claim**: `onAuthStateChanged` chama `getIdTokenResult()` (sem
  force) para ler a claim do cache local. `signIn()` chama
  `getIdTokenResult(true)` — força refresh — para ler claim recém-aplicada
  por `set-role` entre sessões.
- **displayName**: `user.displayName` se preenchido; fallback para a parte
  local do email capitalizada (ex: `joao@empresa.com` → `"Joao"`).
  Implementado em `features/auth/displayName.ts`.
- **Integração com TanStack Router**: `createRootRouteWithContext<{ auth: AuthContextValue }>()`
  em `__root.tsx`. `main.tsx` injeta o contexto via `<RouterProvider context={{ auth }}>`,
  alimentado por `useAuth()` dentro de `<AuthProvider>` (`InnerRouter`).
- **Guards**: `_app.tsx` tem `beforeLoad` que redireciona para `/login?redirect=<href>`
  quando `status === 'signed-out'`. `login.tsx` tem `beforeLoad` inverso —
  redireciona para `search.redirect ?? '/'` quando `status === 'signed-in'`.
- **Splash**: `AuthSplash` full-screen (título + spinner `Loader2`) renderizado
  pelo `RootLayout` enquanto `status === 'loading'`.
- **Logout**: botão "Sair" no header do `_app`. Chama `signOutNow()` →
  `signOut(auth)`; o listener zera o estado automaticamente.
- **UI**: campos editáveis ficam `disabled` quando `role !== "admin"` —
  espelha UX atual. A defesa real é nas regras Firestore.

## 7. Regras do Firestore (esqueleto)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function isAdmin() {
      return isSignedIn() && request.auth.token.role == 'admin';
    }

    match /catalog/{materialId} {
      allow read:  if isSignedIn();
      allow write: if isAdmin();
    }

    match /storage_locations/{locationId} {
      allow read:  if isSignedIn();
      allow write: if isAdmin();
      // slots são array embutido no doc — sem subcoleção stock_items
    }

    match /kardex/{logId} {
      allow read:   if isSignedIn();
      allow create: if isAdmin();
      allow update: if false;       // imutável
      allow delete: if isAdmin();   // admin pode excluir entradas (paridade com sistema atual)
    }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow write: if false;        // só via Admin SDK / script
    }

    match /{document=**} {
      allow read, write: if false;  // negar tudo que não foi explicitado
    }
  }
}
```

Refinamentos previstos (planos futuros): validar `materialSnapshot` no
create do kardex (campo a campo); validar transição de quantidade em
`stock_items` (>= 0).

## 8. Migração de dados

O mapeamento canônico `legacy/db.json` → schema novo vive em
[`scripts/lib/legacy.ts`](../scripts/lib/legacy.ts) (funções puras, sem I/O de
Firestore): `parseLegacyDb`, `buildSupplierMap`, `inferCategoria`,
`catalogDocId`, `buildCatalogDocs`, `buildStorageLocationDocs`, `validateRefs`.
Os builders retornam `{ id, data }` **sem** `serverTimestamp` — o writer injeta.
É compartilhado por dois consumidores:

- **Seed do emulador** ([`scripts/seed-emulator.ts`](../scripts/seed-emulator.ts)):
  skip-if-exists, também cria usuários no Auth.
- **Migração real** ([`scripts/migrate-legacy-to-firestore.ts`](../scripts/migrate-legacy-to-firestore.ts)):
  `npm run migrate`.

Características da migração:

1. **Catálogo**: cada item em `catalogo[]` vira doc em `/catalog` com ID
   **determinístico** (`catalogDocId` = `tipo-slug_embal`). Infere `categoria`
   quando ausente (nome começa com "MASTER"/"ADITIVO"; senão PADRAO).
   `fornecedor` derivado da cor da rua (só PADRAO).
2. **Storage locations**: direito/esquerdo → um doc por rua fixa (`<area>_<rua>`);
   fora/masters/aditivos → um doc por entrada (`<area>_<legacyId>`, `rua: null`,
   `label` livre). `slots[]` resolvido de `resina1..4`/`q1..4`.
3. **Validação**: `validateRefs` confere integridade referencial e o script
   imprime resumo (counts + refs resolvidas/ausentes).
4. **Estratégia re-run**: **purge + recriar** `catalog` e `storage_locations`
   (db.json = fonte da verdade; sem órfãos). **`kardex` nunca é tocado.**
5. **Segurança**: `--dry-run` é o **default** (só imprime); escrita real exige
   `--commit`, e em projeto real (não-emulador) exige também `--yes`. Flag
   `--emulator` mira o emulador local.

## 9. Convenções

- **TypeScript estrito.** `strict: true`. Sem `any` salvo em fronteiras
  comprovadamente intratáveis (com comentário explicando).
- **Tailwind via build local.** Sem CDN, sem `@apply` excessivo.
- **Sem comentários narrativos.** Comentários só para invariantes
  não-óbvias (ver guideline do projeto).
- **Tipos compartilhados** em `src/shared/types/`. Tipos derivados (entrada
  de form, resposta filtrada, etc.) ficam dentro da feature.
- **Conversores Firestore.** Cada coleção tem um `withConverter<T>()` para
  garantir tipagem nas leituras/escritas — definidos em
  `features/<feature>/firestore.ts`.
- **Datas.** Preferir `Timestamp` do Firestore em escrita. Converter para
  `Date` na borda do hook que entrega ao componente.
- **IDs nas URLs.** Rotas que dependem de seleção (ex: detalhe de rua)
  usam params do TanStack Router — não query strings.

## 10. Mapeamento "feature legacy → onde fica agora"

| Feature legacy (PDF §4)        | Rota nova       | Feature module                          |
| ------------------------------ | --------------- | --------------------------------------- |
| 4.1 Dashboard Central          | `/` (em `_app`) | `features/dashboard` (agrega `storage`) |
| 4.2 Lado Direito               | `/direito`      | `features/storage`                      |
| 4.2 Lado Esquerdo              | `/esquerdo`     | `features/storage`                      |
| 4.3 Fora do Local              | `/fora`         | `features/storage`                      |
| 4.3 Sala dos Masters           | `/masters`      | `features/storage`                      |
| 4.3 Aditivos Químicos          | `/aditivos`     | `features/storage`                      |
| 4.4 Kardex                     | `/kardex`       | `features/kardex`                       |
| 4.5 Planilha Amarela + Excel   | `/planilha`     | `features/reports`                      |
| 4.5 Gerir Materiais Existentes | `/catalogo`     | `features/catalog`                      |
| Login                          | `/login`        | `features/auth`                         |

Regra de negócio crítica do PDF (Paletes vs Sacos ≤ 25kg): centralizada em
`shared/lib/business.ts` — `SACK_KG_THRESHOLD = 25`, `isSaco(kgUnit)`,
`isPalete(kgUnit)`, `unitLabel(kgUnit)`. Item com `kg ≤ 25` é **saco**
(excluído do Volume de Paletes); `kg > 25` é **palete**.

O Dashboard (`features/dashboard/`) **agrega client-side** a partir dos
snapshots de `/storage_locations` (volume pequeno: ~50 locais × ≤4 slots).
`aggregate.ts` é puro (`consolidate`/`computeKpis`/`findLocations`/
`byCategoria`); `useDashboard()` memoiza sobre `useAllStorage()`. Sem
agregação server-side.

A **Planilha Amarela** (`features/reports/`, rota `/planilha`) reusa o mesmo
`consolidate()`: `ConsolidatedItem.qtds` (array das quantidades individuais
por slot) alimenta as **10 colunas QTD** — `buildPlanilha()` colapsa o
excedente (>10 slots) na 10ª coluna e preenche o resto com `null`. Os totais
da linha TOTAIS vêm de `computeKpis` (`volumePaletes` exclui sacos,
`stockTotalKg`). O export é `.xlsx` **real via `exceljs`**
(`exportExcel.ts`) — substitui o hack legado de HTML-como-`.xls`. O `exceljs`
fica num chunk lazy (carregado só ao entrar em `/planilha`), fora do bundle
inicial.

## 11. Decisões abertas / melhorias futuras

- **App Check (reCAPTCHA v3)** — adiado. Quando estabilizar domínio do
  GH Pages, ativar para reforçar regras. Plano dedicado.
- **Tela admin para gerenciar usuários/roles** — fora do escopo da
  reescrita inicial; script CLI cobre o necessário.
- **Arquivamento do Kardex** — atualmente cresce indefinidamente. Avaliar
  partição por ano (`/kardex/{ano}/{logId}`) só se virar problema de custo.
- **Testes** — Vitest + Testing Library. Bootstrap inclui setup mas a
  cobertura inicial será mínima (smoke tests do auth e dos hooks de
  dados); cobertura cresce sob demanda.
- **PWA / offline** — não previsto; o Firestore SDK já tem cache offline
  básico que cobre a UX no chão de fábrica.

## 12. Roadmap de planos

Cada item vira um arquivo em `.claude/plans/nnn-*.md`. Esta lista é
ponto-de-partida; ajuste conforme o trabalho avança.

| #   | Plano                                                                  |
| --- | ---------------------------------------------------------------------- |
| 001 | Arquitetura inicial + modelo de dados (este; doc + roadmap)            |
| 002 | Bootstrap do projeto (Vite + TS + Tailwind + TanStack Router + shells) |
| 003 | Firebase setup: config via env, regras, custom claims, script set-role |
| 004 | Auth (login, guard de rota, useAuth/useRole)                           |
| 005 | Validação pós-auth (checkpoint manual)                                 |
| 006 | Design system (shadcn/ui, tokens, theme switcher, componentes base)    |
| 007 | Catálogo (CRUD em `/catalog` + UI de gestão)                           |
| 008 | Storage locations + stock items (Direito/Esquerdo)                     |
| 009 | Áreas livres (Fora, Masters, Aditivos)                                 |
| 010 | Kardex (listeners, escrita via onBlur, exclusão admin)                 |
| 011 | Dashboard (agregações, busca de material, regra ≤25kg)                 |
| 012 | Planilha Amarela + export Excel (exceljs)                              |
| 013 | Migração `legacy/db.json` → Firestore (script + dry-run)               |
| 014 | Deploy GitHub Pages + Actions + secrets                                |
| 015 | App Check (quando domínio estabilizar)                                 |

## 13. Design system

Referência visual: pasta [`prints/`](../prints/) (capturas desktop + mobile
do sistema legado). Fidelidade ao **fluxo** do legado; liberdade visual
onde melhorar fizer sentido.

### 13.1 Stack

| Item       | Escolha                                                     |
| ---------- | ----------------------------------------------------------- |
| Lib base   | shadcn/ui — estilo **New York**, base color **Slate**       |
| Primitivos | Radix UI (via shadcn — a11y e keyboard nav embutidos)       |
| Tokens CSS | OKLCH em CSS variables, `@theme inline` (Tailwind v4)       |
| Tipografia | Inter (400/500/600/700/900) via Google Fonts                |
| Ícones     | Lucide React                                                |
| Tema       | Light / Dark / System — `ThemeProvider` em `features/theme` |

### 13.2 Tokens de cor

Definidos em `src/styles/globals.css` no bloco `@theme inline`. Variáveis
CSS em `:root` (light) e `.dark`. Tokens shadcn padrão + extras Isoforma:

| Token CSS                                      | Uso                                       |
| ---------------------------------------------- | ----------------------------------------- |
| `--header` / `--header-foreground`             | Header sempre dark (não inverte com tema) |
| `--success` / `--success-foreground`           | Verde Isoforma (logo, sync ativo)         |
| `--warning`                                    | Âmbar — estado "sincronizando"            |
| `--brand-pink` / `--brand-pink-foreground`     | Fundo/texto seção Masters                 |
| `--brand-purple` / `--brand-purple-foreground` | Fundo/texto seção Aditivos                |

Cores de fornecedor (identidade externa, HEX fixo) em
`src/shared/lib/suppliers.ts` — não usam OKLCH, não mudam com o tema.

### 13.3 Tipografia

- Família: `--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif`
- Labels de campo: `text-xs font-bold uppercase tracking-wider text-muted-foreground`
- KPI grande: `text-4xl font-black tracking-tight`
- Padrão de body: `text-sm` (mobile-first)

### 13.4 Radius

Base: `--radius: 0.75rem` (rounded-xl). Escala derivada via `calc()`:
`sm` −4 px, `md` −2 px, `lg` = base, `xl` +4 px.

### 13.5 Theme switcher

- `ThemeProvider` em `src/features/theme/theme-provider.tsx` — persiste em
  `localStorage` com chave `inventario-theme`.
- Aplica `.dark` / `.light` em `document.documentElement`.
- Modo `"system"` escuta `prefers-color-scheme` dinamicamente.
- `ModeToggle` (dropdown Claro/Escuro/Sistema) compõe `DropdownMenu` shadcn.
- **Regra obrigatória:** `AppHeader` usa `bg-header` fixo — não inverte
  no tema light. Apenas o body/cards adaptam ao tema.

### 13.6 Componentes próprios

Cada componente próprio compõe o primitivo shadcn correspondente para
herdar a11y/keyboard do Radix de graça:

| Componente       | Shadcn/Radix por baixo    | Localização                            |
| ---------------- | ------------------------- | -------------------------------------- |
| `SupplierSelect` | `Select` (Radix Select)   | `shared/components/SupplierSelect.tsx` |
| `EmbalBadge`     | `Badge` shadcn            | `shared/components/EmbalBadge.tsx`     |
| `AddRow`         | `Button` (variant ghost)  | `shared/components/AddRow.tsx`         |
| `ModeToggle`     | `DropdownMenu` + `Button` | `features/theme/ModeToggle.tsx`        |
| `Logo`           | — (puramente visual)      | `shared/components/Logo.tsx`           |
| `RoadBadge`      | — (puramente visual)      | `shared/components/RoadBadge.tsx`      |
| `SyncIndicator`  | — (puramente visual)      | `shared/components/SyncIndicator.tsx`  |
| `AppHeader`      | composição dos anteriores | `shared/components/AppHeader.tsx`      |
| `AppTabs`        | `Link` do TanStack Router | `shared/components/AppTabs.tsx`        |
| `EmConstrucao`   | — (placeholder)           | `shared/components/EmConstrucao.tsx`   |

`AppTabs` usa `Link` + detecção de rota via `useRouterState` em vez de
`<Tabs>` shadcn (que é orientado a painéis, não navegação).

### 13.7 Padrão UX

- **Forms sempre inline** — nunca modal/dialog para adicionar ou editar.
  `AddRow` abre um campo inline vazio na tabela/lista.
- **Fidelidade ao fluxo legado** — mesmas abas, mesma ordem, mesma
  terminologia (ver prints em `prints/`).
- **`disabled` é UX, não segurança** — campos editáveis ficam disabled
  quando `role !== "admin"`. A defesa real são as regras Firestore.
