# Plano 014 — Deploy GitHub Pages + Actions

Status: concluído

## Context

O app é **front-only** (Vite + React + Firestore client). Falta publicá-lo. O
destino é **GitHub Pages**, servido a partir do repositório público
[`Bellocopo/inventario-isoforma`](https://github.com/Bellocopo/inventario-isoforma),
com build e deploy automatizados por **GitHub Actions**.

Fatos do repo que moldam o plano:

- **Project page**: a URL será `https://bellocopo.github.io/inventario-isoforma/`
  (host com owner em minúsculas; path = nome do repo). Logo o app vive sob o
  **subcaminho `/inventario-isoforma/`**, não na raiz.
- **TanStack Router em history mode** (browser history, ver
  [main.tsx](../../src/main.tsx)) — não é hash. Em SPA no GH Pages isso exige
  (a) `base` no Vite, (b) `basepath` no router e (c) fallback `404.html` para
  deep-links/refresh não caírem em 404 de verdade.
- **Vite sem `base`** hoje ([vite.config.ts](../../vite.config.ts)) → assets
  sairiam apontando para `/assets/...` (raiz) e quebrariam sob o subcaminho.
- **Env por `import.meta.env`** validado por zod ([env.ts](../../src/shared/lib/env.ts)):
  6 `VITE_FIREBASE_*` + `VITE_USE_EMULATORS`. O Vite **inlina** essas vars no
  build, então elas precisam existir **no momento do build** (no CI, via
  Secrets). `VITE_USE_EMULATORS` ausente → default `false` (prod usa Firebase real).
- **npm** (há `package-lock.json`; Node `>=22`). _(A architecture §3 menciona
  pnpm/branch gh-pages — desatualizado; este plano corrige.)_

## Decisões consolidadas (confirmadas)

| Item             | Escolha                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Hospedagem       | **Project page** → `https://bellocopo.github.io/inventario-isoforma/`                    |
| `base` do Vite   | `"/inventario-isoforma/"` **só no build** (`command === "build"`); dev fica em `/`       |
| Router           | `basepath` = `import.meta.env.BASE_URL` (sem barra final)                                |
| SPA fallback     | Copiar `dist/index.html` → `dist/404.html` (plugin Vite inline, no `closeBundle`)        |
| Método de deploy | **GitHub Pages oficial** (`upload-pages-artifact` + `deploy-pages`); sem branch gh-pages |
| Gatilho          | `push` na `main` + `workflow_dispatch` (manual)                                          |
| Segredos         | 6 `VITE_FIREBASE_*` como **GitHub Actions Secrets**, injetados no step de build          |
| Repo             | **Público** — nada sensível no build (web keys são públicas; SA fica gitignored)         |

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar.

### 1. Criar o arquivo do plano

Gravar este conteúdo em `.claude/plans/014-deploy-github-pages-actions.md`.

### 2. `base` do Vite + fallback 404 — `vite.config.ts`

- Converter para a forma funcional: `defineConfig(({ command }) => ({ ... }))`.
- `base: command === "build" ? "/inventario-isoforma/" : "/"`.
- Adicionar um plugin inline `spaFallback404()` que, no hook `closeBundle`,
  copia `dist/index.html` para `dist/404.html` (só no build). Sem arquivo extra.
- `npm run build` deve gerar `dist/404.html` e assets prefixados com
  `/inventario-isoforma/`.

### 3. `basepath` do router — `src/main.tsx`

- `createRouter({ ..., basepath: import.meta.env.BASE_URL.replace(/\/$/, "") })`.
  Em dev `BASE_URL="/"` → basepath `""` (raiz); em prod `"/inventario-isoforma/"`
  → `"/inventario-isoforma"`. Links e navegação passam a respeitar o subcaminho.

### 4. Workflow — `.github/workflows/deploy.yml` (novo)

- `on: { push: { branches: [main] }, workflow_dispatch: {} }`.
- `permissions: { contents: read, pages: write, id-token: write }`.
- `concurrency: { group: "pages", cancel-in-progress: true }`.
- **Job `build`**: `actions/checkout@v4` → `actions/setup-node@v4`
  (`node-version: 22`, `cache: npm`) → `npm ci` → `npm run build` com `env:`
  mapeando os 6 `VITE_FIREBASE_*` de `secrets.*` → `actions/configure-pages@v5`
  → `actions/upload-pages-artifact@v3` (`path: dist`).
- **Job `deploy`**: `needs: build`, `environment: github-pages`,
  `actions/deploy-pages@v4`.

### 5. Passos manuais (GitHub + Firebase) — documentar, não automatizável

1. **Secrets** (repo → Settings → Secrets and variables → Actions): adicionar
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
   `VITE_FIREBASE_APP_ID`.
2. **Pages source** (Settings → Pages → Build and deployment → Source):
   **GitHub Actions**.
3. **Auth authorized domains** (Firebase Console → Authentication → Settings →
   Authorized domains): adicionar `bellocopo.github.io`.
4. Dar `git push` na `main` (ou disparar o workflow manualmente).

### 6. Atualizar `README.md` + `architecture.md` + `CLAUDE.md`

- `README.md`: seção "Deploy (GitHub Pages)" — URL, secrets, passos manuais,
  como o fallback 404 funciona.
- `architecture.md` §3: corrigir para **npm** + **Pages oficial** + nota do
  `base`/`basepath`/`404.html`; remover menção a pnpm/branch gh-pages.
- `CLAUDE.md`: status do plano 014 → concluído; comando/observação se útil.

### 7. Verificação + commit

`npm run typecheck && npm run lint && npm run build` (conferir `dist/404.html` e
prefixo dos assets); depois:

```
git add -A
git commit -m "feat(deploy): GitHub Pages via Actions + base path e fallback 404 (#014)"
```

O deploy real acontece no push para `main` (após os secrets configurados).

## Arquivos criados / modificados

```
.github/workflows/deploy.yml                 (novo — build + deploy Pages)
vite.config.ts                               (modificado — base condicional + plugin 404)
src/main.tsx                                 (modificado — basepath do router)
README.md                                    (modificado — seção Deploy)
.claude/plans/014-deploy-github-pages-actions.md (novo)
.claude/architecture.md                      (modificado — §3)
CLAUDE.md                                     (modificado — status 014)
```

## Verificação end-to-end

1. `npm run typecheck`, `npm run lint`, `npm run build` passam.
2. **Build local**: `dist/404.html` existe e é cópia do `index.html`; o HTML
   referencia assets sob `/inventario-isoforma/assets/...`.
3. **Dev intacto**: `npm run dev` continua servindo em `http://localhost:3001/`
   (base `/`, sem subcaminho).
4. **Actions**: push na `main` dispara o workflow; jobs `build` e `deploy`
   verdes; environment `github-pages` publica.
5. **Site no ar**: `https://bellocopo.github.io/inventario-isoforma/` carrega o
   app (sem 404 de asset, sem tela branca).
6. **Deep-link/refresh**: acessar `/inventario-isoforma/kardex` direto e dar F5
   → o `404.html` reidrata a SPA e o router cai na rota certa (não em 404 real).
7. **Login**: autenticação funciona (domínio `bellocopo.github.io` autorizado);
   sem erro `auth/unauthorized-domain`.
8. **Dados reais**: dashboard/áreas leem o Firestore de produção (não emulador;
   `VITE_USE_EMULATORS` ausente = false).
9. **Mobile**: site acessível e navegável em 375px.

## Não-objetivos (explícitos)

- **App Check** (reCAPTCHA) — plano 015.
- **Domínio customizado** (CNAME) — fica para depois; hoje project page.
- **Preview deploy por PR** / múltiplos ambientes — fora; só produção na `main`.
- **Migração de dados** para o projeto real — é o `npm run migrate` (plano 013),
  rodado pelo operador; não faz parte do pipeline de deploy.
- **Tuning de cache/headers/CDN** além do default do GitHub Pages.
- **Deploy de regras/índices do Firestore** no pipeline — continua manual via
  `npm run rules:deploy` (decisão de operador).

```

```
