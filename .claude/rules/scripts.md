---
paths:
  - "scripts/**"
  - "tsconfig.scripts.json"
---

# Scripts Node / Admin SDK

- Rodam com `tsx --tsconfig tsconfig.scripts.json` (ES2022, NodeNext,
  top-level `await`). Não importar nada de `src/` que dependa do Vite
  (`import.meta.env`).
- Admin SDK **ignora as regras Firestore** — o script é a única barreira.
- Alvo padrão é **produção** (via `GOOGLE_APPLICATION_CREDENTIALS`). Escrita
  destrutiva exige flag explícita (`--commit`, `--yes`); manter dry-run como
  default em script novo. `--emulator` mira o emulador local.
- Mapeamento legado → schema só em `scripts/lib/legacy.ts` (funções puras,
  compartilhadas por seed e migração). `kardex` nunca é tocado pela migração.
- Nunca executar contra produção sem pedido explícito do usuário.
