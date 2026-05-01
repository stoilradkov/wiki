# wiki — Frontend Interaction Patterns

**Version 1.0 · Frontend Engineering Reference**

---

## 1. Philosophy

Every interaction pattern in this document exists to answer one question: _what does the user need to know right now, and what can we quietly handle for them?_

The app deals with async pipelines, LLM calls that can take several seconds, background workers, and operations that can partially fail. The frontend's job is to absorb that complexity and present a surface that feels responsive and trustworthy — not one that constantly exposes its own internal machinery.

Three rules govern everything:

**Optimism where safe, honesty where not.** Mutations that are cheap and reversible (renaming a project, editing a tag) can be applied optimistically before the server confirms. Mutations that are expensive, irreversible, or pipeline-triggering (submitting a document, triggering reprocess) must wait for server confirmation before updating state.

**Errors belong at the scope of what failed.** A chunk of the UI that failed to load should show an error — not the whole page. A mutation that failed should show an inline message near where the action happened — not a toast that disappears in 3 seconds.

**Recovery is always one obvious action.** Every error state has a single, clearly labelled recovery path. The user should never have to figure out what went wrong or how to fix it.

---

## 2. Forms: Inline vs Dialog vs Page

**General rules:**

- Always use `react-hook-form` for handling forms, never use plain react state and custom handling
- Include all required properties for the entity being created in the form

The core question is: _how much context does the user need to fill this in, and how disruptive would losing their current view be?_

### Inline form

Use when the form is short (1–3 fields), strongly tied to an existing item in the list, and does not require explanation or context switching.

**Characteristics:**

- Replaces the item in place — the card or row transforms into an editable state
- Saves on blur or on explicit confirm (Enter / ✓ button)
- Cancelled with Escape — item reverts to display state
- No submit button visible until the field has been changed
- Error appears inline, directly below the field

**When to use in wiki:**

- Renaming a project (click the project name → it becomes an input in place)
- Renaming a document
- Editing a single tag
- Adding a tag to a document (small input that appears at the end of the tag list)

**Never use inline form for:** multi-field forms, forms with file inputs, forms with conditional fields, or any form where the user needs to read adjacent content to fill it in.

---

### Dialog / modal form

Use when the form is self-contained, requires the user's full attention, and does not benefit from seeing the content behind it.

**Characteristics:**

- Opens over the current view — background is dimmed but still visible
- Has a clear title (DM Serif Display, modal heading)
- Has explicit Cancel and Submit buttons — never saves on blur
- Closing the dialog (Escape, backdrop click, Cancel) discards all input
- Submit button is disabled until the minimum required fields are valid
- Errors appear inline below the relevant field, not as a modal-level alert unless the entire submission failed

**When to use in wiki:**

- Creating a new project (name, colour dot, optional description)
- Creating a new document — paste input + project selector + review mode toggle
- Confirming a destructive action (delete project, delete document) — these are always dialogs, never inline

**Dialog sizing:**

- Narrow (420px): single-field confirmations, simple rename with extra options
- Standard (560px): most creation forms — new project, new document
- Wide (720px): forms with a large textarea (paste input), or side-by-side preview

**Backdrop behaviour:** clicking the backdrop cancels the dialog only if the form is empty or unmodified. If the user has started filling in fields, clicking the backdrop does nothing — they must use Cancel or Escape explicitly. This prevents accidental data loss.

**Transition:** dialog enters with a 180ms ease-out scale from 0.96 → 1.0 and opacity 0 → 1. Exits at 120ms. The backdrop fades in at 150ms. Never use slide-in or elaborate keyframe sequences — the dialog should feel like it appeared, not flew in.

---

### Separate view / page form

Use when the form is complex enough that it competes with the surrounding page, or when the content being created is large and the user may spend significant time on it.

**Characteristics:**

- Navigates away from the current view entirely (React Router push)
- Has its own page title and topbar context
- Can be left and returned to (draft state is persisted locally via component state or URL params)
- Submit navigates to the created/edited resource on success

**When to use in wiki:**

- The markdown review/edit step after paste — this is its own focused editing environment, not a modal
- Settings (future) — project-level settings, global preferences

**Never use a full page form for:** anything that takes fewer than 30 seconds to complete. If it fits in a dialog, use a dialog.

---

### Decision table

