# Plano 004 — Auth (login real, guard, useAuth/useRole)

Status: **aprovado, aguardando execução**.

## Context

Após o Plano 003, o cliente Firebase está pronto (`auth`, `db` exportados de
[src/shared/lib/firebase.ts](../../src/shared/lib/firebase.ts), regras
estritas no Firestore, custom claim `role` aplicável via
`npm run set-role`), mas **nada está conectado ao app**:

- [src/routes/login.tsx](../../src/routes/login.tsx) tem o form com
  react-hook-form+zod, mas `onSubmit` é vazio.
- [src/routes/\_app.tsx](../../src/routes/_app.tsx) não tem guard — qualquer
  um acessa o layout autenticado.
- [src/main.tsx](../../src/main.tsx) cria o router sem contexto.
- [src/features/auth/](../../src/features/auth/) é vazio.

Este plano implementa o **fluxo de autenticação end-to-end**:

1. Provider de auth + hooks (`useAuth`, `useRole`) escutando
   `onAuthStateChanged` e lendo a custom claim `role` via
   `getIdTokenResult(true)`.
2. Contexto tipado do TanStack Router (`createRootRouteWithContext`)
   expondo o auth para `beforeLoad` em rotas protegidas.
3. Login real: `_app` redireciona para `/login` se `signed-out`; `/login`
   redireciona pra rota original (ou `/`) se `signed-in`.
4. Splash full-page enquanto o status inicial está `loading`.
5. Logout no header do `_app` com displayName do usuário (Firebase
   `displayName` → fallback parte do email capitalizada).

Recuperação de senha **fica adiada** para plano dedicado depois.

## Decisões consolidadas

| Item                 | Escolha                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| Provider             | React Context + hook custom (`useAuth`)                                           |
| Estado               | `status: 'loading' \| 'signed-in' \| 'signed-out'`, `user`, `role`, `displayName` |
| Custom claim         | Lida via `getIdTokenResult(true)` no login e quando o token muda                  |
| Router integration   | `createRootRouteWithContext<{ auth }>()` + `RouterProvider context={{ auth }}`    |
| Guard                | `beforeLoad` em `_app` (e em `login`, inverso)                                    |
| Splash inicial       | Componente full-page mínimo (logo + spinner) durante `status === 'loading'`       |
| Logout               | Botão no header do `_app`, sem rota dedicada                                      |
| Display name         | `user.displayName` → fallback `capitalize(email.split('@')[0])`                   |
| Recuperação de senha | Adiada para plano futuro                                                          |
| Persistência         | `browserLocalPersistence` (já configurada no Plano 003)                           |

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar para o próximo.

### 1. Tipos compartilhados — `src/features/auth/types.ts`

```ts
import type { User } from "firebase/auth";

export type Role = "admin" | "reader";

export type AuthStatus = "loading" | "signed-in" | "signed-out";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: Role | null;
  displayName: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutNow: () => Promise<void>;
};
```

### 2. Helper de displayName — `src/features/auth/displayName.ts`

```ts
import type { User } from "firebase/auth";

export function getDisplayName(user: User | null): string | null {
  if (!user) return null;
  if (user.displayName && user.displayName.trim()) return user.displayName;
  const email = user.email ?? "";
  const local = email.split("@")[0] ?? "";
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}
```

### 3. Provider — `src/features/auth/AuthProvider.tsx`

- `createContext<AuthContextValue | null>(null)`.
- Estado interno: `status`, `user`, `role`.
- `useEffect`:
  - `onAuthStateChanged(auth, async (u) => { ... })`
  - Se `u` nulo → `status = 'signed-out'`, `user/role = null`.
  - Se `u`: chama `u.getIdTokenResult()` (sem force inicialmente — já
    refletindo a claim) → `role = result.claims.role ?? null`.
  - `status = 'signed-in'`.
- `signIn(email, password)`:
  - `await signInWithEmailAndPassword(auth, email, password)`.
  - `await user.getIdTokenResult(true)` — **força refresh** para ler claim
    recém-aplicada (ex: `set-role` rodado entre sessões).
  - Atualiza estado.
  - Repassa erros (`FirebaseError`) pro caller (login.tsx faz UI).
- `signOutNow()`:
  - `await signOut(auth)`. O listener cuida de zerar estado.
- Valor do Context: spread do estado + handlers + `displayName` derivado de
  `getDisplayName(user)`.

