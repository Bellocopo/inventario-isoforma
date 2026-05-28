# Plano 005 — Validação intermediária pós-auth

Status: **aprovado, aguardando execução pelo usuário**.

> Este plano insere uma fase de validação manual antes do Catálogo. Os
> planos seguintes da tabela do CLAUDE.md sobem +1: Catálogo passa a ser
> 006, Storage 007, Áreas livres 008, Kardex 009, Dashboard 010,
> Planilha 011, Migração 012, Deploy 013, App Check 014.

## Context

Os Planos 002 (bootstrap), 003 (Firebase setup) e 004 (auth) foram
executados. Antes de tocar o Firestore de verdade no Plano 006 (Catálogo),
vale **validar manualmente** o que já está no ar — auth, guard, splash,
persistência, custom claims. Bugs aqui são pequenos e localizados; deixar
acumular fica caro nos próximos planos.

Este plano é **executado pelo usuário**, não pelo Claude. O Claude atua
na correção do que for reportado.

## Pré-requisitos

- `.env.local` preenchido com `VITE_FIREBASE_*` e `VITE_USE_EMULATORS=true`.
- Dois terminais abertos no diretório do projeto.
- Navegador com DevTools (Chrome/Edge).
- Firebase CLI logado (`npx firebase login`) se for a primeira vez rodando
  o emulator.

## Como usar este roteiro

Em cada bloco há uma tabela. Marque o resultado:

- **OK** se bateu com o esperado.
- **FALHOU** se divergiu. Anote print/console/URL nas notas.

No fim, me devolva as tabelas preenchidas (pode colar inline) e os prints
das falhas. Bugs comuns esperados estão listados na seção "Bugs típicos"
no rodapé.

## Bloco A — Saúde do projeto

Execute na ordem, num terminal limpo:

```
npm run typecheck
npm run lint
npm run build
npm run preview   # abre http://localhost:4173 (porta default do preview)
```

| #   | Passo                        | Esperado                                          | Resultado | Notas |
| --- | ---------------------------- | ------------------------------------------------- | --------- | ----- |
| A.1 | `npm run typecheck`          | 0 erros                                           | Ok        |       |
| A.2 | `npm run lint`               | 0 erros / 0 warnings                              | 6 warning |       |
| A.3 | `npm run build`              | sucesso; gera `dist/` sem erros                   | Ok        |       |
| A.4 | `npm run preview` no browser | carrega `/` (mesmo que volte pro `/login` depois) | Ok        |       |

Depois de A.4, mate o preview com Ctrl+C.

## Bloco B — Emuladores + Dev server

Terminal 1:

```
npm run emu
```

Confirma nos logs: Auth na 9099, Firestore na 8080, UI na 4000.

Terminal 2:

```
npm run dev
```

| #   | Passo                                                | Esperado                                                       | Resultado | Notas |
| --- | ---------------------------------------------------- | -------------------------------------------------------------- | --------- | ----- |
| B.1 | `npm run emu` sobe                                   | 3 portas (9099, 8080, 4000) sem erro                           | Ok        |       |
| B.2 | Abrir http://127.0.0.1:4000                          | painel do Emulator Suite carrega                               | Ok        |       |
| B.3 | Criar usuário `joao@teste.com` / `123456` no Auth UI | aparece na lista de users                                      | Ok        |       |
| B.4 | `npm run dev` sobe                                   | http://localhost:3001 disponível, console sem erro de Firebase | Ok        |       |

## Bloco C — Boot e splash

1. DevTools > Application > Storage > **Clear site data** (limpa
   IndexedDB e localStorage, simula primeiro acesso).
2. Acessar http://localhost:3001/.

| #   | Passo                | Esperado                                                                 | Resultado | Notas |
| --- | -------------------- | ------------------------------------------------------------------------ | --------- | ----- |
| C.1 | Carregamento inicial | Splash "Inventário Isoforma" + spinner por uma fração de segundo         | Ok        |       |
| C.2 | Depois do splash     | URL vira `/login?redirect=%2F`                                           | Ok        |       |
| C.3 | Console              | Sem erros vermelhos                                                      | Ok        |       |
| C.4 | Network              | Requests para `127.0.0.1:9099` (auth) — **nada** para `*.googleapis.com` | Ok        |       |

## Bloco D — Login

| #   | Passo                                          | Esperado                                                                                               | Resultado | Notas |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- | ----- |
| D.1 | Email `joao@teste.com` + senha errada          | Mensagem **"E-mail ou senha incorretos."** abaixo do form. Permanece em `/login`. Sem erro no console. | Ok        |       |
| D.2 | Email malformado tipo `joao@` + qualquer senha | Erro de validação Zod inline (não chama Firebase)                                                      | Ok        |       |
| D.3 | Login OK (`joao@teste.com` / `123456`)         | Redireciona para `/` (dashboard). Header mostra **"Olá, Joao"** (capitalizado a partir do email).      | Ok        |       |
| D.4 | Botão "Sair" no header                         | Visível e clicável                                                                                     | Ok        |       |
| D.5 | Conteúdo da dashboard                          | Exibe cards de navegação placeholders (labels para rotas futuras)                                      | Ok        |       |