| Situation                  | Form type      | Reason                                        |
| -------------------------- | -------------- | --------------------------------------------- |
| Renaming a project         | Inline         | 1 field, tied to the item, non-disruptive     |
| Adding a tag               | Inline         | 1 field, contextual                           |
| Creating a new project     | Dialog (560px) | 2–3 fields, self-contained                    |
| Pasting a new document     | Dialog (720px) | Large textarea + options                      |
| Confirming delete          | Dialog (420px) | Destructive, needs explicit intent            |
| Reviewing/editing markdown | Page view      | Large content, extended focus time            |
| Reprocessing a document    | Inline confirm | Single action with confirm + optional options |

---

## 3. Loading States

Loading states exist on three levels. The level determines what you show and how much of the UI you reserve for the skeleton.

### Level 1 — Page / route level

Triggered when navigating to a new route and the primary data for that page is not yet available.

**What to show:** a full-page skeleton that matches the layout of the loaded state. Sidebar stays rendered and interactive (it has its own data). Only the main content area skeletons.

**For the projects dashboard:** skeleton stat cards (4 grey blocks, same dimensions) + skeleton project grid (4 skeleton cards).

**For a project detail view:** skeleton document list — 3–5 skeleton document card rows.

**Implementation with TanStack Query:**

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["project", projectId, "documents"],
  queryFn: () => fetchDocuments(projectId)
});

if (isLoading) return <DocumentListSkeleton count={5} />;
```

Never show a spinner for page-level loads. Spinners indicate an indeterminate wait — skeletons indicate that content is coming and here is where it will go. Skeletons reduce perceived wait time and prevent layout shift.

---

### Level 2 — Section / card level

Triggered when a subsection of the page refreshes independently — for example, the metadata panel in the document detail view reloading after a reprocess, or the entity list refreshing after extraction completes.

**What to show:** a shimmer overlay on the section, or shimmer placeholder rows in place of the list. The rest of the page stays fully interactive.

**Do not:** replace the entire card with a spinner. The card shell (border, header) stays in place. Only the content inside shimmers.

```tsx
// The card structure stays, only content switches
<div className="metadata-panel">
  <PanelHeader title="Entities" />
  {isRefetching ? <EntityListSkeleton count={3} /> : <EntityList entities={data.entities} />}
</div>
```

**Background refetch:** TanStack Query refetches on window focus by default. Do not show any loading indicator for background refetches unless they take more than 2 seconds. Use `isFetching && !isLoading` to distinguish background refetch from initial load, and only show a subtle indicator (a thin 2px amber line at the top of the section, `position: absolute; top: 0`) for prolonged background activity.

---

### Level 3 — Mutation / action level

Triggered when the user takes an action — submitting a form, clicking Reprocess, clicking Delete.

**What to show:** the button that triggered the action enters a loading state — disabled, spinner icon replacing leading icon or appended after label, reduced opacity (0.7). The rest of the form/view stays interactive.

Never lock the entire page or show a full-screen overlay for a mutation. The scope of the loading indicator matches the scope of the action.

```tsx
<button
  onClick={handleReprocess}
  disabled={isPending}
  className={isPending ? "btn-ghost btn-loading" : "btn-ghost"}
>
  {isPending ? (
    <>
      <SpinnerIcon size={13} /> Reprocessing…
    </>
  ) : (
    <>
      <RefreshIcon size={13} /> Reprocess
    </>
  )}
