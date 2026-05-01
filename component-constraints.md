# wiki — Component Library Constraints

**Version 1.0 · Frontend Engineering Reference**

---

## Rule

Never add more than one component in the same file. Always extract separate components in their own file.

## Use tailwind default classes where possible

- `size-3.75` instead of `size-[15px]`
- `p-3.5` instead of `p-[14px]`
- bracket usage is okay when tailwind doesn't provide the specific value

## Rule

Use shadcn/ui for all UI primitives. Never build custom implementations of components that shadcn/ui provides.

This is a non-negotiable constraint, not a preference. The goal is to eliminate entire categories of bugs (focus trapping, keyboard navigation, ARIA attributes, portal rendering, animation timing) by using components that have already solved them. Every hour spent building a custom dropdown is an hour not spent on the ingestion pipeline.

---

## shadcn/ui in This Stack

shadcn/ui is not a traditional component library — it copies component source into your project rather than importing from a package. This means:

- Components live in `packages/frontend/src/components/ui/`
- They are fully owned code — modify them freely to match the design system
- Updating is manual (copy new version, re-apply customisations) — do this intentionally, not automatically
- The underlying primitives are **Radix UI** — the actual accessibility and interaction logic lives there

Install the CLI once and add components as needed:

```bash
cd packages/frontend
pnpx shadcn@latest init
pnpx shadcn@latest add dialog
pnpx shadcn@latest add input
# etc.
```

Styling is via Tailwind CSS utility classes inside each component file. All design token overrides go into `globals.css` as CSS variables — shadcn/ui reads them automatically.

---

## Mandatory shadcn/ui Usage

The following components **must** use shadcn/ui. Opening a PR with a custom implementation of any of these is grounds for rejection.

### Form inputs

| Component         | shadcn/ui                       | Never build custom                           |
| ----------------- | ------------------------------- | -------------------------------------------- |
| Text input        | `<Input />`                     | `<input className="...">` with custom styles |
| Textarea          | `<Textarea />`                  | Raw `<textarea>`                             |
| Select / dropdown | `<Select />`                    | Custom dropdown div with onClick             |
| Checkbox          | `<Checkbox />`                  | Styled `<input type="checkbox">`             |
| Radio group       | `<RadioGroup />`                | Styled `<input type="radio">`                |
| Switch / toggle   | `<Switch />`                    | CSS-animated div                             |
| Slider            | `<Slider />`                    | Range input with custom track                |
| Form wrapper      | `<Form />` with react-hook-form | Manual `useState` per field                  |

Any other component which is present in shadcn like Date picker, toast, etc.

The `<Form />` component integrates react-hook-form and Zod validation. Use it for all forms with more than one field. Single inline-edit fields (project rename) may use a raw controlled `<input>` since they have no validation schema.

### Overlay components

| Component              | shadcn/ui          | Never build custom                    |
| ---------------------- | ------------------ | ------------------------------------- |
| Modal / dialog         | `<Dialog />`       | `position: fixed` div with backdrop   |
| Alert dialog (confirm) | `<AlertDialog />`  | `window.confirm()` or custom modal    |
| Sheet / drawer         | `<Sheet />`        | Slide-in panel built from scratch     |
| Popover                | `<Popover />`      | `position: absolute` div on hover     |
| Tooltip                | `<Tooltip />`      | `title` attribute or custom hover div |
| Context menu           | `<ContextMenu />`  | Custom right-click handler            |
| Dropdown menu          | `<DropdownMenu />` | Manually positioned ul/li dropdown    |

This category is where custom implementations go most wrong. Focus trapping, Escape key handling, scroll locking, portal rendering, and screen reader announcements are all handled by Radix UI under the hood. A custom modal that works visually will fail keyboard users, fail on iOS Safari, and fail screen readers — shadcn/ui handles all of this correctly.

### Navigation and layout

| Component | shadcn/ui       | Notes                                          |
| --------- | --------------- | ---------------------------------------------- |
| Tabs      | `<Tabs />`      | For switching between views within a panel     |
| Accordion | `<Accordion />` | For collapsible sections in the metadata panel |
| Separator | `<Separator />` | Replace all custom `<hr>` and divider divs     |

### Feedback

| Component             | shadcn/ui                                              | Notes                                                              |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Toast / notifications | `<Sonner />` (via `sonner` package, shadcn-integrated) | See toast rules in frontend patterns doc                           |
| Progress bar          | `<Progress />`                                         | For determinate progress; pipeline uses custom pip bar (see below) |
| Skeleton              | `<Skeleton />`                                         | Base component; extend with layout-specific wrappers               |
| Badge                 | `<Badge />`                                            | Extend with variant overrides for status badges                    |
| Alert (inline)        | `<Alert />`                                            | For page-level and section-level error states                      |

### Utility

| Component              | shadcn/ui                      | Notes                                               |
| ---------------------- | ------------------------------ | --------------------------------------------------- |
| Command palette        | `<Command />`                  | For the search interface                            |
| Calendar / date picker | `<Calendar />` + `<Popover />` | If date filtering is ever added                     |
| Scroll area            | `<ScrollArea />`               | For scrollable panels with custom scrollbar styling |
| Avatar                 | `<Avatar />`                   | For entity icons in the graph panel                 |

---

## What You Can Build Custom

Not everything is in shadcn/ui. The following components are genuinely custom — no shadcn/ui equivalent exists — and must be built from scratch:

| Component                  | Why custom    | Notes                                                                                      |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| Pipeline stage bar         | No equivalent | 6 fixed pips, amber pulse animation, mono labels                                           |
| SSE status indicator       | No equivalent | Live dot with pulse, maps to pipeline stages                                               |
| wiki graph canvas          | No equivalent | `react-force-graph-2d`, D3-based                                                           |
| Markdown editor            | No equivalent | Either CodeMirror or simple `<textarea>` with preview                                      |
| Chat message bubble        | No equivalent | Streaming-aware, citation superscripts                                                     |
| Token/chunk metadata strip | No equivalent | DM Mono metadata row below document card                                                   |
| Document card              | No equivalent | Composite of shadcn primitives — Badge, Skeleton, Separator — assembled into a card layout |

Custom components must still use shadcn/ui primitives internally where applicable. A document card is custom, but the `<Badge />` inside it is shadcn/ui.

---

## Theming shadcn/ui to Match the Design System

shadcn/ui uses CSS variables for all tokens. Override them in `globals.css` to match the wiki design system. The key mappings:

```css
/* globals.css */
:root {
  /* shadcn maps --background, --foreground, etc. */
  /* Map them to wiki tokens */

  --background: 0 0% 6%; /* #0E0F0D equivalent in HSL */
  --foreground: 60 7% 94%; /* #F0EFE8 */

  --card: 80 4% 9%; /* --surface-1 #161714 */
  --card-foreground: 60 7% 94%;

  --popover: 80 4% 9%;
  --popover-foreground: 60 7% 94%;

  --primary: 82 84% 66%; /* --accent #C8F060 */
  --primary-foreground: 0 0% 6%; /* dark text on accent */

  --secondary: 80 3% 12%; /* --surface-2 #1E1F1C */
  --secondary-foreground: 60 7% 94%;

  --muted: 80 3% 12%;
  --muted-foreground: 60 4% 54%; /* --muted #8A8A7E */

  --accent: 80 3% 15%; /* --surface-3 #252622 */
  --accent-foreground: 60 7% 94%;

  --destructive: 4 84% 60%; /* --coral #F07060 */
  --destructive-foreground: 60 7% 94%;

  --border: rgba(255, 255, 255, 0.07);
  --input: rgba(255, 255, 255, 0.07);
  --ring: 82 84% 66%; /* accent focus ring */

  --radius: 0.5rem; /* 8px — --radius-md */
}
```

After setting these, all shadcn/ui components will render on-brand without per-component style overrides. Only reach into individual component files when a specific variant needs adjusting (e.g. the `Badge` component needs additional `status-ready`, `status-failed` variants).

---

## Adding Variants

shadcn/ui components use `class-variance-authority` (cva) for variants. Add new variants directly in the component file rather than overriding via className at the call site.

Example — adding status variants to `Badge`:

```tsx
// components/ui/badge.tsx
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/15 text-destructive",
        outline: "border border-border text-foreground",
        // wiki-specific status variants
        ready: "bg-[rgba(200,240,96,0.12)] text-[#C8F060]",
        processing: "bg-[rgba(240,176,96,0.12)] text-[#F0B060]",
        review: "bg-[rgba(96,160,240,0.12)] text-[#60A0F0]",
        failed: "bg-[rgba(240,112,96,0.12)] text-[#F07060]",
        queued: "bg-white/5 text-[#8A8A7E]"
      }
    },
    defaultVariants: { variant: "default" }
  }
);
```

Usage stays clean at the call site:

```tsx
<Badge variant="processing">processing</Badge>
<Badge variant="failed">failed</Badge>
```

Apply this pattern for any component that needs design-system variants. Never pass long className strings at the call site to approximate a variant — define it properly in the component.

---

## Form Pattern with react-hook-form + Zod

All multi-field forms use this exact stack: `<Form />` (shadcn/ui) + `react-hook-form` + Zod schema from `packages/shared`.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateProjectSchema } from "@wiki/shared";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function CreateProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: { name: "", description: "" }
  });

  const mutation = useCreateProject();

  function onSubmit(values: CreateProjectInput) {
    mutation.mutate(values, {
      onSuccess: () => {
        form.reset();
        onSuccess();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project name</FormLabel>
              <FormControl>
                <Input placeholder="Job Hunt 2025" {...field} />
              </FormControl>
              <FormMessage /> {/* renders Zod error automatically */}
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create project"}
        </Button>
      </form>
    </Form>
  );
}
```

`<FormMessage />` automatically surfaces the Zod validation error for that field. No manual error rendering needed.

---

## Dialog Pattern

All modal forms wrap the form component in `<Dialog />`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

function CreateProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ New project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <CreateProjectForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```

Use `<AlertDialog />` (not `<Dialog />`) for destructive confirmations. `<AlertDialog />` does not close on backdrop click by default — intentional for destructive actions.

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete project</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this project?</AlertDialogTitle>
      <AlertDialogDescription>
        All documents and graph data will be permanently removed. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## What Not to Do

```tsx
// ❌ Custom dropdown — no keyboard nav, no Escape, no ARIA
<div className="relative">
  <button onClick={() => setOpen(!open)}>Options</button>
  {open && (
    <div className="absolute top-full bg-surface-2 ...">
      <div onClick={handleEdit}>Edit</div>
      <div onClick={handleDelete}>Delete</div>
    </div>
  )}
</div>

// ✅ shadcn/ui DropdownMenu — all of the above handled
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

```tsx
// ❌ Custom modal — broken focus trap, broken Escape, broken scroll lock
{
  showModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-surface-2 rounded-xl p-6">...</div>
    </div>
  );
}

// ✅ shadcn/ui Dialog — correct in every edge case
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>;
```

```tsx
// ❌ window.confirm — blocks the thread, unstyled, can't be customised
if (window.confirm("Delete this document?")) {
  handleDelete();
}

// ✅ AlertDialog — async, styled, keyboard accessible
<AlertDialog>...</AlertDialog>;
```
