# Inventário Isoforma

Sistema de controle de inventário físico da Isoforma (resinas, masters e aditivos).

## Pré-requisitos

- Node 22+
- npm
- Acesso ao projeto Firebase `inventario-isoforma` (solicitar ao admin)

## Setup local

```bash
git clone <repo>
cd inventario-isoforma
npm install
cp .env.example .env.local
# Preencher .env.local com os valores do console Firebase → Project settings → Web app
```

## Rodar dev

```bash
npm run dev
# http://localhost:3001
```

## Emuladores Firebase

```bash
npm run emu
# Auth:      http://127.0.0.1:9099
# Firestore: http://127.0.0.1:8080
# UI:        http://127.0.0.1:4000
```

Para apontar o app aos emuladores, setar em `.env.local`:

```
VITE_USE_EMULATORS=true
```

## Promover usuário a admin

1. No console Firebase → Project settings → Service accounts → Generate new private key
2. Salvar em `secrets/service-account.json` (gitignored)
3. Exportar credencial e rodar o script:

```bash
# Linux/Mac
export GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json
npm run set-role -- usuario@isoforma.com admin

# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="secrets/service-account.json"
npm run set-role -- usuario@isoforma.com admin
```

O usuário precisa relogar para a claim entrar em vigor.
Para rebaixar: `npm run set-role -- usuario@isoforma.com reader`

## Gerenciar usuários (CLI)

`npm run users` é um CLI completo de usuários do Firebase Auth — cobre o que o
console não oferece, sobretudo os **papéis** (custom claim `role`, só editável
via Admin SDK). Alvo padrão é o **projeto real** (exige
`GOOGLE_APPLICATION_CREDENTIALS`); use `--emulator` para o Auth emulator local.

```bash
npm run users -- list                                   # lista todos
npm run users -- get usuario@isoforma.com               # detalhes
npm run users -- create novo@isoforma.com senha123 --name "Fulano" --role reader
npm run users -- set-role usuario@isoforma.com admin    # admin | reader | none
npm run users -- password usuario@isoforma.com novaSenha
npm run users -- disable usuario@isoforma.com           # / enable
npm run users -- delete usuario@isoforma.com --yes      # real exige --yes

npm run users -- list --emulator                        # mira o emulador local
```

Após `set-role`/`create --role`, o usuário precisa relogar (ou o app chamar
`getIdToken(true)`) para a claim entrar em vigor. Sem papel, o usuário entra
como leitor (sem `role: admin`, as regras do Firestore barram escrita).

## Migrar `legacy/db.json` para o Firestore

Carrega o inventário do sistema legado (`legacy/db.json`) no Firestore. A
estratégia é **purge + recriar** as coleções `catalog` e `storage_locations` —
o `db.json` é a fonte da verdade. **`kardex` nunca é tocado.** O mapeamento
canônico vive em `scripts/lib/legacy.ts` (o mesmo usado pelo seed do emulador).

`npm run migrate` é **dry-run por padrão**: imprime o resumo (counts + refs) e
não escreve nada. Para escrever de fato use `--commit`; em projeto real, exija
também `--yes`.

```bash
# Dry-run no projeto real (precisa da service account, como no set-role)
export GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json   # Linux/Mac
npm run migrate

# Recarregar o EMULADOR local (com `npm run emu` rodando em outro terminal)
npm run migrate -- --emulator --commit

# Escrever no PROJETO REAL (purge + recriar) — exige confirmação
npm run migrate -- --commit --yes
```

No Windows (PowerShell), exporte a credencial com
`$env:GOOGLE_APPLICATION_CREDENTIALS="secrets/service-account.json"`.

## Deploy (GitHub Pages)

O app é publicado automaticamente em
**https://bellocopo.github.io/inventario-isoforma/** pelo workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) a cada push na
`main` (ou via "Run workflow" manual). Build com `npm ci && npm run build` e
publicação pelo deploy oficial do Pages (sem branch `gh-pages`).

Como o app vive sob o subcaminho `/inventario-isoforma/`, o Vite usa `base` e o
router usa `basepath` no build; um plugin copia `index.html` → `404.html` para
que deep-links/refresh (history mode) reidratem a SPA em vez de dar 404.

**Configuração única (uma vez):**

1. **Repository secrets** (Settings → Secrets and variables → Actions →
   _Repository secrets_) — os 6 valores do `firebaseConfig` (Firebase Console →
   Project settings → Your apps → Web):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
   `VITE_FIREBASE_APP_ID`. Use _Repository_ (não _Environment_): o job `build`
   não declara `environment` e não enxergaria secrets de environment.
2. **Pages source** (Settings → Pages → Build and deployment → Source):
   **GitHub Actions**.
3. **Authorized domains** (Firebase Console → Authentication → Settings →
   Authorized domains): adicionar `bellocopo.github.io` (senão o login falha com
   `auth/unauthorized-domain`).

`VITE_USE_EMULATORS` não é definido no CI → default `false` (produção usa o
Firebase real).

## Deploy de regras Firestore

```bash
npx firebase login   # se ainda não autenticado
npm run rules:deploy
```

## Estrutura

```
src/
  features/      # domínios (auth, catalog, inventory, kardex, …)
  shared/        # lib, ui, hooks, utils reutilizáveis
firestore/       # regras e indexes versionados
scripts/         # scripts Node (set-role)
legacy/          # sistema antigo (read-only, referência)
```

Decisões de arquitetura: [.claude/architecture.md](.claude/architecture.md)
