# Plano 002 — Bootstrap do projeto

Status: **concluído**.

## Context

O Plano 001 estabeleceu a arquitetura da reescrita do Inventário Isoforma e
moveu o sistema legado para `legacy/`. A raiz do projeto agora tem apenas
`legacy/` e `.claude/` — não existe `package.json`, build ou esqueleto React.

Este plano **bootstrapa o projeto novo** seguindo as escolhas registradas em
`.claude/architecture.md`: Vite + React 18 + TypeScript + Tailwind v4 +
TanStack Router (file-based) + Zustand + lucide-react + react-hook-form/zod,
com ESLint/Prettier/Husky configurados. **Firebase não entra aqui** — fica
para o Plano 003.

Resultado esperado: rodar `npm run dev` mostra um shell React com 3 rotas
vazias funcionando (`/login`, `/` dentro do layout `_app`, `_app/index`),
Tailwind aplicando estilos, e codegen do TanStack Router gerando
`routeTree.gen.ts` no watch.

## Decisões consolidadas (do diálogo de planejamento)

| Item                 | Escolha                                           |
| -------------------- | ------------------------------------------------- |
| Package manager      | npm                                               |
| Tailwind             | v4 + `@tailwindcss/vite`                          |
| Ícones               | lucide-react                                      |
| Lint / format / hook | ESLint (flat) + Prettier + Husky + lint-staged    |
| Forms                | `react-hook-form` + `zod` instalados no bootstrap |
| Path alias           | `@/` → `src/`                                     |
| Testes               | Não no bootstrap — plano dedicado depois          |
| Git                  | Manter repo; commit único de bootstrap ao final   |

## Passos de execução

### 1. Inicializar `package.json` e config básica

- `npm init -y` na raiz.
- Ajustar `package.json`:
  - `"private": true`, `"type": "module"`, `"engines": { "node": ">=20" }`.
  - `scripts`: `dev`, `build`, `preview`, `lint`, `format`, `typecheck`, `prepare` (husky).
- Criar `.nvmrc` com `20`.
- Criar `.gitignore` (node_modules, dist, .DS_Store, .env\*, .eslintcache, .vite, coverage).
- Criar `.editorconfig` mínimo (LF, UTF-8, 2 espaços).

### 2. Dependências runtime

```
npm install react@^18 react-dom@^18 \
  @tanstack/react-router \
  zustand \
  lucide-react \
  react-hook-form zod @hookform/resolvers \
  clsx tailwind-merge
```

(`clsx` + `tailwind-merge` são utilitários usados pelo padrão `cn()` que
todo projeto Tailwind acaba precisando — minúsculos e justificam custo zero.)

### 3. Dependências de build / lint

```
npm install -D \
  typescript @types/react @types/react-dom \
  vite @vitejs/plugin-react \
  @tanstack/router-plugin @tanstack/router-devtools \
  tailwindcss @tailwindcss/vite \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh \
  prettier prettier-plugin-tailwindcss eslint-config-prettier \
  husky lint-staged
```

### 4. Vite + TypeScript

- `vite.config.ts`:
  - Plugins na ordem: `tanstackRouter({ target: 'react', autoCodeSplitting: true })`, `react()`, `tailwindcss()`.
  - `resolve.alias['@'] = path.resolve(__dirname, 'src')`.
  - `server.port = 3001`, `server.strictPort = true` (falha se a porta estiver ocupada em vez de migrar silenciosamente).
- `tsconfig.json` (compilerOptions chave): `strict: true`, `target: ES2022`,
  `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`,
  `paths: { "@/*": ["src/*"] }`, `noUncheckedIndexedAccess: true`,
  `verbatimModuleSyntax: true`.
- `tsconfig.node.json` para `vite.config.ts`.

### 5. Tailwind v4

- `src/styles/globals.css`:

  ```css
  @import "tailwindcss";

  @theme {
    /* tokens iniciais — paleta neutra; ajusta quando feature 005 chegar */
  }
  ```

- Importar `globals.css` no `src/main.tsx`.
- Configurar `prettier-plugin-tailwindcss` em `.prettierrc` para ordenação
  automática de classes.

### 6. Estrutura de pastas (criar diretórios vazios + `.gitkeep` onde fizer sentido)

Conforme `.claude/architecture.md` §4:

```
src/
├── main.tsx
├── routes/
│   ├── __root.tsx
│   ├── login.tsx
│   ├── _app.tsx
│   └── _app/
│       └── index.tsx
├── features/
│   ├── auth/.gitkeep
│   ├── catalog/.gitkeep
│   ├── storage/.gitkeep
│   ├── kardex/.gitkeep
│   └── reports/.gitkeep
├── shared/
│   ├── components/
│   │   └── icons/.gitkeep
│   ├── hooks/.gitkeep
│   ├── lib/
│   │   └── utils.ts        # cn() = twMerge(clsx(...))
│   ├── stores/.gitkeep
│   └── types/.gitkeep
└── styles/
    └── globals.css
```

Pastas que ficarão para outros planos (`firestore/`, `scripts/`,
`.github/workflows/`) **não são criadas neste plano** — cada uma nasce com a
fase que a popula.

### 7. TanStack Router shells

- `src/main.tsx`:
  - Cria `router` com `routeTree` importado de `./routeTree.gen.ts`.
  - `<RouterProvider router={router} />` no `createRoot`.
  - Em dev, montar `<TanStackRouterDevtools />`.
  - Declarar `module '@tanstack/react-router' { interface Register { router: typeof router } }` para type-safety global.

