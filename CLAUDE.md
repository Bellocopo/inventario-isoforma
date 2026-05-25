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

| #   | Plano                                                                                             | Status                        |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| 001 | [Arquitetura inicial e modelo de dados](.claude/plans/001-initial-architecture-and-data-model.md) | concluído (só docs)           |
| 002 | [Bootstrap do projeto](.claude/plans/002-bootstrap-project.md)                                    | aprovado, aguardando execução |
| 003 | Firebase setup (env, regras, custom claims, set-role)                                             | pendente                      |
| 004 | Auth (login real, guard de rotas)                                                                 | pendente                      |
| 005 | Catálogo (CRUD `/catalog`)                                                                        | pendente                      |
| 006 | Storage locations + stock items (Direito/Esquerdo)                                                | pendente                      |
| 007 | Áreas livres (Fora, Masters, Aditivos)                                                            | pendente                      |
| 008 | Kardex                                                                                            | pendente                      |
| 009 | Dashboard + busca + regra ≤25kg                                                                   | pendente                      |
| 010 | Planilha Amarela + export Excel                                                                   | pendente                      |
| 011 | Migração `legacy/db.json` → Firestore                                                             | pendente                      |
| 012 | Deploy GitHub Pages + Actions                                                                     | pendente                      |
| 013 | App Check                                                                                         | pendente                      |

Roadmap completo em [.claude/architecture.md §12](.claude/architecture.md).

### Estrutura atual do repo

```
inventario-isoforma/
├── .claude/
│   ├── architecture.md            # referência viva
│   └── plans/                     # planos numerados
├── legacy/                        # sistema antigo (read-only, referência)
│   ├── index.html
│   ├── db.json
│   ├── *.json                     # dumps das coleções legadas
│   └── Manual_de_Funcionamento_Inventario_Isoforma.pdf
├── CLAUDE.md                      # este arquivo
└── .git/
```

A árvore do projeto novo (`src/`, `package.json`, etc.) ainda não existe —
nasce com o Plano 002.

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

## Quando começar uma sessão

1. Ler este `CLAUDE.md`.
2. Ler `.claude/architecture.md` para o estado atual de decisões.
3. Ver na tabela de planos qual é o próximo a executar (ou o que está em
   execução).
4. Se for trabalho novo, propor um plano antes de codar.

## Notas para refinar depois

- Adicionar lista de comandos npm comuns assim que o Plano 002 rodar
  (`npm run dev`, `npm run lint`, etc.).
- Documentar o fluxo de promover usuário a admin (Plano 003).
- Documentar o fluxo de deploy (Plano 012).
- Convenções de commit (padrão tipo `chore:`, `feat:`, `fix:` + `(#NNN)`).
