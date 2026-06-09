# CLAUDE.md — Inventário Isoforma

Guia de trabalho deste repositório. Documento vivo — refine conforme o
projeto evolui.

## O que é o projeto

Reescrita do sistema de controle de inventário físico da Isoforma (resinas,
masters e aditivos por rua/área do galpão). O sistema atual está em
`legacy/index.html` — SPA monolítica (~3.9k linhas em um único arquivo,
React via CDN + Babel standalone, Firestore num único documento com JSON
empacotado, credenciais expostas, controle de acesso só client-side).

A reescrita preserva o produto (ver `legacy/Manual_de_Funcionamento_Inventario_Isoforma.pdf`)
e ataca os problemas estruturais.

## Como trabalhamos

### Plans-first, sempre

1. **Toda mudança não-trivial começa por um plano** em
   `.claude/plans/nnn-slug.md`. O plano é discutido, refinado e aprovado
   **antes** de qualquer código.
2. Planos pequenos e focados. Cada um entrega um pedaço coerente. Se um
   plano vira "monstro", quebrar em planos sucessivos.
3. **Não fazer escolhas não-triviais sem confirmar comigo.** Usar
   `AskUserQuestion` com 2-4 opções e recomendação clara. Quando a decisão
   for trivial (versionar `^X.Y.Z` vs `~X.Y.Z`, escolher um nome de
   variável local, etc.), seguir sem perguntar.
4. **Implementar só depois da aprovação do plano.** Quando estiver em plan
   mode, encerrar com `ExitPlanMode`.

### Execução passo a passo

A execução de qualquer plano é **sempre passo a passo**:

- O usuário indica o passo a executar (pelo número ou descrição).
- Claude executa **apenas aquele passo** e para.
- Claude aguarda autorização explícita antes de avançar para o próximo passo.
- Não encadear passos automaticamente, mesmo que o próximo pareça trivial.

### Numeração dos planos

`.claude/plans/NNN-slug-em-kebab.md`, com `NNN` zero-padded a 3 dígitos.
Continue a sequência — não pule números, não reordene.

Cabeçalho mínimo de cada plano:

```markdown
# Plano NNN — Título

Status: rascunho | aprovado, aguardando execução | em execução | concluído

## Context

[Por que existe; o que motivou]

## Decisões consolidadas

[Tabela das escolhas tomadas comigo]

## Passos de execução

[Lista numerada acionável]

## Arquivos criados / modificados

[Lista clara]

## Verificação end-to-end

[Como testar que ficou ok]

## Não-objetivos (explícitos)

[O que NÃO entra neste plano]
```

### Atualização de `architecture.md`

Sempre que um plano tomar uma decisão **transversal** (afeta convenções,
stack, modelo de dados, contratos), atualizar
[.claude/architecture.md](.claude/architecture.md) — ele é a referência
viva. Planos não duplicam conteúdo de architecture.md; apontam para ele.

### Memória

Memória persistente do Claude (em `~/.claude/projects/.../memory/`) é
usada para preferências de colaboração, feedback e estado do projeto.
Não duplicar coisas que já vivem em código, git history, architecture.md
ou nos planos.

## Convenções de comunicação

- **Idioma:** português (BR/PT mesclado, sem formalismo).
- **Tom:** direto. Updates curtos durante o trabalho.
- **Code references:** use markdown links clicáveis no formato
  `[arquivo.ts](caminho/relativo/arquivo.ts)` ou
  `[arquivo.ts:42](caminho#L42)`. Sem backticks ou tags HTML para refs.
- **Resumos finais:** uma ou duas frases. O que mudou e qual é o próximo
  passo.

## Estado atual

### Planos

