## Source Documents

- [Product Requirements Document](PRD.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Stories README](stories/README.md)

## Phase Backlog

1. [Phase 1 - Foundation](stories/phase-1-foundation.md)
2. [Phase 2 - Ingestion and Review](stories/phase-2-ingestion-review.md)
3. [Phase 3 - Search and Chat](stories/phase-3-search-chat.md)
4. [Phase 4 - Structure and Graph](stories/phase-4-structure-graph.md)
5. [Phase 5 - Polish, Operations, and Hardening](stories/phase-5-polish-ops.md)

## Agent Guidance

- Start with `IMPLEMENTATION_PLAN.md` to understand dependency order.
- Open `PRD.md`, the current story phase file, and the matching `docs/prd/phase-*` file unless a story explicitly depends on another phase.
- Keep story IDs stable in commits, branches, PR notes, and test names.
- Do not treat later-phase stories as blockers unless a current-phase acceptance criterion explicitly depends on them.
