# Knowledge — Design Guidelines

**Version 1.0 · Internal Design Reference**

---

## 1. Design Philosophy

Knowledge is a personal, local-first tool for developers and knowledge workers. It handles raw, unstructured information and turns it into something navigable and intelligent. The design should reflect that: precise, purposeful, and slightly technical — but never cold.

### Core principles

**Dark-first.** Knowledge work happens at night. The interface lives on a near-black background with a warm undertone — not pure black, which reads as harsh and lifeless. Every surface is layered, not flat.

**Editorial type.** The serif display font gives the app weight and character beyond typical developer tooling. It signals that this is a place where _ideas live_, not just data.

**Density with air.** Information-dense layouts with generous internal padding. Surfaces layer over one another. There is always breathing room inside components, even when the layout is packed.

**Monospace metadata.** Any system-generated data — token counts, chunk IDs, timestamps, cosine similarity scores — renders in the monospace font. This creates a clear visual grammar: serif = concepts, sans = UI, mono = machine.

**Intentional colour.** Colour is not decorative. Every colour has a semantic role. The accent (acid green) is used only for primary actions and active states. Amber = processing. Coral = error. Blue = informational/review. Purple = knowledge graph layer. Do not use colours outside their assigned meaning.

---

## 2. Colour Palette

### Base surfaces

| Token         | Hex       | Usage                           |
| ------------- | --------- | ------------------------------- |
| `--bg`        | `#0E0F0D` | Page background                 |
| `--surface-1` | `#161714` | Sidebar, secondary panels       |
| `--surface-2` | `#1E1F1C` | Cards, raised containers        |
| `--surface-3` | `#252622` | Input fields, inset areas, tags |

The surfaces use a warm-tinted near-black (a hint of green/khaki in the undertone). This keeps the dark theme from feeling sterile. Never substitute pure black (`#000000`) or neutral dark greys.

### Text

| Token     | Hex       | Usage                                        |
| --------- | --------- | -------------------------------------------- |
| `--text`  | `#F0EFE8` | Primary text — warm white, not pure white    |
| `--muted` | `#8A8A7E` | Secondary text, descriptions, metadata       |
| `--faint` | `#4A4A42` | Tertiary — labels, disabled states, dividers |

Never use pure white (`#FFFFFF`) for body text. The warm off-white (`#F0EFE8`) is softer against the dark background and stays cohesive with the warm surface tones.

### Borders

| Token         | Value                    | Usage                            |
| ------------- | ------------------------ | -------------------------------- |
| `--border`    | `rgba(255,255,255,0.07)` | Default container borders        |
| `--border-em` | `rgba(255,255,255,0.13)` | Hover states, focused containers |

All borders are `0.5px`. Never use `1px` borders — they are visually heavier than the aesthetic requires.

### Accent — primary

| Token      | Hex       | Dim version             | Usage                                          |
| ---------- | --------- | ----------------------- | ---------------------------------------------- |
| `--accent` | `#C8F060` | `rgba(200,240,96,0.10)` | Primary buttons, active nav items, ready state |

The acid green accent is high-contrast, memorable, and unusual enough to be distinctive. Use it sparingly — only for the most important interactive element on a given view. On dark backgrounds, use the full `#C8F060`. On the accent itself (e.g. button backgrounds), text should always be `#0E0F0D` — never white.

### Semantic colours

| Colour | Hex       | Dim                     | Semantic meaning                  |
| ------ | --------- | ----------------------- | --------------------------------- |
| Amber  | `#F0B060` | `rgba(240,176,96,0.12)` | Processing, in-progress, warning  |
| Coral  | `#F07060` | `rgba(240,112,96,0.12)` | Error, failed, destructive action |
| Blue   | `#60A0F0` | `rgba(96,160,240,0.12)` | Informational, awaiting review    |
| Purple | `#A060F0` | `rgba(160,96,240,0.12)` | Knowledge graph, entity layer     |

These colours are used exclusively in their assigned context. Do not repurpose amber for decorative highlights or blue for branding. The semantic associations need to be consistent across the entire product for the status system to communicate clearly.

---

## 3. Typography

### Typefaces

