# wiki Story Backlog

This directory splits the user stories into implementation phases. Each phase file is intended to be small enough for an AI implementation agent to load and execute without needing the full backlog in context.

## Files

- [Phase 1 - Foundation](phase-1-foundation.md)
- [Phase 2 - Ingestion and Review](phase-2-ingestion-review.md)
- [Phase 3 - Search and Chat](phase-3-search-chat.md)
- [Phase 4 - Structure and Graph](phase-4-structure-graph.md)
- [Phase 5 - Polish, Operations, and Hardening](phase-5-polish-ops.md)

## How to Use

1. Read the root `PRD.md`.
2. Read the root `IMPLEMENTATION_PLAN.md`.
3. Open the current phase file.
4. Implement stories in dependency order inside that phase.
5. Update acceptance criteria only when the product decision changes.

## Story Format

Each story includes:

- Stable story ID and title.
- Description in user-story form.
- Phase.
- Dependencies.
- Acceptance criteria.

## Phase Dependency Order

1. Foundation before ingestion.
2. Ingestion before search/chat.
3. Search/chat before graph-assisted chat.
4. Structured extraction before graph visualization.
5. Polish and hardening after the core flows are working.
