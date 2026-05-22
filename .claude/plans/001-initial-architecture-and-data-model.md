# Plano 001 — Arquitetura inicial e modelo de dados

Status: **concluído** (este plano produz só documentação, não código).

## Objetivo

Estabelecer a visão geral da reescrita do Inventário Isoforma e a referência
arquitetural que os planos seguintes devem consultar. **Nenhum código de
produção é implementado neste plano** — somente decisão e documentação.

## Entregáveis

1. Movimentação dos artefatos do sistema antigo para `legacy/`.
2. `.claude/architecture.md` — documento vivo com:
   - Stack e versões (Vite + TS + React + Tailwind + TanStack Router +
     Zustand + Firebase + exceljs).
   - Hospedagem GitHub Pages e gestão de segredos via GitHub Actions Secrets.
   - Estrutura de pastas (file-based routing).
   - Modelo de dados Firestore normalizado (`/catalog`, `/storage_locations`
     + subcoleção `stock_items`, `/kardex`, `/users`).
   - Estratégia de autenticação + autorização (Firebase Auth + Custom Claims).
   - Esqueleto das regras do Firestore.
   - Estratégia de migração via script Node one-shot a partir de `legacy/db.json`.
   - Convenções de código, mapeamento feature legada → módulo novo, decisões
     abertas e roadmap dos próximos planos.
3. `.claude/plans/001-...md` — este arquivo.

## Decisões registradas (resumo das escolhas do usuário)

| Pergunta                            | Escolha                                                     |
| ----------------------------------- | ----------------------------------------------------------- |
| Build/framework                     | Vite + React + TypeScript                                   |
| Hospedagem                          | GitHub Pages                                                |
| Gestão de segredos do Firebase      | GitHub Actions Secrets (`VITE_FIREBASE_*`)                  |
| App Check (reCAPTCHA v3)            | Adiado — registrado como melhoria futura                    |
| Modelo de roles                     | Custom Claims do Firebase Auth                              |
| Bootstrap de admins                 | Script CLI Node + Admin SDK (`scripts/set-role.ts`)         |
| Schema Firestore                    | Coleções normalizadas por entidade                          |
| Identidade do material              | UUID/auto-ID Firestore (estável a renomeações)              |
| Estratégia de kardex/stock          | FK (`materialId`) + snapshot dos campos críticos            |
| Modelo das ruas                     | `/storage_locations` doc por rua + `stock_items` subcoleção |
| Migração dos dados atuais           | Script Node one-shot lendo `legacy/db.json`                 |
| Router                              | TanStack Router file-based                                  |
| Camada de dados (Firestore)         | Hooks custom com `onSnapshot` (sem TanStack Query)          |
| State global do cliente             | Zustand (UI) + Context (Auth)                               |
| Lib de export Excel                 | `exceljs`                                                   |
| Nome da pasta legada                | `legacy/`                                                   |

## Itens explicitamente fora deste plano

- Bootstrap real do projeto (Vite, deps) → **Plano 002**.
- Configuração concreta do Firebase (regras publicadas, IDs reais,
  service account) → **Plano 003**.
- Implementação de qualquer feature de UI → **Planos 004+**.
- Escrita do script de migração → **Plano 011**.
- Deploy/CI → **Plano 012**.

## Próximo passo recomendado

Plano 002 — Bootstrap do projeto. Inicializa `package.json`, configura Vite +
TS + Tailwind + TanStack Router (com plugin Vite e codegen do `routeTree`),
seta convenções de lint/format e cria as primeiras rotas vazias
(`__root`, `login`, `_app/index`). **Sem Firebase ainda** — isso é o 003.

## Histórico de revisão

- 2026-05-22 — Plano criado; arquivos legados movidos para `legacy/`;
  `architecture.md` escrito.
