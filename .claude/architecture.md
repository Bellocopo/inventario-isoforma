# Inventário Isoforma — Arquitetura

> Documento de referência para a reescrita do sistema. Toda decisão estrutural
> consolidada aqui; planos posteriores em `.claude/plans/nnn-*.md` devem
> consultar/atualizar este arquivo em vez de redefinir conceitos.

Status: **vivo** — atualize ao tomar novas decisões transversais.

Última revisão: 2026-05-25.

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
| Estilo          | Tailwind CSS (build local, não CDN)                          |
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

- **GitHub Pages** serve o build estático. SPA precisa de fallback de 404 → o
  build copia `index.html` para `404.html` (truque padrão GH Pages).
- **GitHub Actions** roda `pnpm install && pnpm build` em push para `main` e
  publica `dist/` no branch `gh-pages` (ou via deploy oficial do Pages action).
- **Segredos:** variáveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` ficam em GitHub
  Secrets e são injetadas no step de build. **Não** ficam no repo.
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
│   │       ├── planilha-amarela.tsx
│   │       └── catalogo.tsx
│   ├── features/               # lógica de negócio colocada por feature
│   │   ├── auth/               # AuthProvider, useAuth, role helpers
│   │   ├── catalog/            # CRUD do catálogo de materiais
│   │   ├── storage/            # ruas, paletes, mover/editar stock
│   │   ├── kardex/             # listeners, escrita de logs, queries
│   │   └── reports/            # geração de Excel (Planilha Amarela)
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
  colorCode: string | null; // hex (#RRGGBB) para masters/aditivos
  fornecedor: string | null; // "innova", "unigel", ... (legenda de cor da UI)
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

Uma rua/área física. ID legível para facilitar regras e debug.

```ts
{
  area: "direito" | "esquerdo" | "fora" | "masters" | "aditivos";
  rua: string | null; // "A".."Z", "A1".."G1" para direito/esquerdo; null para áreas livres
  label: string; // nome amigável ("Direito A", "Doca", "Sala dos Masters - bloco 1")
  fornecedorPadrao: string | null; // legenda de cor sugerida (apenas direito/esquerdo)
  ordem: number; // ordenação na UI
  createdAt: Timestamp;
}
```

IDs convencionados:

- Lados: `direito_A`, `direito_B1`, `esquerdo_M`, ... (formato `<area>_<rua>`).
- Áreas livres: `fora_<slug>`, `masters_<slug>`, `aditivos_<slug>` (slugs
  derivados do label ou auto-ID, decidir no plano de bootstrap).

### 5.3 `/storage_locations/{locationId}/stock_items/{itemId}` (subcoleção)

Cada palete/lote em uma localização. **Um doc por slot**, em vez de array
empacotado. Isso destrava updates atômicos e regras granulares.

```ts
{
  materialId: string; // FK -> /catalog
  materialSnapshot: {
    // congelado no momento da escrita (resiliência)
    tipo: string;
    embal: "SC" | "BB";
    kgUnit: number;
    categoria: "PADRAO" | "MASTER" | "ADITIVO";
  }
  quantidade: number; // nº de paletes/sacos
  slot: number | null; // 1..4 para ruas com slots numerados; null para áreas livres
  updatedAt: Timestamp;
  updatedBy: string; // uid do usuário
}
```

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

Índices necessários (compound):

- `(materialId asc, timestamp desc)` — histórico por material.
- `(locationId asc, timestamp desc)` — histórico por rua.
- `timestamp desc` — listagem geral mais recente.

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

      match /stock_items/{itemId} {
        allow read:   if isSignedIn();
        allow create, update: if isAdmin();
        allow delete: if isAdmin();
      }
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

Script one-shot `scripts/migrate-legacy-to-firestore.ts` lê `legacy/db.json`
e popula o Firestore:

1. **Catálogo**: cada item em `catalogo[]` vira doc em `/catalog`. Auto-ID.
   Constrói um map `"{tipo}|{embal}" → materialId` para usar nas próximas
   etapas. Infere `categoria` quando ausente (heurística: nome contém
   "MASTER" → MASTER; "ADITIVO" → ADITIVO; senão PADRAO).
2. **Storage locations**: para direito/esquerdo, cria um doc por rua
   (`direito_A`, ...). Para fora/masters/aditivos, cria um doc por entrada
   do array com slug derivado do `local`.
3. **Stock items**: para cada rua/área, lê os campos `resina1..resina4` /
   `q1..q4`, resolve materialId pelo map, e cria docs em
   `stock_items` com `materialSnapshot` preenchido. Slots numerados
   1..4 onde aplicável.
4. **Validação**: o script imprime resumo (counts por coleção) e lista
   referências não resolvidas (`tipo|embal` que não existe no catalog).
5. **Dry-run**: flag `--dry-run` imprime tudo sem escrever. Default seguro.
6. **Idempotência**: roda em projeto Firestore limpo, ou com flag `--purge`
   limpa coleções alvo antes (decidir no plano de migração se vale).

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

| Feature legacy (PDF §4)        | Rota nova           | Feature module                             |
| ------------------------------ | ------------------- | ------------------------------------------ |
| 4.1 Dashboard Central          | `/` (em `_app`)     | `features/storage` + `catalog` (agregação) |
| 4.2 Lado Direito               | `/direito`          | `features/storage`                         |
| 4.2 Lado Esquerdo              | `/esquerdo`         | `features/storage`                         |
| 4.3 Fora do Local              | `/fora`             | `features/storage`                         |
| 4.3 Sala dos Masters           | `/masters`          | `features/storage`                         |
| 4.3 Aditivos Químicos          | `/aditivos`         | `features/storage`                         |
| 4.4 Kardex                     | `/kardex`           | `features/kardex`                          |
| 4.5 Planilha Amarela + Excel   | `/planilha-amarela` | `features/reports`                         |
| 4.5 Gerir Materiais Existentes | `/catalogo`         | `features/catalog`                         |
| Login                          | `/login`            | `features/auth`                            |

Regra de negócio crítica do PDF (Paletes vs Sacos ≤ 25kg): centralizar em
`shared/lib/business.ts` (`isSack(material): boolean`,
`countsAsPallet(material): boolean`).

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
| 005 | Catálogo (CRUD em `/catalog` + UI de gestão)                           |
| 006 | Storage locations + stock items (Direito/Esquerdo)                     |
| 007 | Áreas livres (Fora, Masters, Aditivos)                                 |
| 008 | Kardex (listeners, escrita via onBlur, exclusão admin)                 |
| 009 | Dashboard (agregações, busca de material, regra ≤25kg)                 |
| 010 | Planilha Amarela + export Excel (exceljs)                              |
| 011 | Migração `legacy/db.json` → Firestore (script + dry-run)               |
| 012 | Deploy GitHub Pages + Actions + secrets                                |
| 013 | App Check (quando domínio estabilizar)                                 |