| Role               | Family           | Weights used                       |
| ------------------ | ---------------- | ---------------------------------- |
| Display / Headings | DM Serif Display | Regular, Italic                    |
| UI / Body          | Outfit           | 300 Light, 400 Regular, 500 Medium |
| Code / Metadata    | DM Mono          | 400 Regular, 500 Medium            |

Google Fonts import:

```
https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600&display=swap
```

### Type scale

| Level           | Font             | Size    | Weight           | Tracking           | Usage                           |
| --------------- | ---------------- | ------- | ---------------- | ------------------ | ------------------------------- |
| Display         | DM Serif Display | 32–40px | Regular / Italic | -0.02em            | Hero headings, empty states     |
| Page title      | DM Serif Display | 22–26px | Regular          | -0.01em            | Screen headings in topbar       |
| Section heading | DM Serif Display | 18px    | Regular          | 0                  | Card titles, panel headings     |
| UI label        | Outfit           | 15px    | 500              | 0                  | Item names, document titles     |
| Body            | Outfit           | 13px    | 400              | 0                  | Descriptions, content previews  |
| Small / Meta    | Outfit           | 11–12px | 400              | 0.01em             | Dates, secondary info           |
| Caption         | Outfit           | 10px    | 400              | 0.04em             | Section labels, eyebrows        |
| Code / System   | DM Mono          | 11px    | 400              | 0                  | IDs, tokens, scores, timestamps |
| Section eyebrow | Outfit           | 9–10px  | 500              | 0.10em + uppercase | Section labels in sidebar       |

### Rules

- **DM Serif Display** is used for page-level and section-level headings only. Never use it for body text, UI labels, or metadata.
- **Outfit** covers all UI text — navigation, buttons, body copy, descriptions, form fields.
- **DM Mono** is used for all system-generated data: chunk IDs, embedding scores, token counts, file sizes, timestamps, status codes, pipeline stages. This distinction is non-negotiable — it creates the semantic layer between human content and machine metadata.
- Never use Inter, Roboto, or system-ui as fallbacks in design mockups. The font choices are part of the identity.
- Line height for body text: `1.6–1.7`. Line height for headings: `1.1–1.2`.
- Letter spacing on all-caps labels: `0.08–0.12em`.

---

## 4. Spacing System

All spacing follows an 4px base unit. Components use `px` internally; layout uses `rem`.

| Step | Value     | Usage                               |
| ---- | --------- | ----------------------------------- |
| 4px  | `0.25rem` | Icon gaps, tight inline spacing     |
| 8px  | `0.5rem`  | Component internal gaps             |
| 12px | `0.75rem` | Card internal padding (compact)     |
| 16px | `1rem`    | Standard internal padding           |
| 20px | `1.25rem` | Card internal padding (comfortable) |
| 24px | `1.5rem`  | Section gaps                        |
| 32px | `2rem`    | Major layout gaps                   |
| 48px | `3rem`    | Between page sections               |

### Padding conventions

| Component          | Padding         |
| ------------------ | --------------- |
| Sidebar item       | `6px 8px`       |
| Card (standard)    | `14px 16px`     |
| Card (comfortable) | `20px`          |
| Topbar             | `16px 20px`     |
| Content area       | `20px`          |
| Input field        | `7–9px 10–12px` |
| Button (small)     | `6px 12px`      |
| Button (default)   | `8px 16px`      |
| Badge / pill       | `3px 10px`      |
| Tag                | `2px 6px`       |

---

## 5. Border Radius

| Token           | Value     | Usage                          |
| --------------- | --------- | ------------------------------ |
| `--radius-sm`   | `6px`     | Tags, small badges, stage pips |
| `--radius-md`   | `8px`     | Buttons, inputs, small cards   |
| `--radius-lg`   | `10–12px` | Standard cards, project cards  |
| `--radius-xl`   | `14px`    | App shell, modal containers    |
| `--radius-full` | `9999px`  | Status badges, avatar circles  |

Never mix radius sizes randomly. Cards always use `--radius-lg`. Interactive controls (buttons, inputs) always use `--radius-md`. Decorative pills and badges use `--radius-full`.

---

## 6. Layout Architecture

### App shell

The app uses a two-panel layout: fixed-width sidebar on the left, main content area on the right.