</button>
```

**Optimistic mutations (inline rename):**
Apply the update to the local state immediately. No loading indicator is shown. If the mutation fails, revert the local state and show an inline error. The user should not notice the server round-trip for fast, cheap operations.

```tsx
const mutation = useMutation({
  mutationFn: renameProject,
  onMutate: async (newName) => {
    // cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["projects"] });
    // snapshot previous value
    const previous = queryClient.getQueryData(["projects"]);
    // optimistically update
    queryClient.setQueryData(["projects"], (old) =>
      old.map((p) => (p.id === projectId ? { ...p, name: newName } : p))
    );
    return { previous };
  },
  onError: (err, newName, context) => {
    // revert on failure
    queryClient.setQueryData(["projects"], context.previous);
    setInlineError("Could not rename project. Try again.");
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }
});
```

---

### Pipeline-specific loading

Document ingestion is not a standard async request — it is a multi-stage background pipeline. It gets its own loading treatment.

**While any stage is active** (`status = processing`):

- Document card shows the stage progress bar (6 pips)
- The active pip pulses in amber
- The badge shows `processing` in amber
- The card is not interactive — no edit, no delete (buttons are present but disabled with a tooltip "Processing in progress")

**SSE subscription:** the frontend subscribes to a server-sent event stream per document ID for real-time status updates during ingestion. TanStack Query is not used for this — use a lightweight hook that manages the `EventSource` lifecycle:

```tsx
function useDocumentStatus(documentId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource(`/api/documents/${documentId}/status`);

    es.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // update the document in query cache directly
      queryClient.setQueryData(["document", documentId], (old: Document) => ({
        ...old,
        ...update
      }));
      // close the stream when terminal state reached
      if (update.status === "ready" || update.status === "failed") {
        es.close();
      }
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [documentId]);
}
```

**Chat streaming:** LLM responses stream token by token via SSE. The assistant message appears immediately as an empty bubble with a blinking cursor. Tokens append to the message content as they arrive. The user can scroll up to read earlier messages while the response is still streaming — do not lock scroll.

---

### Skeleton design rules

- Skeleton shapes must match the exact dimensions and layout of the content they represent
- Use the shimmer animation (see design guidelines §8) — not a solid grey block, not a pulsing opacity
- Skeleton text lines: vary width between 40–90% of the container to look natural (not all the same length)
- Never show more than one level of skeleton at a time — if the page is loading, don't also show card-level skeletons inside the page skeleton
- Minimum skeleton display time: none. Show real content the moment it's ready, even if the skeleton only showed for 200ms. Do not artificially delay to "smooth" the transition — it feels patronising.

---

## 4. Error States

### Taxonomy of errors

Not all errors are equal. Before deciding what to show, classify the error:

| Type               | Example                         | Recoverable? | User action needed? |
| ------------------ | ------------------------------- | ------------ | ------------------- |
| Network error      | fetch failed, timeout           | Yes          | Retry               |
| Server error (5xx) | API returned 500                | Sometimes    | Retry, report       |
| Validation error   | field too short, invalid format | Yes          | Fix input           |
| Not found (404)    | document deleted externally     | No           | Navigate away       |
| Pipeline failure   | Gemini extraction failed        | Yes          | Retry / reprocess   |
| Conflict           | document edited in another tab  | Yes          | Reload              |
| Auth (future)      | session expired                 | Yes          | Re-authenticate     |

### Level 1 — Page-level error

Triggered when the primary data fetch for a route fails entirely and nothing can be shown.

**What to show:** replace the main content area (not the sidebar) with a centred error state:

- Coral `AlertCircle` icon, 32px
- DM Serif Display italic heading: _"Something went wrong"_
- Muted body text with the specific reason if safe to show (e.g., "Could not load project documents")
- Single primary recovery action: "Try again" button that calls `refetch()`
- Secondary ghost link: "Go back to projects" — never leave the user stranded

```tsx
if (isError) {
  return (
    <PageError message="Could not load documents for this project" onRetry={() => refetch()} />
  );
}
```

**Never** show a raw error message, stack trace, or HTTP status code to the user. Log these to the console for debugging.

---

### Level 2 — Section-level error

Triggered when a subsection fails to load but the rest of the page is fine.

**What to show:** the section container shows an error state in place of its content. The error state is proportional — it fills the space the content would have occupied. It includes a brief message and a small "Retry" link (not a full button).

```tsx
// Metadata panel fails to load entities
<div className="entity-panel">
  <PanelHeader title="Entities" />
  {isError ? (
    <SectionError message="Could not load entities" onRetry={refetch} />
  ) : (
    <EntityList entities={data} />
  )}