| #   | Plano                                                                                               | Status              |
| --- | --------------------------------------------------------------------------------------------------- | ------------------- |
| 001 | [Arquitetura inicial e modelo de dados](.claude/plans/001-initial-architecture-and-data-model.md)   | concluído (só docs) |
| 002 | [Bootstrap do projeto](.claude/plans/002-bootstrap-project.md)                                      | concluído           |
| 003 | [Firebase setup](.claude/plans/003-firebase-setup.md)                                               | concluído           |
| 004 | [Auth (login real, guard de rotas)](.claude/plans/004-auth.md)                                      | concluído           |
| 005 | Validação pós-auth (checkpoint manual)                                                              | concluído           |
| 006 | [Design system](.claude/plans/006-design-system.md)                                                 | concluído           |
| 007 | [Catálogo (CRUD `/catalog`)](.claude/plans/007-catalog.md)                                          | concluído           |
| 008 | [Storage locations + stock items (Direito/Esquerdo)](.claude/plans/008-storage-direito-esquerdo.md) | concluído           |
| 009 | [Áreas livres (Fora, Masters, Aditivos)](.claude/plans/009-areas-livres-fora-masters-aditivos.md)   | concluído           |
| 010 | [Kardex](.claude/plans/010-kardex.md)                                                               | concluído           |
| 011 | [Dashboard + busca + regra ≤25kg](.claude/plans/011-dashboard-busca-regra-25kg.md)                  | concluído           |
| 012 | [Planilha Amarela + export Excel](.claude/plans/012-planilha-amarela-export-excel.md)               | concluído           |
| 013 | Migração `legacy/db.json` → Firestore                                                               | pendente            |
| 014 | Deploy GitHub Pages + Actions                                                                       | pendente            |
| 015 | App Check                                                                                           | pendente            |

Roadmap completo em [.claude/architecture.md §12](.claude/architecture.md).

### Estrutura atual do repo

```
inventario-isoforma/
├── .claude/
│   ├── architecture.md            # referência viva
│   └── plans/                     # planos numerados
├── firestore/
│   ├── firestore.rules            # regras de segurança (versionadas)
│   └── firestore.indexes.json
├── legacy/                        # sistema antigo (read-only, referência)
├── scripts/
│   └── set-role.ts                # promove custom claim via Admin SDK
├── src/
│   ├── features/                  # domínios de negócio
│   ├── routes/                    # file-based routing (TanStack Router)
│   └── shared/
│       └── lib/
│           ├── env.ts             # validação das vars de ambiente (zod)
│           └── firebase.ts        # cliente Firebase (auth + firestore)
├── .env.example                   # template de variáveis de ambiente
├── .firebaserc
├── firebase.json                  # configuração CLI + emuladores
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.scripts.json          # tsconfig específico para scripts/
└── vite.config.ts
```

## Diretrizes técnicas (resumo)

A referência completa está em [.claude/architecture.md](.claude/architecture.md).
Pontos que valem reforço aqui porque guiam decisões do dia a dia:

- **Front-only.** Sem backend próprio. Firestore client é a "API" do app.
- **Sem credenciais no repo.** `VITE_FIREBASE_*` via GitHub Actions Secrets.
- **Autorização no servidor.** Custom Claims + regras Firestore estritas
  são a defesa real. `disabled` no input é UX, não segurança.
- **Schema Firestore normalizado.** Nunca voltar ao padrão "1 documento
  com JSON.stringify de tudo". IDs sintéticos no `/catalog`; `stock_items`
  e `/kardex` referenciam por `materialId` + snapshot.
- **TypeScript estrito.** Sem `any` salvo em fronteira justificada.
- **Tailwind via build local.** Não voltar a usar CDN.
- **Comentários:** só para invariantes não-óbvias. Sem narração.
- **Não criar arquivos `.md` de planejamento/análise solto** — usar os
  planos numerados ou conversa direta.
- **Legacy é read-only.** Consulta sim, edição não.

## Comandos npm

| Comando                                       | O que faz                                   |
| --------------------------------------------- | ------------------------------------------- |
| `npm run dev`                                 | Sobe Vite em http://localhost:3001          |
| `npm run build`                               | Build de produção (`dist/`)                 |
| `npm run typecheck`                           | Checa tipos sem emitir                      |
| `npm run lint`                                | ESLint em todo o projeto                    |
| `npm run format`                              | Prettier em todo o projeto                  |
| `npm run emu`                                 | Sobe Firebase Emulator Suite                |
| `npm run rules:deploy`                        | Deploy das regras Firestore no projeto prod |
| `npm run set-role -- <email> <admin\|reader>` | Aplica custom claim via Admin SDK           |

Para `set-role`, exportar `GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json` antes.

## Quando começar uma sessão

1. Ler este `CLAUDE.md`.
2. Ler `.claude/architecture.md` para o estado atual de decisões.
3. Ver na tabela de planos qual é o próximo a executar (ou o que está em
   execução).
4. Se for trabalho novo, propor um plano antes de codar.

## Notas para refinar depois

- Documentar o fluxo de deploy (Plano 014).
- Convenções de commit (padrão tipo `chore:`, `feat:`, `fix:` + `(#NNN)`).