### 4. Hooks — `src/features/auth/useAuth.ts` + `useRole.ts`

```ts
// useAuth.ts
import { useContext } from "react";
import { AuthCtx } from "./AuthProvider";

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth() fora de <AuthProvider>");
  return ctx;
}
```

```ts
// useRole.ts
import { useAuth } from "./useAuth";

export function useRole() {
  const { role } = useAuth();
  return { role, isAdmin: role === "admin", isReader: role === "reader" };
}
```

### 5. Splash — `src/features/auth/AuthSplash.tsx`

Componente full-screen simples (centralizado): título "Inventário Isoforma"

- spinner Lucide (`Loader2` com `animate-spin`). Sem texto extra.
  Renderizado no `__root` quando `status === 'loading'`.

### 6. Atualizar `src/main.tsx`

Padrão TanStack Router com context dinâmico:

```tsx
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";

const router = createRouter({
  routeTree,
  context: { auth: undefined! }, // preenchido no InnerRouter
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerRouter() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <InnerRouter />
    </AuthProvider>
  </StrictMode>,
);
```

### 7. Atualizar `src/routes/__root.tsx`

```tsx
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import type { AuthContextValue } from "@/features/auth/types";
import { AuthSplash } from "@/features/auth/AuthSplash";

interface RouterContext {
  auth: AuthContextValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const { auth } = Route.useRouteContext();
  if (auth.status === "loading") return <AuthSplash />;
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </>
  );
}
```

### 8. Atualizar `src/routes/_app.tsx`

- `beforeLoad`: redirecionar para `/login` se não autenticado.
- Layout: header com displayName + botão "Sair".

```tsx
export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.status === "signed-out") {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});
```

Header tem `<button onClick={signOutNow}>Sair</button>` (usando o
`useAuth()` no componente).

### 9. Atualizar `src/routes/login.tsx`