## Bloco E — Persistência de sessão

| #   | Passo                                            | Esperado                                                                  | Resultado | Notas |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------- | --------- | ----- |
| E.1 | Estando autenticado, recarregar (F5) em `/`      | Continua em `/`, **não** volta pro login                                  | Ok        |       |
| E.2 | Fechar aba, abrir nova em http://localhost:3001/ | Continua autenticado                                                      | Ok        |       |
| E.3 | DevTools > Application > IndexedDB               | Bancos do Firebase (`firebaseLocalStorageDb` e `firestore/...`) presentes | Ok        |       |

## Bloco F — Guard e redirects

| #   | Passo                                        | Esperado                                    | Resultado | Notas |
| --- | -------------------------------------------- | ------------------------------------------- | --------- | ----- |
| F.1 | Estando autenticado, acessar `/login` direto | Redireciona para `/` sem mostrar o form     | Ok        |       |
| F.2 | Clicar "Sair" no header                      | Vai pra `/login`, sem displayName no header | Ok        |       |
| F.3 | Estando deslogado, acessar `/` direto        | Splash breve → `/login?redirect=%2F`        | Ok        |       |
| F.4 | Logar a partir desse redirect                | Volta automaticamente para `/`              | Ok        |       |

## Bloco G — Custom claim (`role`)

1. No Auth UI do emulator (http://127.0.0.1:4000/auth), abrir o usuário
   `joao@teste.com`.
2. Na seção **Custom Claims**, colar `{"role":"admin"}` e salvar.
3. No app, sair e logar de novo.

> Para inspecionar `useAuth().role` sem UI dedicada, abra React DevTools
> e procure o componente `AuthProvider` → `hooks` → variável `role`.
> Alternativa rápida: edite temporariamente
> [src/routes/\_app/index.tsx](../../src/routes/_app/index.tsx) adicionando
> `<pre>{JSON.stringify({ role }, null, 2)}</pre>` (e desfaça depois).

| #   | Passo                                             | Esperado                                                                  | Resultado | Notas |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------- | --------- | ----- |
| G.1 | Sem claim ainda (usuário recém-criado)            | `useAuth().role === null`                                                 | Ok        |       |
| G.2 | Setar `{"role":"admin"}` + logout + login         | `useAuth().role === "admin"`                                              | Ok        |       |
| G.3 | Trocar para `{"role":"reader"}` + logout + login  | `useAuth().role === "reader"`                                             | Ok        |       |
| G.4 | Trocar para `{"role":"intruso"}` + logout + login | `useAuth().role === null` (o `readRole` ignora valores fora do whitelist) | Ok        |       |

## Como reportar

Para cada bloco, devolva a tabela preenchida (pode colar Markdown direto).
Para cada **FALHOU**:

- Print do Console DevTools (com os erros vermelhos).
- URL exata em que estava.
- Comando exato que rodou (no caso do Bloco A).
- Uma linha: o que aconteceu vs. o que era esperado.

Não tenta corrigir você mesmo — me devolve o reporte que eu sei o que
mexer.

## Bugs típicos esperados (não perde tempo se aparecerem)

- **Erro `Cannot find module './AuthProvider'`** — passo 11 do Plano 004
  não foi executado ou o export do `AuthCtx`/`AuthProvider` diverge.
  Corrijo no Plano 004.
- **`routeTree.gen.ts` desatualizado** — TypeScript reclama de rotas
  inexistentes. Resolução: deletar o arquivo e rodar `npm run dev` de
  novo para regenerar.
- **`role` aparece como `undefined` mesmo após setar claim** — falta o
  `getIdTokenResult(true)` no `signIn` do `AuthProvider`. Eu ajusto.
- **Network falando com `googleapis.com` em vez de `127.0.0.1`** —
  `VITE_USE_EMULATORS=true` não está em `.env.local`, ou o Vite não
  pegou a env (precisa restart do `npm run dev`).
- **Splash não some, fica girando para sempre** — o
  `onAuthStateChanged` não disparou. Provavelmente erro no init do
  Firebase; ver console.

## Após este plano

Quando todos os blocos passarem (ou os bugs reportados forem corrigidos):

1. Atualizar `CLAUDE.md` marcando 005 como **concluído** e confirmando o
   renúmero (006 — Catálogo, 007 — Storage, …, 014 — App Check).
2. Atualizar `.claude/architecture.md §12` para o mesmo renúmero.
3. Seguir para o Plano 006 (Catálogo).

## Não-objetivos

- Validar Firestore (leitura/escrita) — fica para o Plano 006.
- Testar build de deploy / GH Pages — fica para o Plano de deploy.
- Sanity contra produção — opcional, pode rodar depois se você quiser
  (basta setar `VITE_USE_EMULATORS=false`, sem outras mudanças).