```
┌─────────────────────────────────────────────┐
│  Sidebar (220px fixed)  │  Main content      │
│                         │  ┌──── Topbar ───┐ │
│  Logo + search          │  │               │ │
│  ─────────────          │  └───────────────┘ │
│  Navigation             │                    │
│  ─────────────          │  Content area      │
│  Projects list          │  (scrollable)      │
│                         │                    │
│  ─────────────          │                    │
│  New project btn        │                    │
└─────────────────────────────────────────────┘
```

The sidebar background is `--surface-1`. The main content background is `--bg`. The topbar has a bottom border only. All panel borders are `0.5px solid --border`.

### Sidebar

- Width: `220px`, fixed.
- Logo at top, then search box.
- Sections separated by section eyebrow labels.
- Navigation items and project items share the same row component.
- Active item: `--accent-dim` background, `--accent`-coloured text and icon, with a `0.5px` accent-tinted border.
- Project items show a coloured dot (7px circle) instead of an icon.
- "New project" button is pinned to the bottom, full-width, primary accent style.

### Topbar

- Height: ~54px.
- Page title (DM Serif Display, 22px) on the left.
- Action buttons on the right.
- Bottom border only — no shadow.

### Content area

- Padding: `20px`.
- Content scrolls; topbar and sidebar are fixed.
- Maximum content width: none (fills available space). For very wide screens, constrain content to `1200px` max.

---

## 7. Components

### Cards

Cards are the primary container for documents, projects, and content previews.

**Project card**

- Background: `--surface-1`
- Border: `0.5px solid --border`
- Border radius: `12px`
- Padding: `14px`
- On hover: border-color transitions to `--border-em` (150ms ease)
- Structure: header row (icon + name + date) → description text → footer divider → doc count + tags

**Stat card / metric card**

- Background: `--surface-2`
- No border
- Border radius: `10px`
- Padding: `12px 14px`
- Label: 10px Outfit, `--faint`, uppercase, letter-spaced
- Value: DM Serif Display, 22px, `--text`
- Sub-label: 10px Outfit, `--muted`

**Document card** (within project view)

- Background: `--surface-1`
- Border: `0.5px solid --border`
- Border radius: `10px`
- Padding: `14px`
- Left accent bar (4px, `--surface-3` radius) for visual anchoring
- Status badge in top-right corner
- Title: Outfit 500, 13px
- Preview text: Outfit 400, 12px, `--muted`, 2-line clamp
- Footer: mono metadata (date, token count)

### Buttons

**Primary** — used for the single most important action on a screen.

```
background: --accent (#C8F060)
color: #0E0F0D
border: none
border-radius: 8px
padding: 8px 16px
font: Outfit 500, 13px
```

**Ghost** — secondary actions, cancel, view alternatives.

```
background: transparent
color: --muted
border: 0.5px solid --border-em
border-radius: 8px
padding: 8px 16px
font: Outfit 400, 13px
```

**Danger** — destructive actions (delete, clear). Never use coral as background. Use the dim version.

```
background: --coral-dim
color: --coral
border: 0.5px solid rgba(240,112,96,0.25)
border-radius: 8px
padding: 8px 16px
font: Outfit 400, 13px
```

**Icon button** — sidebar and toolbar icon actions.

```
background: transparent
color: --faint (default), --muted (hover), --text (active)
border: none
border-radius: 6px
padding: 6px
```

Rule: there should be at most one primary button visible at a time. All other actions are ghost or icon buttons.

### Inputs

**Default text input**

```
background: --surface-3
border: 0.5px solid --border-em
border-radius: 8px
padding: 9px 12px
font: Outfit 400, 13px
color: --text
```

**Focused**

```
border-color: --accent
box-shadow: 0 0 0 2px rgba(200,240,96,0.10)
```

**Error state**

```
border-color: rgba(240,112,96,0.4)
color: --coral
```

**Paste area** (large textarea for raw input ingestion)

```
Same as default input but min-height: 180px
font: Outfit 300, 13px (lighter weight signals raw/informal input)
resize: vertical
```

### Status badges

Badges always use the full-radius pill shape and a leading dot indicator.

| Status            | Background               | Text colour | Dot    |
| ----------------- | ------------------------ | ----------- | ------ |
| `ready`           | `rgba(200,240,96,0.12)`  | `#C8F060`   | accent |
| `processing`      | `rgba(240,176,96,0.12)`  | `#F0B060`   | amber  |
| `awaiting review` | `rgba(96,160,240,0.12)`  | `#60A0F0`   | blue   |
| `failed`          | `rgba(240,112,96,0.12)`  | `#F07060`   | coral  |
| `queued`          | `rgba(255,255,255,0.06)` | `#8A8A7E`   | muted  |

