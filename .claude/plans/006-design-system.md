# Plano 006 — Design system base

Status: **concluído**.

> Insere uma fase de design system antes do Catálogo. Os planos seguintes
> da tabela do CLAUDE.md sobem +1: Catálogo passa a 007, Storage 008,
> Áreas livres 009, Kardex 010, Dashboard 011, Planilha 012, Migração 013,
> Deploy 014, App Check 015.

## Context

O Plano 005 (validação) confirmou que auth + guard + emulator estão
funcionando. Agora, antes do Catálogo, vale estabelecer a **identidade
visual** do app: tokens, tipografia, theme switcher, componentes-base e
os primeiros elementos próprios (header, tabs, badges de rua/fornecedor).

Referência visual: pasta [prints/](../../prints/) (desktop + mobile) +
tokens exatos extraídos do
[legacy/index.html](../../legacy/index.html) (Tailwind v2). Fidelidade
ao **fluxo** do legado; liberdade visual onde melhorar fizer sentido.
**Adicionar é sempre inline (row vazio), nunca modal/dialog.**

Specs do shadcn/Tailwind v4 verificados via Context7 em 2026-05-27.

## Decisões consolidadas

| Item                 | Escolha                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Tipografia           | Inter via Google Fonts                                                                    |
| Lib de componentes   | shadcn/ui (Tailwind v4 oficial)                                                           |
| Core shadcn inicial  | Button, Input, Label, Card, Badge, Tabs, DropdownMenu, Select                             |
| Theme switcher       | Light / Dark / System via `ThemeProvider` próprio (padrão shadcn-Vite, não `next-themes`) |
| Header light vs dark | Header **sempre** `bg-slate-900` (identidade Isoforma). Body adapta ao tema.              |
| Fornecedores         | Hard-coded em `src/shared/lib/suppliers.ts` (HEX fixo, não OKLCH)                         |
| Tokens do sistema    | OKLCH em CSS variables, via `@theme inline` (padrão shadcn Tailwind v4)                   |
| Componentes próprios | Compõem primitivos shadcn quando aplicável (ver tabela abaixo)                            |
| Forms                | Sempre inline. Nada de modal/dialog para adicionar/editar.                                |

## Padrão "componente próprio sobre primitivo headless"

Para cada componente próprio, o padrão é compor o shadcn correspondente
em vez de construir do zero — assim ganhamos a11y/keyboard/focus do
Radix de graça:

| Próprio          | Shadcn por baixo           | Motivo                                                                                                                                             |
| ---------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SupplierSelect` | `Select` (Radix Select)    | Dropdown acessível com keyboard nav                                                                                                                |
| `EmbalBadge`     | `Badge` shadcn             | Variants prontas (`outline`, `secondary`)                                                                                                          |
| `AddRow`         | `Button` (`variant=ghost`) | Estados focus/hover/disabled prontos                                                                                                               |
| `ModeToggle`     | `DropdownMenu` + `Button`  | Dropdown nativo do shadcn                                                                                                                          |
| `Logo`           | — (puramente visual)       | Só SVG/texto, não precisa de comportamento                                                                                                         |
| `RoadBadge`      | — (puramente visual)       | Quadrado preto com letra; sem interação                                                                                                            |
| `SyncIndicator`  | — (puramente visual)       | Bolinha + label; sem interação                                                                                                                     |
| `AppHeader`      | composição                 | Usa `Logo`, `SyncIndicator`, `Button`, `ModeToggle`                                                                                                |
| `AppTabs`        | `Link` do TanStack Router  | Tabs aqui são navegação, não controle de painel. `<Tabs>` shadcn é orientado a painéis controlados; usar links + estado ativo via `useMatchRoute`. |

## Tokens propostos

### Cores do sistema — `src/styles/globals.css` (`@theme inline`)

Padrão shadcn com OKLCH. Variáveis abaixo são personalizadas pra cara
Isoforma (light); versão dark espelhada:

**Light** (`:root`):

```
--background: oklch(0.97 0 0)        /* gray-100 */
--foreground: oklch(0.145 0 0)
--card: oklch(1 0 0)                 /* white */
--card-foreground: oklch(0.145 0 0)
--primary: oklch(0.55 0.20 260)      /* blue-600 vibrante */
--primary-foreground: oklch(0.985 0 0)
--secondary: oklch(0.97 0 0)
--secondary-foreground: oklch(0.205 0 0)
--muted: oklch(0.97 0 0)
--muted-foreground: oklch(0.556 0 0)
--accent: oklch(0.97 0 0)
--accent-foreground: oklch(0.205 0 0)
--destructive: oklch(0.577 0.245 27)
--border: oklch(0.922 0 0)
--input: oklch(0.922 0 0)
--ring: oklch(0.708 0 0)
--radius: 0.75rem                    /* rounded-xl baseline */

