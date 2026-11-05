# CLAUDE.md — Inventário Isoforma

Reescrita do sistema de inventário físico da Isoforma (resinas, masters e
aditivos por rua/área do galpão). React + Vite + TypeScript, Firestore como
"API", deploy estático no GitHub Pages em https://inventario.isoforma.com.br.

## Documentação: viva × efêmera

| O quê                                        | Onde                                               | Versionado           |
| -------------------------------------------- | -------------------------------------------------- | -------------------- |
| Decisões transversais (stack, dados, regras) | [.claude/architecture.md](.claude/architecture.md) | sim — viva           |
| Setup, comandos, deploy, operação            | [README.md](README.md)                             | sim — viva           |
| Como trabalhamos (este arquivo)              | `CLAUDE.md` + [.claude/rules/](.claude/rules/)     | sim — viva           |
| Planos de trabalho                           | `.claude/plans/<slug>.md`                          | **não** (gitignored) |

- A doc viva descreve **o sistema como ele é hoje**. Nada de "no plano X
  decidimos…" — histórico é o git.
- **Planos são efêmeros:** fotos de um trabalho em andamento, não
  referência. Não vão para o git e são apagados ao concluir.
- Antes de começar algo, ler `architecture.md`. Na dúvida entre doc e
  código, **o código vence** — e a doc é corrigida.

## Fluxo de trabalho

1. **Mudança não-trivial começa por um plano** em `.claude/plans/<slug>.md`
   (slug em kebab-case, sem numeração). Discutido e aprovado antes de codar.
   Plano grande demais → quebrar em vários.
2. **Escolha não-trivial: perguntar** com `AskUserQuestion` (2–4 opções,
   recomendação clara). Escolha trivial (nome de variável local, `^` vs `~`):
   seguir sem perguntar.
3. **Execução passo a passo:** o usuário indica o passo; executar só ele e
   parar. Não encadear passos sem autorização explícita.
4. **Fechar o plano:** levar para `architecture.md`/`README.md` o que mudou
   no sistema (no mesmo commit da mudança), conferir que a doc viva bate com
   o código e **apagar o arquivo do plano**.

Seções de um plano: `Status` (rascunho | aprovado | em execução), Contexto,
Decisões (tabela das escolhas confirmadas), Passos numerados, Arquivos
tocados, Verificação, Não-objetivos.

## Comunicação

- Português (BR/PT mesclado), sem formalismo, direto. Updates curtos.
- Referências a código como link markdown clicável:
  `[arquivo.ts:42](caminho/arquivo.ts#L42)`.
- Resumo final: uma ou duas frases — o que mudou e o próximo passo.

## Diretrizes técnicas

Detalhes em [architecture.md](.claude/architecture.md); aqui só o que guia
decisão do dia a dia:

- **Front-only.** Sem backend próprio; o client Firestore é a API.
- **Autorização no servidor.** Custom Claims + [firestore.rules](firestore/firestore.rules).
  `disabled` em input é UX, não segurança.
- **Schema normalizado.** Nunca voltar a "1 documento com JSON de tudo".
  Referência a material = `materialId` + snapshot.
- **Sem credenciais no repo.** `VITE_FIREBASE_*` só em `.env.local` e nos
  secrets do GitHub.
- **TypeScript estrito.** Sem `any` salvo em fronteira justificada.
- **Tailwind via build local.** Nunca CDN.
- **Comentários** só para invariantes não-óbvias.
- **Não criar `.md` soltos** de análise/planejamento — usar plano ou conversa.
- **`legacy/` é read-only** e só existe localmente (gitignored).
- Remover `.gitkeep` quando o diretório ganhar arquivos reais.
- Antes de usar API de lib, conferir a versão em `package.json` e a doc
  dessa versão (Context7).

## Comandos

| Comando                              | O que faz                                           |
| ------------------------------------ | --------------------------------------------------- |
| `npm run dev`                        | Vite em http://localhost:3001                       |
| `npm run typecheck` / `npm run lint` | Checagens — rodar ao fim de cada passo com código   |
| `npm run build`                      | Build de produção (`dist/`)                         |
| `npm run format`                     | Prettier em tudo                                    |
| `npm run emu`                        | Emuladores + seed automático                        |
| `npm run rules:deploy`               | Deploy de regras e índices Firestore (**produção**) |
| `npm run users -- <cmd>`             | CLI de usuários e roles (**produção** por padrão)   |
| `npm run set-role -- <email> <role>` | Aplica custom claim                                 |
| `npm run migrate`                    | Legado → Firestore (dry-run por padrão)             |

Comandos que tocam produção (`rules:deploy`, `users`, `set-role`, `migrate
--commit`) só rodam com pedido explícito do usuário. Exigem
`GOOGLE_APPLICATION_CREDENTIALS=secrets/service-account.json`. Não há testes
automatizados.

## Mapa rápido

- `src/routes/` — rotas file-based (`_app/` = abas autenticadas;
  `routeTree.gen.ts` é gerado).
- `src/features/<domínio>/` — lógica por feature (`types.ts`,
  `firestore.ts`, `use*.ts`, componentes).
- `src/shared/` — componentes (shadcn em `components/ui/`), hooks, lib, stores.
- `firestore/` — regras e índices versionados.
- `scripts/` — Node + Admin SDK (migração, seed, usuários).