The dot is a 6px circle (`border-radius: 50%`, `background: currentColor`). Badge font: Outfit 500, 11px.

### Pipeline stage bar

Used within document cards and the document detail view to show ingestion progress.

- 6 segments (one per stage: markdownify → chunk → embed → extract → graph → complete)
- Each pip: `height: 4px`, `border-radius: 2px`, `flex: 1`
- Completed: `--accent`
- Active: `--amber` (with pulse animation)
- Pending: `--surface-3`
- Stage labels below in DM Mono, 9px

### Tags

Used for document and project categorisation.

```
background: --surface-3
color: --muted
border-radius: 4px
padding: 2px 6px
font: Outfit 400, 10px
```

Never use coloured backgrounds for tags. Tags are neutral; status badges carry colour.

### Dividers

All dividers are `0.5px solid --border`. No `hr` elements — use a `div` with `height: 0.5px` and `background: --border`. Used to separate card footer from card body, and sidebar sections from one another.

---

## 8. Motion & Animation

Motion is used minimally and purposefully. There are three categories:

**Transition (state change)**
All hover, focus, and active state transitions use `150ms ease`. Border colour, background colour, and opacity changes only. Never animate layout properties (width, height, padding) on hover — it causes layout shift.

**Loading / skeleton**
Skeleton loaders use a shimmer animation:

```css
background: linear-gradient(90deg, --surface-2 25%, --surface-3 50%, --surface-2 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite linear;
```

Use for: document cards while fetching, chat responses before streaming begins, graph while loading.

**Pulse (live indicator)**
Used for the active pipeline stage dot:

```css
animation: pulse 2s ease-in-out infinite;
/* 0%, 100%: opacity 1, scale 1 — 50%: opacity 0.4, scale 0.8 */
```

**SSE streaming (chat)**
LLM tokens stream character by character. No animation needed — the natural streaming is the motion. Add a blinking cursor (`|`) at the end of the incomplete response, `animation: blink 1s step-end infinite`.

**No**: entrance animations, page transitions, parallax, scroll-triggered effects. This is a productivity tool, not a portfolio site. Motion should never be noticeable when things are working correctly — only when something is actively in progress.

---

## 9. Iconography

Use **Lucide Icons** throughout (stroke-based, consistent 1.5px stroke weight, rounded linecaps). Never mix icon libraries.

Icon sizes:

- Navigation / sidebar: `13×13px`
- Toolbar / topbar actions: `15×15px`
- Inline with text: `13×13px`, vertically centred with `vertical-align: middle`
- Empty state illustrations: `32–48px` (increase stroke to 1px for larger sizes)

Icon colour follows the text hierarchy:

- Active / primary: `--accent` or `--text`
- Default: `--muted`
- Disabled: `--faint`

Never use filled icons alongside stroke icons. Never use emoji as icons in the UI.

Key icon assignments:

| Icon                     | Usage                  |
| ------------------------ | ---------------------- |
| `Home`                   | Projects dashboard     |
| `Search`                 | Search panel           |
| `GitBranch` or `Network` | Knowledge graph        |
| `FileText`               | Document               |
| `Plus`                   | New item (button)      |
| `ChevronRight`           | Navigation / expand    |
| `RotateCcw`              | Retry                  |
| `AlertCircle`            | Error state            |
| `CheckCircle`            | Ready / success        |
| `Clock`                  | Queued / pending       |
| `Zap`                    | Processing             |
| `Eye`                    | Review mode            |
| `Edit3`                  | Edit markdown          |
| `Trash2`                 | Delete (danger, coral) |

---

## 10. Screen-specific guidelines

### Projects dashboard

- 4-column stat row at top (total projects, documents, entities, graph nodes)
- 2-column project card grid below
- Sidebar shows same project list with coloured dots and doc counts
- Empty state: DM Serif Display italic, large, with a ghost "Create your first project" button centred in the content area

### Project detail / document list