/* Tokens Isoforma extras (não-shadcn) */
--header: oklch(0.18 0.03 250)       /* slate-900 — sempre dark, identidade */
--header-foreground: oklch(0.985 0 0)
--success: oklch(0.55 0.18 145)      /* green-600 Isoforma */
--success-foreground: oklch(0.985 0 0)
--warning: oklch(0.75 0.18 75)       /* amber-500 — sincronizando */
--brand-pink: oklch(0.95 0.04 350)   /* bg seção Masters */
--brand-pink-foreground: oklch(0.50 0.20 350)
--brand-purple: oklch(0.95 0.05 295) /* bg seção Aditivos */
--brand-purple-foreground: oklch(0.50 0.22 295)
```

**Dark** (`.dark`):

Body fica escuro; header continua escuro (`--header` igual). Cards
viram cinza-azulado, foreground branco, primary mantém vibração mas com
mais luminância. Valores exatos definidos no globals.css.

### Cores de fornecedor — `src/shared/lib/suppliers.ts` (HEX fixo)

```ts
export const SUPPLIERS = {
  none: { label: "Sem cor", bg: "#ffffff", fg: "#000000" },
  innova: { label: "Innova", bg: "#fca5a5", fg: "#000000" },
  amsty: { label: "AmSty", bg: "#d1d5db", fg: "#000000" },
  braskem: { label: "Braskem", bg: "#3b82f6", fg: "#ffffff" },
  essentia: { label: "Essentia", bg: "#facc15", fg: "#000000" },
  petrocuyo: { label: "Petrocuyo", bg: "#1e40af", fg: "#ffffff" },
  unigel: { label: "Unigel", bg: "#9333ea", fg: "#ffffff" },
  estyrenics: { label: "E.Styrenics", bg: "#16a34a", fg: "#ffffff" },
  masterbatch: { label: "Masterbatch", bg: "#f472b6", fg: "#ffffff" },
} as const;

export type SupplierId = keyof typeof SUPPLIERS;
export const SUPPLIER_IDS = Object.keys(SUPPLIERS) as SupplierId[];
```

HEX fixo porque a paleta dos fornecedores é identidade externa (cor da
marca), não muda com o tema do app.

### Tipografia

- Família: `--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif`
- Labels: `text-xs font-bold uppercase tracking-wider text-muted-foreground`
- KPI grande: `text-4xl font-black tracking-tight`
- Padrão: `text-sm` (cabe melhor no celular)

## Passos de execução

> Execução **passo a passo** — confirmar antes de avançar para o próximo.

### 1. Tipografia — Inter

- `index.html` (raiz): preconnect + link Google Fonts para Inter
  (pesos 400/500/600/700/900).
- `src/styles/globals.css` (a ser criado por shadcn na próx etapa):
  definir `--font-sans` no `@theme inline`.

### 2. Setup shadcn

```
npx shadcn@latest init
```

Respostas:

- Style: **New York** (mais denso, casa com vibe industrial)
- Base color: **Slate** (compatível com paleta legado)
- CSS variables: **Yes**
- Import alias for components: `@/shared/components`
- Import alias for utils: `@/shared/lib/utils`
- React Server Components: **No** (Vite)
- `components.json` é criado na raiz.
- `globals.css` é (re)escrito pelo shadcn com a base — vamos sobrescrever
  os tokens no passo seguinte.

### 3. Tokens em `src/styles/globals.css`

- Substituir cores padrão shadcn pelos tokens Isoforma (§Tokens propostos)
  no bloco `@theme inline`, `:root` (light) e `.dark`.
- Adicionar tokens **extras Isoforma** (`--header`, `--header-foreground`,
  `--success`, `--warning`, `--brand-pink`, `--brand-purple` etc.)
  declarando-os no `@theme inline` para serem consumíveis como classes
  Tailwind (`bg-header`, `text-success`, etc.).
- Garantir `@custom-variant dark (&:is(.dark *));` no topo (padrão
  shadcn v4) para que `dark:` funcione com a estratégia `.dark` no
  `<html>`.

### 4. Fornecedores — `src/shared/lib/suppliers.ts`

Criar o arquivo conforme spec na seção "Cores de fornecedor".

### 5. shadcn core inicial (via CLI)

```
npx shadcn@latest add button input label card badge tabs dropdown-menu select
```

Cada componente vira um arquivo em `src/shared/components/ui/`.

Notas:

- `dropdown-menu` é necessário pro `ModeToggle`.
- `select` (Radix Select) já entra agora porque o `SupplierSelect`
  depende dele. Mas o **Combobox** com busca (necessário no Catálogo)
  fica para o Plano 007.
- `tabs` shadcn não será usado no `AppTabs` (vai ser link-based); mas
  é útil ter no core para painéis de detalhe no futuro.

### 6. Theme switcher — `src/features/theme/`

Padrão oficial shadcn-Vite (confirmado na doc):

#### 6.1 `theme-provider.tsx`

`ThemeProvider` em React Context que:

- Lê tema persistido em `localStorage` (`inventario-theme`).
- Aplica `.light` ou `.dark` em `document.documentElement`.
- Para `theme === "system"`, escuta `prefers-color-scheme` e aplica
  dinamicamente.
- Expõe `useTheme()` com `theme` e `setTheme`.

Código baseado no template oficial da doc shadcn (`/docs/dark-mode/vite`).

#### 6.2 `ModeToggle.tsx`

Botão `<DropdownMenu>` com ícone Sun/Moon (lucide), opções Light/Dark/
System. Vai no header.

#### 6.3 Wrap em `src/main.tsx`

```tsx
<ThemeProvider defaultTheme="system" storageKey="inventario-theme">
  <AuthProvider>
    <InnerRouter />
  </AuthProvider>