- `src/routes/__root.tsx`:
  - `createRootRoute({ component: RootLayout })`.
  - `RootLayout`: `<Outlet />` (mais devtools em dev).

- `src/routes/login.tsx`:
  - `createFileRoute('/login')({ component: LoginPage })`.
  - `LoginPage` retorna um placeholder com 1 form vazio (esqueleto usando
    `useForm` do react-hook-form + `zodResolver` para validar `{ email, password }`).
    Sem chamada de auth (vai entrar no Plano 004).

- `src/routes/_app.tsx`:
  - Layout pathless `createFileRoute('/_app')({ component: AppLayout })`.
  - `AppLayout` é a casca autenticada (header + nav + `<Outlet />`). Sem
    guard de auth ainda — vira `redirect` para `/login` no Plano 004.
    Por enquanto sempre renderiza filhos.

- `src/routes/_app/index.tsx`:
  - `createFileRoute('/_app/')({ component: DashboardPlaceholder })`.
  - Retorna `<h1>Dashboard (em construção)</h1>` + alguns ícones do lucide
    para validar que o lucide-react funciona.

- O plugin do TanStack Router gera `src/routeTree.gen.ts` no dev e build.
  Ignorar este arquivo no Prettier (`.prettierignore`).

### 8. Zustand exemplo mínimo

Criar `src/shared/stores/ui.ts` com um store mínimo (ex: `useUiStore` com
`isSidebarOpen` + `toggleSidebar`) só para validar o setup. Sem uso real
ainda — fica como referência de padrão para os próximos planos.

### 9. ESLint + Prettier (flat config)

- `eslint.config.js`: `@eslint/js` recommended + `typescript-eslint` strict +
  `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` +
  `eslint-config-prettier` por último. Ignorar `dist/`, `routeTree.gen.ts`,
  `legacy/`.
- `.prettierrc`: `{ "semi": true, "singleQuote": false, "trailingComma": "all", "plugins": ["prettier-plugin-tailwindcss"] }`.
- `.prettierignore`: `dist`, `legacy`, `routeTree.gen.ts`, `package-lock.json`.
- Scripts:
  - `"lint": "eslint ."`
  - `"format": "prettier --write ."`
  - `"typecheck": "tsc -b --noEmit"`

### 10. Husky + lint-staged

- `npx husky init` cria `.husky/pre-commit`.
- `.husky/pre-commit`: `npx lint-staged`.
- Em `package.json`:
  ```json
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
  ```

### 11. `index.html` da raiz

- Vite entry simples:
  ```html
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Inventário Isoforma</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

### 12. Commit final

- `git add -A`
- `git commit -m "chore: bootstrap React + Vite + TS + Tailwind v4 + TanStack Router (#002)"`
- O commit já entra com pre-commit ativo (vai rodar lint-staged sobre os
  arquivos novos — corrigir se algo falhar).

## Arquivos criados / modificados (visão geral)

```
package.json                         (novo)
package-lock.json                    (novo, gerado)
tsconfig.json                        (novo)
tsconfig.node.json                   (novo)
vite.config.ts                       (novo)
eslint.config.js                     (novo)
.prettierrc                          (novo)
.prettierignore                      (novo)
.editorconfig                        (novo)
.gitignore                           (novo)
.nvmrc                               (novo)
.husky/pre-commit                    (novo)
index.html                           (novo, root)
src/main.tsx                         (novo)
src/routes/__root.tsx                (novo)
src/routes/login.tsx                 (novo)
src/routes/_app.tsx                  (novo)
src/routes/_app/index.tsx            (novo)
src/styles/globals.css               (novo)
src/shared/lib/utils.ts              (novo — função cn())
src/shared/stores/ui.ts              (novo — exemplo Zustand)
src/features/{auth,catalog,storage,kardex,reports}/.gitkeep
src/shared/{components/icons,hooks,stores,types}/.gitkeep
```

## Verificação end-to-end

1. `npm install` roda limpo (sem warnings de peer dependency críticos).
2. `npm run typecheck` passa (0 erros).
3. `npm run lint` passa (0 erros / 0 warnings nas regras configuradas).
4. `npm run dev` sobe em `http://localhost:3001`:
   - `/` redireciona automaticamente para o layout `_app` (root → /\_app/),
     mostrando "Dashboard (em construção)" com alguns ícones lucide
     renderizados → confirma Tailwind + lucide.
   - `/login` mostra o esqueleto do form com validação `zod` ativa (digitar
     email inválido → mensagem aparece) → confirma RHF + zod.
   - TanStack Router Devtools visível em dev.
   - Editar `src/routes/_app/index.tsx` e salvar → HMR atualiza sem
     full reload e `routeTree.gen.ts` é regenerado se uma rota for
     adicionada.
5. `npm run build` produz `dist/` sem erros; `npm run preview` serve o build.
6. Criar um arquivo `.ts` com erro de lint proposital → `git commit` falha
   no pre-commit (husky + lint-staged funcionando). Desfazer.
7. `legacy/` continua intocada (sanity check final).

## Não-objetivos (explícitos)

- Nenhuma configuração de Firebase, regras, ou login real.
- Nenhuma feature de domínio (storage, catalog, kardex) implementada.
- Nenhum deploy / CI configurado.
- Nenhum teste automatizado.

## Próximos planos

- 003 — Firebase setup (config via env, regras, custom claims, set-role).
- 004 — Auth (login real, guard de rotas, `useAuth`/`useRole`).