- Schema de search params: `z.object({ redirect: z.string().optional() })`.
- `beforeLoad`: se `signed-in`, redirecionar para `search.redirect` (ou `/`).
- Handler `onSubmit`:
  - `try { await signIn(email, password); navigate({ to: search.redirect ?? "/" }) }`
  - `catch (e) { setError("E-mail ou senha incorretos.") }` — mensagem
    genérica (não vazar se o email existe; espelha o legado em
    [legacy/index.html:838](../../legacy/index.html#L838)).
- Render: mostrar `error` em `<p className="text-red-600">` abaixo dos
  campos.
- Botão "Entrar" mostra spinner enquanto submitting.

### 10. Atualizar `_app/index.tsx`

Substituir placeholder por: "Olá, {displayName}." + lista de cards de
navegação para as rotas que virão nos próximos planos (apenas labels;
ainda sem rotas concretas). Bom smoke test do `useAuth`.

### 11. Criar o context — `src/features/auth/AuthProvider.tsx` (faltante)

Os passos 1–10 foram executados, mas o arquivo `AuthProvider.tsx` não
foi criado. Como `useAuth.ts` importa `AuthCtx` de `./AuthProvider` e
`main.tsx` importa o componente `AuthProvider`, o build/typecheck falha
sem ele.

```tsx
import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/shared/lib/firebase";
import { getDisplayName } from "./displayName";
import type { AuthContextValue, AuthStatus, Role } from "./types";

export const AuthCtx = createContext<AuthContextValue | null>(null);

function readRole(claims: Record<string, unknown>): Role | null {
  const r = claims.role;
  return r === "admin" || r === "reader" ? r : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setStatus("signed-out");
        return;
      }
      const tokenResult = await u.getIdTokenResult();
      setUser(u);
      setRole(readRole(tokenResult.claims));
      setStatus("signed-in");
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      displayName: getDisplayName(user),
      async signIn(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // força refresh para ler claim recém-aplicada por set-role entre sessões
        const tokenResult = await cred.user.getIdTokenResult(true);
        setUser(cred.user);
        setRole(readRole(tokenResult.claims));
        setStatus("signed-in");
      },
      async signOutNow() {
        await signOut(auth);
        // o listener acima zera estado
      },
    }),
    [status, user, role],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
```

**Ajustes necessários** (apenas se o build apontar):

- `useAuth.ts` já espera `import { AuthCtx } from "./AuthProvider"` —
  com `export const AuthCtx` acima, resolvido.
- `main.tsx` já espera `import { AuthProvider } from "./features/auth/AuthProvider"` —
  o `export function AuthProvider` acima atende.
- Se algum consumidor importar via `default`, mudar para named import.
- Confirmar `npm run typecheck` e `npm run lint` passando.

### 12. Atualizar `architecture.md` §6

- Confirmar que o fluxo descrito (custom claims, getIdTokenResult(true) no
  login, useRole helper) bateu com a implementação. Ajustes se algo mudou.

### 13. Atualizar `CLAUDE.md`

- Linha do Plano 004 → **concluído** na tabela.

### 14. Commit

```
git add -A
git commit -m "feat(auth): login real, guard de rotas e useAuth/useRole (#004)"
```

## Arquivos criados / modificados

```
src/features/auth/types.ts                (novo)
src/features/auth/AuthProvider.tsx        (novo)
src/features/auth/useAuth.ts              (novo)
src/features/auth/useRole.ts              (novo)
src/features/auth/AuthSplash.tsx          (novo)
src/features/auth/displayName.ts          (novo)
src/main.tsx                              (modificado)
src/routes/__root.tsx                     (modificado)
src/routes/_app.tsx                       (modificado)
src/routes/login.tsx                      (modificado)
src/routes/_app/index.tsx                 (modificado)
.claude/architecture.md                   (modificado — refinamentos §6)
CLAUDE.md                                 (modificado — status 004)
```

## Verificação end-to-end

Toda verificação rodando com emuladores: `VITE_USE_EMULATORS=true` em
`.env.local`, `npm run emu` num terminal e `npm run dev` no outro.

1. `npm run typecheck` passa.
2. `npm run lint` passa.
3. **Boot sem sessão**:
   - Limpar IndexedDB do navegador (DevTools → Application).
   - Acessar `http://localhost:3001/` → mostra splash brevemente, depois
     redireciona para `/login`.
4. **Login com credenciais erradas**:
   - No Auth UI do emulador (4000), criar `joao@teste.com` / senha `123456`.
   - Em `/login`, tentar `joao@teste.com` + senha `wrong` → mensagem
     "E-mail ou senha incorretos." abaixo do form. Permanece na tela.
5. **Login OK como reader**:
   - Entrar com a senha correta → redireciona para `/` (layout `_app`).
   - Header mostra "Joao" (displayName fallback). Botão "Sair" presente.
   - DevTools Console → não há erro.
6. **Acesso admin**:
   - No Auth UI do emulador, abrir o usuário e adicionar custom claim
     `{ "role": "admin" }`. Logout no app, login de novo.
   - Em devtools, expor `useAuth().role === 'admin'` (ou ler do estado).
   - Em planos futuros, isso vai destravar a UI; aqui basta validar.
7. **Persistência**:
   - Após login, recarregar a página → não volta pro `/login`, mantém
     sessão (cache do auth + IndexedDB Firestore).
8. **Logout**:
   - Clicar "Sair" → redireciona para `/login`.
9. **Acesso direto a rota protegida**:
   - Sem login, acessar `http://localhost:3001/` → após splash, vai pra
     `/login?redirect=%2F`.
   - Depois de logar, volta automaticamente pra `/`.
10. **Login já autenticado**:
    - Estando logado, acessar `/login` direto → redireciona pra `/` sem
      mostrar o form.
11. **Sanity contra produção** (opcional, sem emulator):
    - Setar `VITE_USE_EMULATORS=false`, logar com usuário real.
    - Confirmar que `useRole().isAdmin === true` apenas se `set-role` foi
      executado para esse email.

## Não-objetivos (explícitos)

- Recuperação de senha (link "Esqueci minha senha" + flow de reset).
- Tela de gerenciamento de usuários ou auto-cadastro.
- Qualquer leitura/escrita de coleções Firestore — fica para 005+.
- Rota `/logout` dedicada — usamos handler no header.
- Mudança no `set-role.ts` para também setar `displayName` (já dá pra
  fazer pelo console Firebase; se virar atrito, plano dedicado).
- App Check — Plano 013.

## Próximos planos

- 005 — Catálogo (CRUD em `/catalog`, primeiro uso de Firestore com regras
  de admin) — destrava também o padrão de hooks `useFirestoreCollection`.
- 006 — Storage locations + stock_items (Lado Direito/Esquerdo).