</ThemeProvider>
```

### 7. Componentes próprios — `src/shared/components/`

#### 7.1 `Logo.tsx`

Lucide `Box` em verde (`text-success`) + wordmark "**iso**forma" (verde

- foreground) com subtexto "INVENTÁRIO" (`text-xs tracking-widest`).
  Variante `compact` (só ícone) para mobile.

#### 7.2 `RoadBadge.tsx`

Quadrado `bg-slate-900 dark:bg-slate-950 text-white w-12 h-12 rounded-lg
text-xl font-bold flex items-center justify-center`. Prop: `letter`.

#### 7.3 `SupplierSelect.tsx`

Wrapper de `<Select>` (shadcn):

- `<SelectTrigger>` com background = `SUPPLIERS[value].bg` e texto =
  `.fg` (inline style — tokens são HEX, não viram classes Tailwind).
- `<SelectContent>` com `<SelectItem>` para cada fornecedor, cada
  item mostra um quadradinho de cor + label.

#### 7.4 `EmbalBadge.tsx`

Wrapper de `<Badge variant="outline">`: tamanho menor (`text-[10px]
px-2 py-0.5`), uppercase. Mostra "SC" ou "BB".

#### 7.5 `SyncIndicator.tsx`

Bolinha + label. Props: `status: "online" | "syncing" | "offline"`.

- online: `bg-success`, label "NUVEM ATIVA"
- syncing: `bg-warning animate-pulse`, label "SINCRONIZANDO…"
- offline: `bg-muted-foreground`, label "OFFLINE"

Status estático `"online"` por enquanto; integra com Firestore
connection state em Plano 007 ou 008.

#### 7.6 `AppHeader.tsx`

Layout:

- Desktop (1 linha): `[Logo] [SyncIndicator] ... [ModeToggle] [DisplayName] [Sair]`
- Mobile (2 linhas): linha 1 `[Logo compact] [Sync]`, linha 2
  `[ModeToggle] [DisplayName] [Sair]`.

Background: `bg-header text-header-foreground` (sempre dark — não
inverte no tema light).

#### 7.7 `AppTabs.tsx`

Navegação principal. Lista fixa:

| Tab           | Rota        | Ícone Lucide   |
| ------------- | ----------- | -------------- |
| Painel        | `/`         | `BarChart3`    |
| Lado Direito  | `/direito`  | `Menu`         |
| Lado Esquerdo | `/esquerdo` | `Menu`         |
| Fora do Local | `/fora`     | `MapPin`       |
| Masters       | `/masters`  | `Droplet`      |
| Aditivos      | `/aditivos` | `FlaskConical` |
| Kardex        | `/kardex`   | `Clipboard`    |
| Planilha      | `/planilha` | `LayoutGrid`   |

- Renderiza `<Link>` do TanStack Router pra cada tab.
- Estado ativo via `useMatchRoute` ou prop `activeProps` do Link.
- Desktop: linha horizontal, ativo com underline + cor primária.
- Mobile: scroll horizontal com snap.

#### 7.8 `AddRow.tsx`

Wrapper de `<Button variant="ghost">` com classes adicionais
`border-2 border-dashed rounded-xl w-full py-3 gap-2`.

Variantes (via prop):

- neutral: `border-border text-muted-foreground hover:bg-muted`
- masters: `border-brand-pink-foreground/30 text-brand-pink-foreground`
- aditivos: `border-brand-purple-foreground/30 text-brand-purple-foreground`

### 8. Rotas placeholder

Pra tabs não darem 404, criar uma rota por aba em `src/routes/_app/`:
`direito.tsx`, `esquerdo.tsx`, `fora.tsx`, `masters.tsx`, `aditivos.tsx`,
`kardex.tsx`, `planilha.tsx`.

Cada uma renderiza `<EmConstrucao label="Lado Direito (plano 008)" />`
— componente em `src/shared/components/EmConstrucao.tsx` mostrando o
nome da feature + número do plano que vai implementar. Some quando a
feature real chegar.

### 9. Login — `src/routes/login.tsx`

Aplicar o visual do print:

- Fundo: `bg-header` cobrindo a tela toda.
- Card centralizado: `<Card>` shadcn com `max-w-sm`.
- Detalhe verde no topo: `border-t-4 border-success` no Card.
- Logo dentro do card (vertical: Box verde + wordmark + label
  "INVENTÁRIO").
- Labels em uppercase usando `<Label>` shadcn.
- Inputs com `<Input>` shadcn.
- Botão "ENTRAR NO SISTEMA" full-width: `<Button>` primary.
- Mantém handler de erro existente.

### 10. `_app.tsx`

- `<AppHeader />` no topo.
- `<AppTabs />` logo abaixo.
- `<main className="bg-background min-h-[calc(100vh-...)]">` envolvendo
  o `<Outlet />`.

### 11. `_app/index.tsx` (Dashboard mockado)

Para validar a vibe visual final sem feature real:

- 3 cards de KPI (Stock total, Volume de paletes, Tipos de item) com
  valores mockados (`1.710.450 kg`, `1183 paletes`, `36 itens`); o
  terceiro destacado em `bg-primary text-primary-foreground`.
- Card "Localizar Material no Estoque" com `<Select>` shadcn vazio
  (placeholder "-- Vazia --").
- Card "Posição de Resinas Padrão" com placeholders simulando 2
  colunas de cards de material.

Mockado de propósito; o plano de Dashboard (renumerado 011) substitui
por agregações reais do Firestore.

### 12. Atualizar `.claude/architecture.md`

Adicionar **§13 Design system**:

- Stack: shadcn/ui + Tailwind v4 + Inter + Radix (via shadcn).
- Tokens (cores, tipografia, raios).
- Theme switcher (Light/Dark/System); regra "header sempre dark".
- Catálogo de componentes próprios com tabela "próprio → shadcn por
  baixo" (a tabela §"Padrão" deste plano).
- Padrão UX: forms inline (nunca modal), fluxo legado preservado,
  fidelidade visual com liberdade de melhoria.
- Link para a pasta `prints/` como ground truth.

Renumerar §12 (Roadmap): 006 → Design system, 007 → Catálogo, ...

### 13. Atualizar `CLAUDE.md`

- Marcar Plano 005 como **concluído**.
- Inserir linha "006 — Design system" e renumerar restantes (007 →
  Catálogo, 008 → Storage, ..., 015 → App Check).

### 14. Commit

```
git add -A
git commit -m "feat(design): tokens, shadcn core, theme switcher e shells (header/tabs/login/dashboard) (#006)"
```

## Arquivos criados / modificados

```
index.html                                       (modificado — preconnect Inter)
src/styles/globals.css                           (reescrito — tokens shadcn + Isoforma)
components.json                                  (novo — shadcn config)
src/shared/lib/suppliers.ts                      (novo)
src/shared/lib/utils.ts                          (modificado — alinhar com shadcn cn())
src/shared/components/ui/{button,input,label,card,badge,tabs,dropdown-menu,select}.tsx (novos — shadcn)
src/features/theme/theme-provider.tsx            (novo)
src/features/theme/ModeToggle.tsx                (novo)
src/shared/components/Logo.tsx                   (novo)
src/shared/components/RoadBadge.tsx              (novo)
src/shared/components/SupplierSelect.tsx         (novo)
src/shared/components/EmbalBadge.tsx             (novo)
src/shared/components/SyncIndicator.tsx          (novo)
src/shared/components/AppHeader.tsx              (novo)
src/shared/components/AppTabs.tsx                (novo)
src/shared/components/AddRow.tsx                 (novo)
src/shared/components/EmConstrucao.tsx           (novo)
src/routes/_app/{direito,esquerdo,fora,masters,aditivos,kardex,planilha}.tsx (novos — placeholders)
src/routes/login.tsx                             (modificado — visual)
src/routes/_app.tsx                              (modificado — AppHeader + AppTabs)
src/routes/_app/index.tsx                        (modificado — dashboard mockado)
src/main.tsx                                     (modificado — wrap ThemeProvider)
.claude/architecture.md                          (modificado — §13 + §12 renumerado)
CLAUDE.md                                        (modificado — tabela renumerada, 005 concluído)
package.json / package-lock.json                 (modificado — shadcn deps)
```

## Verificação end-to-end

Com `npm run emu` + `npm run dev`:

1. `npm run typecheck` passa.
2. `npm run lint` passa.
3. `npm run build` passa, gera `dist/` sem erros.
4. **Login** (`/login`, deslogado):
   - Bate com [prints/desktop-login.png](../../prints/desktop-login.png) e
     [prints/mobile-login.png](../../prints/mobile-login.png).
   - Fundo dark, card branco com detalhe verde no topo.
5. **Dashboard** (`/` autenticado):
   - Header dark com Logo + "NUVEM ATIVA" + ModeToggle + displayName +
     Sair. Bate com [prints/desktop-dashboard.png](../../prints/desktop-dashboard.png).
   - Tabs com 8 itens, "Painel" ativo.
   - 3 cards KPI, terceiro em azul.
6. **Theme switcher**:
   - ModeToggle → Dark: body fica dark, header continua dark (com
     pequeno ajuste tonal). Cards viram dark, texto fica light.
   - ModeToggle → Light: body claro, header dark.
   - ModeToggle → System: respeita `prefers-color-scheme`.
   - Recarregar página: tema persiste (lê do localStorage).
7. **Mobile** (375px):
   - Login adapta. Dashboard com tabs em scroll horizontal, KPIs
     empilhados.
8. **Navegação**:
   - Clicar tabs Lado Direito, Masters, etc. → mostra placeholder
     "em construção".
9. **Acessibilidade rápida**:
   - Tab navega pelos inputs do Login.
   - `Esc` fecha o dropdown do ModeToggle.
   - Dropdown navegável por seta ↓/↑.
10. **Sanity de tokens**:
    - DevTools → Computed → confirma `--primary`, `--header`, `--font-sans`
      aplicados. Em dark mode, `--background` muda mas `--header` não.

## Não-objetivos (explícitos)

- Qualquer feature de domínio (catálogo, storage, kardex) — apenas
  cascas visuais.
- Conectar `SyncIndicator` ao Firestore real — fica para o Plano 007.
- Combobox de busca (Select com search) — Plano 007 (Catálogo) adiciona
  `command` do shadcn quando precisar.
- Modais/dialogs — fora de escopo.
- Testes automatizados — plano dedicado depois.
- App Check — Plano 015.

## Próximos planos (renumerados)

- 007 — Catálogo (CRUD `/catalog`) — primeiro Firestore real, adiciona
  Combobox shadcn (`command` + `popover`).
- 008 — Storage locations + stock items.
- 009 — Áreas livres.
- 010 — Kardex.
- 011 — Dashboard com agregações reais.
- 012 — Planilha Amarela + export Excel.
- 013 — Migração legacy → Firestore.
- 014 — Deploy GitHub Pages + Actions.
- 015 — App Check.
