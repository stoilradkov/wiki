---
name: frontend
description: Frontend application logic rules for the wiki app, covering forms, loading states, errors, toasts, recovery, TanStack Query, accessibility, streaming, SSE, and mutation/query behavior. Use when working on React frontend logic, form flows, loading or error handling, API query hooks, cache updates, optimistic mutations, navigation blockers, or accessibility behavior.
---

# Frontend Skill

## Forms

- All forms: `<Form />` (shadcn/ui) + `react-hook-form` + Zod schema from `@wiki/shared`
- Inline form: 1–3 fields, tied to existing item (rename, add tag). Save on blur/Enter, revert on Escape.
- Dialog form: self-contained create/confirm. Never save on blur — explicit Cancel/Submit only.
- Page view: large content needing extended focus (markdown editor). Never for < 30 seconds.
- Backdrop click cancels dialog only if untouched. Dirty fields: backdrop does nothing — user must Cancel.
- Never close form on mutation failure. Keep open, show inline error.
- Validate on submit, not every keystroke. Never disable submit based on validation state.

## Loading — three levels, never mix

- **Page/route:** layout-accurate skeleton. Never spinner. Sidebar stays interactive.
- **Section/card:** shimmer inside card shell — shell stays, only content shimmers. Use `isFetching && !isLoading` to distinguish background refetch from initial load.
- **Mutation/action:** button disabled + spinner + `opacity: 0.7`. Nothing else locks.
- Skeletons match exact dimensions of replaced content. Vary text line widths 40–90%.
- Pipeline status (SSE): not TanStack Query — use `EventSource` hook, update cache via `setQueryData` directly, close stream on `ready` or `failed`.
- Chat streaming: message bubble appears immediately with blinking cursor. Never lock scroll during streaming.

## Errors — scope matches failure

- **Page error:** replace main content area only (not sidebar). Coral AlertCircle, DM Serif italic heading, retry + "go back" actions.
- **Section error:** inline within section, proportional to space. Small "Retry" link, not full button.
- **Mutation error:** inline below field/button that triggered it. Never a toast.
- Never show raw error messages, stack traces, or HTTP status codes to the user.
- Empty state ≠ error state. Empty = neutral icon + muted text + create CTA. Error = coral AlertCircle + retry/go back.
- 404: navigation state, not error state. "This no longer exists" + back link. No coral, no alert icon.

## Toasts

- Success only, and only when there is no visible place to show it (item deleted, user navigated away).
- Never for: mutation errors, loading states, actions the user already sees confirmed.
- Delete = optimistic remove + toast with Undo (5s window). After 5s, permanent.

## Recovery

- Every error has exactly one obvious recovery action.
- Optimistic mutation failure: revert silently + show inline error explaining the revert.
- Stale state / SSE mismatch: silent `invalidateQueries`. Never prompt page reload unless version mismatch.
- Multi-tab conflict: amber banner with "Reload" and "Keep mine" — never silently overwrite.
- Form with unsaved changes: block navigation. Dialog shake on Escape if dirty. Page form uses Router blocker + inline banner.

## TanStack Query

- `staleTime: 30_000` · `gcTime: 5min` · `retry: 2` (queries) · `retry: 0` (mutations)
- Query keys hierarchical: `['projects']` → `['projects', id]` → `['projects', id, 'documents']`
- After create: invalidate. After optimistic update: setQueryData then invalidate on settle. After SSE update: setQueryData directly, never invalidate whole list.

## Accessibility

- All fields have visible `<label>` via `htmlFor` — never placeholder-only.
- Error messages linked via `aria-describedby`.
- Disabled buttons keep label + `title` explaining why.
- All icon-only buttons have `aria-label`.
- No `tabIndex > 0` anywhere.
