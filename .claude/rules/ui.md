---
paths:
  - "src/**/*.tsx"
  - "src/styles/**"
---

# UI e design system

Referência: [.claude/architecture.md §11](../architecture.md) e `prints/`.

- Primitivos shadcn ficam em `src/shared/components/ui/` (gerados pelo
  shadcn CLI, `components.json`). Componente próprio **compõe** o primitivo
  em vez de reimplementar.
- Cores só por token (`bg-primary`, `bg-header`, `bg-brand-pink`, …) de
  `src/styles/globals.css`. Exceção: cores de fornecedor em
  `src/shared/lib/suppliers.ts`. Token novo → registrar em `architecture.md §11`.
- Header sempre escuro (`bg-header`), não inverte com o tema.
- Forms sempre inline (`AddRow`); nunca modal para adicionar/editar.
- Campos editáveis `disabled` quando `role !== "admin"` (UX; a segurança é
  nas regras).
- Mobile-first: conferir layout em largura de celular.
- Fidelidade ao fluxo do legado: mesmas abas, ordem e terminologia.
