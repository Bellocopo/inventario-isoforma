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
