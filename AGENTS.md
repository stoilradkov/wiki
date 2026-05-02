# AGENTS.md

## Skills

Read relevant skill before starting any task:

- **Frontend logic** (forms, loading, errors, queries): read `.agents/skills/frontend/SKILL.md`
- **UI / visual** (components, colours, typography, icons): read `.agents/skills/design/SKILL.md`
- **Backend** (routes, repositories, DB, migrations): read `.agents/skills/backend/SKILL.md`

If task touches both frontend and backend, read both skills.

---

## Rules that always apply

### General

- No `any` — ever. No type assertions (`as SomeType`) to silence errors.
- All props interfaces defined in same file as component.
- One component per file — always. Never export more than one component from file.
- Use Tailwind default classes: `p-3.5` not `p-[14px]`, `size-3.75` not `size-[15px]`. Brackets only when Tailwind lacks value.

### Frontend

- shadcn/ui for all UI primitives — never build custom inputs, dialogs, dropdowns, tooltips, selects.
- Mutation hooks: `isPending`. Query hooks: `isLoading`. Never swap them.
- All API calls through TanStack Query hooks — no `fetch()` in components.

### Backend

- No `db` imports outside `repository.ts` files.
- No `process.env` directly — always use the typed `env` object.
- No Zod schemas defined in backend — they live in `@wiki/shared`.
- No manual migration files — use `pnpm db:generate` then `pnpm db:migrate`.
