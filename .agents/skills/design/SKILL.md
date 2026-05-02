---
name: design
description: UI and visual design rules for the wiki app, covering colors, typography, shadcn components, buttons, badges, dividers, icons, motion, and visual constraints. Use when working on interface components, layout polish, styling, Tailwind classes, visual hierarchy, icons, component states, or any user-facing UI design changes.
---

# UI & Design Skill

## Colours

- Accent (`--accent`) — primary actions + active states only, never decorative
- Text on accent backgrounds: always `--bg`, never white
- Amber = processing/warning · Coral = error/destructive · Blue = review/info · Purple = graph only
- Never repurpose semantic colours outside their meaning
- All borders: `0.5px` — never `1px`

## Typography

- **DM Serif Display** — page titles, card/section headings only. Never body, labels, or metadata.
- **Outfit** — all UI text: nav, buttons, body, descriptions, form fields.
- **DM Mono** — all system/machine data: IDs, timestamps, token counts, scores, pipeline stages. Non-negotiable.

## Components

- One primary button max per view. Primary = accent background.
- Ghost buttons: transparent + `--border-em` border. Danger: coral-dim background, never solid coral.
- Status badges: pill shape, leading 6px dot, semantic colour per status (ready/processing/review/failed/queued).
- Tags: `--surface-3` background, `--muted` text — never coloured.
- Dividers: `div` with `height: 0.5px` and `background: --border` — never `<hr>`.
- Pipeline bar: 6 pips, accent = done, amber pulse = active, `--surface-3` = pending.

## Icons

- Lucide only, stroke-based, `1.5px` stroke weight. Never mix libraries. Never emoji as icons.
- Sizes: sidebar `13px` · toolbar `15px` · empty states `32–48px`
- Colour: active = `--accent` or `--text` · default = `--muted` · disabled = `--faint`

## Motion

- State transitions: `150ms ease`. Border/bg/opacity only — never animate layout properties.
- No entrance animations, page transitions, or scroll effects.

## Do not

- Use any colour outside the palette
- Use accent green decoratively
- Use `1px` borders
- Use DM Serif for body/labels or Outfit for system metadata
- Mix icon libraries or use emoji as icons
- Show more than one primary button at a time
- Add entrance animations or page transitions