</div>
```

The rest of the document detail view (markdown editor, summary, pipeline status) continues to work. The error is scoped.

---

### Level 3 — Inline mutation error

Triggered when a user-initiated mutation fails — renaming fails, reprocess request rejected, tag addition fails.

**What to show:** a small error message appears directly below the field or button that triggered the action. The form remains open and editable — never close the form on mutation failure.

```tsx
// Below the rename input
{
  renameError && <p className="field-error">Could not rename. {renameError.message}</p>;
}
```

For optimistic mutations that fail: revert the UI silently and show the inline error. The user sees their change snap back — this is intentional and correct. Add a brief explanation: _"Name reverted — could not save. Try again."_

**Toasts are not used for mutation errors.** Toasts disappear. Errors need to be persistent until the user has resolved them or explicitly dismissed them. Toasts are reserved only for success confirmations of non-obvious background operations (see §5).

---

### Validation errors

Validation runs in two passes: client-side on submit attempt, server-side on submission.

**Client-side:** validate on submit, not on every keystroke. Show errors below each invalid field. Focus the first invalid field. Do not disable the submit button based on validation state — let the user try to submit and then show what needs fixing. (Exception: the submit button is disabled during a pending mutation.)

**Server-side:** if the server returns a 422 with field-level errors, map them to the same inline field error pattern. If the server returns a general error, show it above the submit button in a coral-tinted error block (not a toast, not a modal):

```tsx
{
  submitError && (
    <div className="form-error-banner">
      <AlertIcon size={13} />
      {submitError.message}
    </div>
  );
}
```

---

### Pipeline errors (document ingestion)

When a document's ingestion pipeline fails, the error is surfaced at the document card level and the document detail view — not as a notification.

**Document card (failed state):**

- Left border accent: 3px solid `--coral`
- Badge: `failed` in coral
- Stage bar: pips up to the failed stage are filled (accent), the failed pip is coral, remaining pips are empty
- Below the stage bar: short error summary in DM Mono, 10px, coral — e.g., `extraction failed · retry available`
- Retry button: ghost style, coral text — "Retry pipeline"

**Document detail view (failed state):**

- Amber (or coral) banner across the top of the view
- Banner content: stage that failed, human-readable error message, Retry button
- Whatever was successfully completed before failure is still shown and accessible — markdown is displayed, chunks are searchable if they were stored

---

### Not found (404)

When a document or project that the user navigates to no longer exists (deleted in another tab, or stale link):

- Show a centred empty state in the main content area
- DM Serif Display italic: _"This document no longer exists"_
- Single action: "Back to [project name]" or "Back to projects"
- Do not show an error — this is not an error state, it is a navigation state

---

### Empty states vs error states

These must look visually distinct. Empty states are neutral (muted icon, faint text). Error states use coral accents and an alert icon. A user who sees an empty state should feel like there is nothing here yet. A user who sees an error state should feel like something tried and failed.

|               | Empty state                | Error state                |
| ------------- | -------------------------- | -------------------------- |
| Icon          | Neutral, `--faint` stroke  | `AlertCircle`, coral       |
| Heading       | DM Serif italic, `--muted` | DM Serif italic, `--text`  |
| Body text     | Outfit 300, `--faint`      | Outfit 400, `--muted`      |
| CTA           | Primary button (create)    | Ghost "Retry" or "Go back" |
| Border accent | None                       | None (inline errors only)  |

---

## 5. Feedback and Toasts

Toasts are used sparingly — only for success confirmations of background operations where there is no other natural place in the UI to communicate that something completed.

**Use toasts for:**

- Document successfully deleted (the item is gone, so there is no place to show success inline)
- Reprocess completed successfully (the user may have navigated away)
- Copy to clipboard actions

**Do not use toasts for:**

- Mutation errors (use inline errors)
- Loading states (use skeleton/button loading)
- Events the user can already see (pipeline stage updates are visible in the card)
- Confirmation of actions the user just did and can see (renaming a project — the new name is right there)

**Toast design:**

- Position: bottom-right, stacked if multiple
- Width: 320px fixed
- Background: `--surface-2`, border `0.5px solid --border-em`, radius `10px`
- Duration: 4 seconds for success, persistent (with dismiss ✕) for anything that requires action
- Max 3 toasts visible simultaneously — queue the rest
- No progress bar on the toast — it adds visual noise for no benefit

**Toast anatomy:**

```
┌────────────────────────────────────┐
│  ✓  Document deleted               │
│     "Meeting notes Q3"        ✕   │
└────────────────────────────────────┘
```

- Icon: 13px, coloured by type (accent for success, amber for warning)
- Title: Outfit 500, 13px, `--text`
- Subtitle: Outfit 400, 12px, `--muted` — the name of the affected item
- Dismiss: `✕` icon button, top-right, always present

---

## 6. Interactions: Recovery Patterns

### Retry

Every failed data fetch and every failed mutation has a Retry path. The retry always re-executes the exact same operation — no configuration, no confirmation.

For query errors: call `refetch()` from TanStack Query. For mutation errors: re-call the mutation function with the same arguments. Never ask the user to reload the page as the primary recovery path — it is always a last resort.

### Revert

For optimistic mutations: revert happens automatically on failure (see §3). The user sees the value snap back. Always accompany the revert with an inline error message explaining why — a silent revert is confusing.

### Reload

If the app detects a stale state — for example, a document status that the SSE stream reported as `ready` but the query returns `processing` — trigger a silent `invalidateQueries` and refetch. Never prompt the user to reload unless there is a version mismatch between the frontend build and the backend (detectable via a response header), in which case show a persistent amber banner: _"A new version is available — reload to update."_

### Conflict (same document, multiple tabs)

If the user has the same document open in two tabs and edits in one, the other tab will receive an updated `updated_at` timestamp via query invalidation. Show a non-blocking amber banner: _"This document was updated in another tab."_ with two options: "Reload" (fetch latest) and "Keep mine" (dismiss the banner, continue editing). Do not silently overwrite.

### Delete with undo

Document deletion is the one destructive action that benefits from an undo pattern. When a document is deleted:

1. Remove it from the list immediately (optimistic)
2. Show a toast: _"Document deleted"_ with an **Undo** button (visible for 5 seconds)
3. If Undo is clicked within 5 seconds: restore the document via a separate restore endpoint, show success toast
4. If 5 seconds pass without Undo: confirm deletion is permanent (the server may have already processed it)

This gives the user a safety net without adding a confirmation dialog to every delete.

### Form abandonment

If the user tries to navigate away from a dialog or page form that has unsaved changes (any field touched):

- Dialog: do not close on backdrop click. Escape shows a brief shake animation on the dialog (indicating "not so fast") with no text. The user must click Cancel explicitly.
- Page form (markdown editor with unsaved changes): intercept navigation with a browser `beforeunload` prompt — or better, a custom React Router `blocker` — and show an inline banner: _"You have unsaved changes"_ with "Discard and leave" and "Stay and save" options.

---

## 7. Interaction States Reference

Every interactive element in the app must have a defined state for each of the following:

| State                  | Visual treatment                                                  |
| ---------------------- | ----------------------------------------------------------------- |
| Default                | Base styles per component spec                                    |
| Hover                  | `border-color` → `--border-em`, `150ms ease`                      |
| Focus (keyboard)       | `box-shadow: 0 0 0 2px rgba(200,240,96,0.25)` — accent focus ring |
| Active / pressed       | `scale(0.98)`, `80ms ease`                                        |
| Loading                | Disabled + spinner icon + `opacity: 0.7`                          |
| Disabled (not loading) | `opacity: 0.4`, `cursor: not-allowed`, no hover effect            |
| Error                  | Coral border, coral helper text below                             |
| Success (brief)        | Accent border, checkmark icon, returns to default after 1.5s      |

All transitions: `150ms ease`. No `transition: all` — always specify the property (`border-color`, `background`, `opacity`, `transform`).

Focus rings are always accent-coloured and keyboard-only (use `:focus-visible`, not `:focus`). Mouse clicks do not show focus rings.

---

## 8. TanStack Query Configuration

Global defaults for the app:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — data is fresh for 30s after fetch
      gcTime: 5 * 60 * 1000, // 5min — keep inactive queries in cache
      retry: 2, // retry failed queries twice
      retryDelay: (
        attempt // exponential backoff: 1s, 2s
      ) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true // refetch stale data when tab regains focus
    },
    mutations: {
      retry: 0 // never auto-retry mutations — user must choose
    }
  }
});
```

