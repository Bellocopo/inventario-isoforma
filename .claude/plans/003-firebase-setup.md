# Plano 003 — Firebase setup

Status: **concluído**.

## Context

O Plano 002 deixou o projeto com shell React+Vite+TS+Tailwind+TanStack Router
funcional, mas **sem nenhuma integração com Firebase**: o `login.tsx` é
placeholder, `_app.tsx` não tem guard, e não existe `firebase.ts`,
`.env.example`, regras, indexes ou script de admin.

Este plano coloca a **fundação Firebase** no lugar:

- Cliente Firebase isolado em `src/shared/lib/firebase.ts` com auth + Firestore
  (cache IndexedDB persistente, multi-tab) e suporte opcional a emuladores.
- Validação das env vars `VITE_FIREBASE_*` no boot, com `zod`.
- Regras Firestore versionadas em `firestore/firestore.rules` + indexes
  vazios em `firestore/firestore.indexes.json`, aplicadas via Firebase CLI
  manualmente pelo dono.
- Firebase Emulator Suite (auth + firestore) configurado para dev local.
- Script `scripts/set-role.ts` (Admin SDK) para promover/rebaixar usuários
  via Custom Claims.
- README.md mínimo cobrindo setup local de Firebase, emuladores e
  `set-role`.

**Não entra aqui:** login de verdade, guard de rotas, hooks de Firestore,
auth context, deploy CI das regras. Tudo isso vai para 004+.

## Decisões consolidadas

| Item                        | Escolha                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| Projeto Firebase            | Reusar `inventario-isoforma` (existente)                                 |
| Cache Firestore             | `persistentLocalCache` + `persistentMultipleTabManager`                  |
| Emuladores                  | Auth + Firestore incluídos no plano (`firebase.json`, script `emu`)      |
| Validação de env            | `zod` em `src/shared/lib/env.ts` — falha cedo                            |
| Regras                      | `firestore/firestore.rules` versionado, aplicado por Firebase CLI        |
| Deploy de regras            | Manual local (`npm run rules:deploy`); CI fica para plano futuro         |
| Credencial do `set-role.ts` | Env var `GOOGLE_APPLICATION_CREDENTIALS` apontando p/ arquivo gitignored |
| Runtime do script           | `tsx` (sem build intermediário)                                          |
| README                      | Mínimo, focado em pré-requisitos + Firebase + emulators + set-role       |

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar para o próximo.

### 1. Instalar dependências

```
npm install firebase
npm install -D firebase-admin firebase-tools tsx
```

- `firebase` (runtime, v11+) — modular SDK.
- `firebase-admin` (dev) — usado **só** pelo script `set-role.ts`. Não
  entra no bundle do cliente.
- `firebase-tools` (dev) — CLI para emulators e deploy de regras
  localmente, sem depender de instalação global.
- `tsx` (dev) — executa `.ts` direto sem build.

### 2. `.env.example` + ajustes no `.gitignore`

- Criar `.env.example` na raiz com placeholders documentados:

  ```
  # Web SDK (públicas por design, mas mantidas fora do repo)
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_STORAGE_BUCKET=
  VITE_FIREBASE_MESSAGING_SENDER_ID=
  VITE_FIREBASE_APP_ID=

  # Dev local — conectar ao Firebase Emulator Suite
  VITE_USE_EMULATORS=false
  ```

- Atualizar `.gitignore` para também ignorar `secrets/` (onde vai a
  service account do `set-role`). `.env*` já está ignorado.
- O usuário cria `.env.local` localmente copiando de `.env.example` e
  preenche com valores do console Firebase do projeto `inventario-isoforma`.

### 3. Validação de env com zod — `src/shared/lib/env.ts`

```ts
import { z } from "zod";

const schema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_USE_EMULATORS: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(
    "Env inválido. Confira .env.local contra .env.example.\n" +
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
}

export const env = parsed.data;
```

### 4. Cliente Firebase — `src/shared/lib/firebase.ts`

```ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { env } from "./env";

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

if (env.VITE_USE_EMULATORS) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

### 5. Firebase CLI: `firebase.json` + `.firebaserc`

- `firebase.json` (raiz):
  ```json
  {
    "firestore": {
      "rules": "firestore/firestore.rules",
      "indexes": "firestore/firestore.indexes.json"
    },
    "emulators": {
      "auth": { "port": 9099 },
      "firestore": { "port": 8080 },
      "ui": { "enabled": true, "port": 4000 },
      "singleProjectMode": true
    }
  }
  ```
- `.firebaserc`:
  ```json
  { "projects": { "default": "inventario-isoforma" } }
  ```

### 6. Regras + indexes em `firestore/`

- `firestore/firestore.rules` — implementar o esqueleto de
  `.claude/architecture.md §7` exatamente como descrito:

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isSignedIn() { return request.auth != null; }
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
          allow read:           if isSignedIn();
          allow create, update: if isAdmin();
          allow delete:         if isAdmin();
        }
      }

      match /kardex/{logId} {
        allow read:   if isSignedIn();
        allow create: if isAdmin();
        allow update: if false;
        allow delete: if isAdmin();
      }

      match /users/{uid} {
        allow read:  if isSignedIn();
        allow write: if false;
      }

      match /{document=**} { allow read, write: if false; }
    }
  }
  ```

- `firestore/firestore.indexes.json` — placeholder vazio (indexes
  compostos do kardex entram com o plano 008):
  ```json
  { "indexes": [], "fieldOverrides": [] }
  ```

### 7. Script `scripts/set-role.ts`

```ts
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [, , email, role = "admin"] = process.argv;
if (!email || !["admin", "reader"].includes(role)) {
  console.error("Uso: npm run set-role -- <email> <admin|reader>");
  process.exit(1);
}

if (!getApps().length) initializeApp({ credential: applicationDefault() });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const nextClaims = { ...(user.customClaims ?? {}), role };
await auth.setCustomUserClaims(user.uid, nextClaims);
console.log(`Role '${role}' aplicado em ${email} (uid: ${user.uid}).`);
console.log(
  "⚠️  O usuário precisa relogar (ou app fazer getIdToken(true)) para ver a claim.",
);
```

- Requer `GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json`
  no ambiente.