- Topbar shows project name (DM Serif Display) + coloured dot matching sidebar
- Filter bar below topbar: status filter badges + search input
- Document list: full-width cards, sorted by updated date descending
- Processing documents show stage bar and pulse indicator
- Failed documents show coral border-left accent and retry button
- Documents in `awaiting_review` show blue border-left accent and "Review" CTA

### Document detail / markdown editor

- Split-pane layout: markdown editor (left, 55%) + metadata panel (right, 45%)
- Editor: monospace font (`DM Mono`), dark background (`--surface-3`), subtle line numbers in `--faint`
- When `is_dirty = true`: amber banner across the top — "Unsaved edits · Search and graph reflect the previous version" + Reprocess button
- When `status = awaiting_review`: blue banner — "Review AI-generated markdown before processing" + Confirm & Process button
- Metadata panel: summary, tags (editable), entity list, pipeline stage bar, timestamps

### Paste / new document flow

- Modal or full-panel: large textarea, project selector, review mode toggle
- Review mode toggle: labelled switch — "Pause for review after markdownification"
- Submit button triggers immediate document creation and pipeline start
- If review mode off: document card appears in list with `processing` status immediately
- If review mode on: transitions to the markdown editor in `awaiting_review` state

### Knowledge graph view

- Full-screen force-directed graph (react-force-graph-2d, dark canvas)
- Node colours map to entity type: person = blue, company = amber, tool = accent, concept = purple
- Node size scales with connection count
- Clicking a node opens a right-side panel: entity name, type, connected documents, related entities
- Toolbar at top: project filter, entity type filter, zoom controls
- Graph canvas background: `#0A0B09` (slightly darker than app bg for contrast)

### Chat / Q&A

- Full-width chat interface within a project or across all projects
- User messages: right-aligned, `--surface-3` background, Outfit 400
- Assistant messages: left-aligned, no background (inline on `--bg`)
- Citations: inline superscript numbers `[1]`, expandable citation list at the bottom of each response
- Streaming: DM Serif Display for the response text renders with a slight weight to signal "AI voice" vs user input
- Source attribution chips below each response: small document title pills in `--surface-2`

---

## 11. Empty states

Every empty state follows the same structure:

1. Large icon (32–40px, `--faint` stroke)
2. DM Serif Display heading (italic), 22px, `--muted`
3. Body explanation, Outfit 300, 13px, `--faint`, max-width 320px, centred
4. Primary action button

Examples:

- No projects: _"Your knowledge starts here"_ → "Create first project"
- No documents: _"Nothing stored yet"_ → "Add your first document"
- No search results: _"Nothing found"_ → "Try different keywords"
- Graph empty: _"No connections yet"_ → "Add more documents to build the graph"

---

## 12. Responsive behaviour

The app is desktop-first (minimum viewport: 1024px). It is not designed for mobile use. At viewport widths below 1200px:

- Sidebar collapses to icon-only mode (40px wide), with tooltips on hover
- Project card grid drops to 1 column
- Stat card grid drops to 2 columns
- Document detail split-pane stacks vertically (editor on top, metadata below)

At widths below 1024px: show a "best experienced on desktop" banner. Do not attempt to reflow the full UI for mobile.

---

## 13. Do / Don't

| Do                                                          | Don't                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| Use `0.5px` borders throughout                              | Use `1px` borders — too heavy                          |
| Use DM Serif Display for page and card headings             | Use DM Serif for body text or labels                   |
| Use DM Mono for all system/metadata values                  | Use Outfit for token counts, IDs, scores               |
| Use accent green only for the primary action                | Use accent green decoratively or as a highlight colour |
| Use colour semantically (amber = processing, coral = error) | Use colour for visual variety or branding              |
| Keep motion subtle and purposeful                           | Add entrance animations or page transitions            |
| Layer surfaces (bg → surface-1 → surface-2 → surface-3)     | Use flat single-surface layouts                        |
| Use warm near-black `#0E0F0D` as base                       | Use pure black `#000` or neutral dark grey             |
| Use `--text` (`#F0EFE8`) for primary text                   | Use pure white `#FFF` for text                         |
| Render all borders at `0.5px`                               | Mix `0.5px` and `1px` borders in the same component    |
| One primary button per screen                               | Show multiple primary buttons simultaneously           |
| Lucide icons at consistent stroke weight                    | Mix icon libraries or use emoji as icons               |