**Query key conventions:**

```tsx
// Hierarchical keys — invalidate at any level
["projects"][("projects", projectId)][("projects", projectId, "documents")][ // all projects // one project // documents in a project
  ("documents", documentId)
][("documents", documentId, "chunks")][("graph", projectId)][("chat", projectId)]; // one document // chunks of a document // graph data for a project // chat history for a project
```

Invalidating `['projects', projectId]` will also invalidate `['projects', projectId, 'documents']`. Structure keys to match the data hierarchy so invalidation is surgical.

**When to invalidate vs update cache directly:**

- After creating a document: invalidate `['projects', projectId, 'documents']` — the new item needs to come from the server with its generated ID and timestamps
- After renaming (optimistic): update cache directly, then invalidate on settle
- After pipeline completion (via SSE): update the specific document in cache directly — do not invalidate the whole list, which would cause all documents to flash

---

## 9. Accessibility Notes

- All form fields have a visible `<label>` element associated via `htmlFor` — no `placeholder`-only labelling
- Error messages are associated with their field via `aria-describedby`
- Loading states set `aria-busy="true"` on the container being loaded
- Disabled buttons retain their label and include `title` tooltip explaining why they are disabled (e.g., `title="Document is processing"`)
- Dialogs use `role="dialog"`, `aria-modal="true"`, and trap focus within the dialog while open
- Focus returns to the trigger element when a dialog closes
- The pipeline stage bar includes an `aria-label` describing current status: `aria-label="Pipeline: embedding (stage 3 of 6)"`
- Keyboard navigation: Tab through all interactive elements in DOM order; no `tabIndex > 0`
- All icon-only buttons have `aria-label`