- `tsconfig.scripts.json` específico para Node:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "types": ["node"]
    },
    "include": ["scripts/**/*"]
  }
  ```
- Adicionar `@types/node` em devDependencies se ainda não estiver.

### 8. Scripts npm

Adicionar em `package.json`:

```json
{
  "scripts": {
    "emu": "firebase emulators:start",
    "rules:deploy": "firebase deploy --only firestore",
    "set-role": "tsx scripts/set-role.ts"
  }
}
```

(Uso: `npm run set-role -- joao@isoforma.com admin`.)

### 9. README.md mínimo

Criar `README.md` na raiz com seções:

1. **Pré-requisitos**: Node 22+, npm, Firebase CLI (via `npx firebase`),
   acesso ao projeto Firebase `inventario-isoforma`.
2. **Setup local**: clone, `npm install`, copiar `.env.example` →
   `.env.local`, preencher.
3. **Rodar dev**: `npm run dev` (em http://localhost:3001).
4. **Emuladores**: como rodar (`npm run emu`), portas, ativar com
   `VITE_USE_EMULATORS=true` em `.env.local`.
5. **Promover admin**: baixar service account → `secrets/service-account.json`
   → exportar `GOOGLE_APPLICATION_CREDENTIALS` → `npm run set-role -- email role`.
6. **Deploy de regras**: `npm run rules:deploy` (depois de `npx firebase login`).
7. **Estrutura** (resumo super curto, com link pra `.claude/architecture.md`
   pra mais detalhe).

### 10. Atualizar `architecture.md` (se necessário)

- Confirmar §3 (segredos), §6 (auth), §7 (regras) — provavelmente sem
  mudanças. **Anotar**: scripts/tsconfig.scripts.json adicionado;
  emuladores configurados; cache persistente habilitado.
- Se algo divergir, ajustar.

### 11. Atualizar `CLAUDE.md`

- Mover linha do Plano 003 para "concluído" na tabela.
- Promover a lista de comandos npm úteis (`npm run dev/build/lint/emu/set-role/rules:deploy`) das "Notas para refinar depois" para uma seção própria.

### 12. Commit

```
git add -A
git commit -m "chore(firebase): client, regras, emuladores e script set-role (#003)"
```

## Arquivos criados / modificados

```
.env.example                              (novo)
.gitignore                                (modificado — adicionar secrets/)
package.json                              (modificado — deps + scripts)
package-lock.json                         (modificado)
firebase.json                             (novo)
.firebaserc                               (novo)
firestore/firestore.rules                 (novo)
firestore/firestore.indexes.json          (novo)
scripts/set-role.ts                       (novo)
tsconfig.scripts.json                     (novo)
src/shared/lib/env.ts                     (novo)
src/shared/lib/firebase.ts                (novo)
README.md                                 (novo)
.claude/architecture.md                   (modificado — possível ajuste fino)
CLAUDE.md                                 (modificado — status do 003 + comandos)
```

## Verificação end-to-end

1. `npm install` roda limpo.
2. `npm run typecheck` passa.
3. `npm run lint` passa.
4. **Cliente sem env**: renomear `.env.local` temporariamente, `npm run dev`
   — o app **deve falhar imediatamente** com erro do zod listando vars
   faltando. Restaurar `.env.local`.
5. **Cliente com env**: `npm run dev` sobe sem erro de Firebase; abrir
   DevTools → Application → IndexedDB → ver bancos `firestore/...`
   criados (cache persistente ativo).
6. **Emuladores**:
   - Setar `VITE_USE_EMULATORS=true` em `.env.local`.
   - Em outro terminal: `npm run emu` — Auth UI sobe em
     http://127.0.0.1:4000, Firestore em 8080, Auth em 9099.
   - `npm run dev` — abrir Console, sem erro. Network requests apontam
     para `127.0.0.1`, não para `*.googleapis.com`.
7. **Regras** (em modo emulador, criar um usuário fake no Auth UI):
   - Tentar `setDoc` em `/catalog/X` sem claim → **PERMISSION_DENIED**.
   - Aplicar claim `admin` no Auth UI manualmente → mesma escrita **passa**.
   - Confirma que a regra `isAdmin()` está válida.
8. **`set-role` (contra prod, opcional)**:
   - Baixar service account, `export GOOGLE_APPLICATION_CREDENTIALS=...`
     no terminal.
   - `npm run set-role -- <email-real> admin` → mensagem de sucesso.
   - No console Firebase → Auth → ver custom claim aplicada no usuário.
   - Reverter com `npm run set-role -- <email> reader` se for um teste.
9. **Deploy de regras** (opcional, contra prod):
   - `npx firebase login` (se ainda não logado).
   - `npm run rules:deploy` → regras publicadas no projeto
     `inventario-isoforma`. Verificar no console Firebase →
     Firestore → Regras.
10. `legacy/` intocada; nenhuma dep Firebase vazou pro client bundle além
    do esperado (rodar `npm run build` e olhar tamanho).

## Não-objetivos (explícitos)

- Implementar login real ou auth context — fica para Plano 004.
- Implementar guard de rota (`_app.tsx` redirect → `/login`) — Plano 004.
- Criar coleções iniciais ou seed do catálogo — Planos 005/011.
- Definir indexes do kardex de verdade — Plano 008 (quando a feature pedir).
- Workflow GitHub Actions para deploy automático de regras — Plano
  futuro (provavelmente junto com 012).
- App Check — Plano 013.

## Próximos planos

- 004 — Auth (login real, guard, `useAuth`/`useRole`, refresh do token
  pra ler custom claim).
- 005 — Catálogo (CRUD em `/catalog`).
