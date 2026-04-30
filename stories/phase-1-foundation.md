# Phase 1 - Foundation

Goal: create the working skeleton of the local Docker app.

This phase establishes the monorepo, Docker dev environment, shared contracts, core API validation, database foundation, project CRUD, initial document creation, workspace shell, configuration, and secret handling.

## Epic 1 - Docker-First Platform and Monorepo

### Story 1.1 - Bootstrap the Workspace

**Description:** As a developer, I want a pnpm workspace with frontend, backend, and shared contract packages so that the app can be developed as a cohesive TypeScript monorepo.

**Phase:** 1

**Dependencies:** None.

**Status:** Completed 2026-04-30.

**Acceptance Criteria:**

- The workspace uses pnpm with a single lockfile.
- Shared TypeScript configuration is available to all packages.
- Root scripts can run development, build, test, lint, and typecheck tasks.
- The shared package can be imported by frontend and backend.
- Package boundaries separate frontend UI, backend runtime, and shared DTO/schema contracts.

### Story 1.2 - Run the App in Docker Development Mode

**Description:** As a developer, I want Docker Compose dev mode with hot reload so that I can run the whole system locally without installing infrastructure services directly.

**Phase:** 1

**Dependencies:** Story 1.1.

**Status:** Completed 2026-04-30.

**Acceptance Criteria:**

- Dev Compose starts Postgres, Redis, frontend, backend API, and worker.
- Frontend hot reload works through Vite.
- Backend API hot reload works.
- Worker hot reload works.
- Backend and worker run as separate services.
- Backend and worker share the same image definition.
- The frontend proxies API calls to the backend in development.

## Epic 2 - Shared Contracts and Validation

### Story 2.1 - Define Shared Domain Enums

**Description:** As a developer, I want shared enums for document status, ingestion mode, extraction profile, entity type, predicate, and event type so that frontend and backend interpret data consistently.

**Phase:** 1

**Dependencies:** Story 1.1.

**Acceptance Criteria:**

- Shared enums cover all v1 statuses and pipeline stages.
- Entity type enum includes work, research, personal, health, and learning concepts.
- Predicate enum includes the initial controlled relationship set.
- Frontend and backend both import the same schemas.
- Schema changes fail typechecks when contracts drift.

### Story 2.2 - Validate API Requests and Responses

**Description:** As a developer, I want route-level Zod validation so that invalid API data is rejected before it reaches business logic.

**Phase:** 1

**Dependencies:** Story 2.1.

**Acceptance Criteria:**

- Create, update, list, and action routes validate request bodies and params.
- Response DTOs are shaped through shared schemas.
- Validation failures return consistent error responses.
- Database rows are mapped to DTOs rather than returned directly.
- No OpenAPI generation is required in v1.

## Epic 3 - Projects and App Settings

### Story 3.1 - Create and Manage Projects

**Description:** As a user, I want to create and manage projects so that I can separate knowledge by context.

**Phase:** 1

**Dependencies:** Stories 1.2, 2.2.

**Acceptance Criteria:**

- Users can create, rename, update, and view projects.
- Projects include name, description, color, and icon.
- Project names are visible in navigation and scope selectors.
- Project detail includes ingestion and extraction settings.
- Project updates are reflected without a page reload.

## Epic 4 - Document Creation, Metadata, and Deduplication

### Story 4.1 - Paste Text as a Document

**Description:** As a user, I want to paste raw text into a project so that the system can turn it into a searchable knowledge document.

**Phase:** 1

**Dependencies:** Stories 3.1, 13.1, 14.1.

**Acceptance Criteria:**

- The paste form accepts raw text.
- File upload is not part of v1.
- The user can optionally provide a title.
- The user can optionally provide source metadata.
- Submitting creates a durable queued document immediately.
- The API enqueues ingestion work after document creation.

### Story 4.2 - Capture Source Metadata

**Description:** As a user, I want to attach source metadata to pasted content so that citations and search results preserve provenance.

**Phase:** 1

**Dependencies:** Story 4.1.

**Acceptance Criteria:**

- Source URL, source title, source author or name, source date, and source note are supported.
- Source metadata is optional.
- Source metadata can be edited after document creation.
- Source metadata appears in document detail.
- Source metadata appears in citations and search results when available.

## Epic 11 - Document Detail and Workspace UI

### Story 11.1 - Navigate the Project Workspace

**Description:** As a user, I want a clear project workspace so that documents, search, chat, graph, and settings are easy to reach.

**Phase:** 1

**Dependencies:** Stories 1.2, 3.1.

**Acceptance Criteria:**

- The layout includes project navigation.
- Primary views include Documents, Search, Chat, Graph, and Settings.
- The workspace is dense, readable, and suited to repeated use.
- There is no marketing-style landing page inside the app flow.
- Common actions are reachable from the project context.

## Epic 13 - Error Handling, Quotas, and Configuration

### Story 13.1 - Configure AI Models and Budgets

**Description:** As a developer or advanced user, I want model settings to be configurable so that the app can adapt to Gemini changes and quota needs.

**Phase:** 1

**Dependencies:** Story 1.1.

**Acceptance Criteria:**

- Generation model is configurable.
- Embedding model and dimension are configurable.
- Thinking budgets are configurable per task.
- Embedding batch size is configurable.
- Worker retry count and concurrency are configurable.

## Epic 14 - Security, Privacy, and Documentation

### Story 14.1 - Keep Secrets Backend-Only

**Description:** As a user, I want my Gemini API key protected from the browser so that secrets are not exposed in frontend code.

**Phase:** 1

**Dependencies:** Stories 1.2, 13.1.

**Acceptance Criteria:**

- Gemini API key is read only by backend and worker services.
- Frontend never receives the secret.
- Settings can show provider/model information without revealing the key.
- Logs do not print secrets.
- Missing key errors are clear during setup.
