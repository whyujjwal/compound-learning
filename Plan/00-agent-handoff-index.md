# Agent Handoff Index

## Goal

Coordinate a multi-agent overhaul of Compound so the application becomes easier to use,
easier to maintain, faster, and less cluttered.

This index is the source of truth for ownership, sequencing, vocabulary, and shared
constraints. Every implementation agent should read this file before starting any other
plan document.

## Plan Files

| File | Owner | Purpose |
| --- | --- | --- |
| `00-agent-handoff-index.md` | Lead/review agent | Coordination, vocabulary, phases, shared constraints |
| `01-product-organization-and-navigation.md` | Lead/review agent | Final product IA, navigation, route consolidation |
| `02-backend-domain-reorganization.md` | Agent A | Backend domains, canonical APIs, compatibility wrappers |
| `03-syllabus-studio-and-ai-diff-system.md` | Agent B | Manual editing, AI proposals, diff apply, undo/history |
| `04-frontend-architecture-and-components.md` | Agent C | Frontend feature folders, route structure, data hooks |
| `05-design-system-and-css-cleanup.md` | Agent D | CSS split, design primitives, visual consistency |
| `06-performance-and-data-fetching.md` | Agent E | Query optimization, caching, pagination, virtualization |
| `07-testing-qa-and-browser-verification.md` | Agent F | Backend, frontend, E2E, visual, and performance checks |
| `08-migration-rollout-and-compatibility.md` | Lead/review agent | Migration order, redirects, compatibility, cleanup |

## Shared Product Vocabulary

Use these terms in new UI, new docs, and new canonical APIs.

| New term | Current/legacy term | Meaning |
| --- | --- | --- |
| Syllabus | Track, roadmap, curriculum track | A learner-owned or public learning path |
| Module | TrackModule, block label group | Ordered section inside a syllabus |
| Material | StudyMaterial, resource item | A study item the learner can complete or review |
| Resource | Material URL, external_url | One external source attached to a material |
| Project | Project material, checkpoint | Applied task proving module-level ability |
| Review | FSRS card review | Spaced repetition review item |
| Studio | Roadmap editor, material admin | The unified editing workspace |
| Proposal | TrackAIUpdate preview | A reviewed AI/manual diff before applying changes |

Legacy database model names may remain in early phases. New product language should still
be used at API and UI boundaries whenever a new surface is introduced.

## Current Repo Facts

- Backend is a FastAPI app under `backend/app`.
- Frontend is a Next.js App Router app under `frontend/app`.
- Domain concepts are currently spread across `curriculum`, `tracks`, `materials`,
  `catalog`, `knowledge_graph`, `queue`, and `chat`.
- The user can already create/update/delete materials through `/api/materials`.
- The user can already request AI additions through `/api/tracks/{id}/ai-updates`.
- The app has backend pytest coverage but no dedicated frontend or Playwright test suite
  committed in the repo.
- `frontend/app/globals.css` is oversized and mixes token, layout, page, and component CSS.
- `Plan/` is reserved for this agent handoff documentation.

## Non-Negotiables

- Preserve existing user data.
- Keep old APIs working until the frontend migration is complete.
- AI edits must use diff approval by default.
- Do not make table renames the first step; add a canonical domain layer first.
- Do not delete existing untracked or modified user work without explicit instruction.
- Do not collapse separate agent work into one giant refactor.
- Do not remove `/api/tracks`, `/api/materials`, or `/api/curriculum` until compatibility
  has been verified and old callers have moved.
- Do not ship UI route removals without redirects.
- Do not introduce new dependencies without using them in a focused way.

## Implementation Phases

### Phase 0: Handoff and safety

- Confirm all agents have read this index.
- Confirm current branch and uncommitted changes.
- Run baseline checks that are already available:
  - Backend: `cd backend && pytest -v`
  - Frontend: `cd frontend && npm run build`
- Record failures before making changes.

### Phase 1: Canonical domain layer

- Add backend `domains/` structure.
- Introduce canonical syllabus schemas and services.
- Keep old route modules as wrappers or compatibility surfaces.
- Add tests for new canonical responses and old endpoint compatibility.

### Phase 2: Proposal engine

- Add proposal storage and operation schema.
- Implement manual and AI proposal creation.
- Implement apply/reject with version checks.
- Add undo/history events.

### Phase 3: Frontend architecture

- Introduce feature folders.
- Add typed data hooks.
- Build Library and Syllabus Studio routes.
- Keep redirects from legacy routes.

### Phase 4: Design system and speed

- Split CSS and extract primitives.
- Add query caching and list virtualization.
- Optimize heavy backend queries and list responses.
- Verify mobile and desktop behavior.

### Phase 5: Test, QA, cleanup

- Add frontend/E2E coverage.
- Run browser QA.
- Remove duplicate legacy UI only after redirects and APIs are stable.
- Update README/docs when implementation reality changes.

## Dependency Map

- Agent A must create stable canonical backend contracts before Agent C fully migrates the UI.
- Agent B depends on Agent A for proposal models and canonical syllabus services.
- Agent C can begin component extraction before Agent A is complete, but API wiring should wait
  for canonical endpoints.
- Agent D can begin CSS inventory early, but should coordinate class changes with Agent C.
- Agent E can optimize backend queries in parallel with Agent A if endpoint response shapes are
  not changed unexpectedly.
- Agent F should add smoke tests early and broaden coverage as each feature lands.
- Lead/review agent owns route naming, compatibility timing, and final cleanup approval.

## Agent Coordination Protocol

- Each agent should state which plan file they are implementing.
- Each agent should keep edits inside the subsystem named by that plan unless a dependency
  requires a small coordinated change.
- If two docs mention the same file, the agent owning the deeper subsystem has priority.
- Shared files that require coordination:
  - `backend/app/main.py`
  - `frontend/app/globals.css`
  - `frontend/lib/api/*`
  - `frontend/components/ui/*`
  - `README.md`
  - Alembic migration files
- Agents should leave notes in their final response listing:
  - Files touched
  - API or type changes
  - Tests run
  - Known follow-ups

## Ownership Boundaries

### Lead/review agent

- Owns final vocabulary.
- Owns route consolidation decisions.
- Owns migration sequencing.
- Resolves conflicts between agents.

### Agent A: Backend domains

- Owns `backend/app/domains`.
- Owns canonical syllabus route structure.
- Owns compatibility wrappers.
- Owns backend schema organization.

### Agent B: Syllabus Studio and AI diff

- Owns proposal operation schema.
- Owns proposal persistence and apply/reject behavior.
- Owns AI prompt output contracts.
- Owns undo/history semantics.

### Agent C: Frontend architecture

- Owns route and feature folder migration.
- Owns Syllabus Studio composition.
- Owns client API hooks.
- Owns frontend redirects.

### Agent D: Design system

- Owns CSS splitting.
- Owns reusable UI primitives.
- Owns responsive consistency.
- Owns visual cleanup rules.

### Agent E: Performance

- Owns data-fetching performance.
- Owns pagination and virtualization.
- Owns query and index recommendations.
- Owns performance acceptance checks.

### Agent F: QA

- Owns test matrix.
- Owns frontend/E2E setup.
- Owns browser verification flow.
- Owns regression acceptance gates.

## Definition Of Done For The Whole Overhaul

- New users understand the app from the first screen.
- A learner can create, adopt, edit, and study a syllabus without visiting admin-like pages.
- Manual edits and AI proposals use the same underlying operation model.
- AI-generated changes are previewed as a diff and safely applied.
- Old routes still resolve or redirect.
- Existing data remains intact.
- Large pages are split into maintainable feature components.
- CSS is split into understandable layers.
- Core flows are covered by backend tests and browser tests.
- List pages and syllabus detail pages feel fast with large data.
- Documentation reflects the new architecture.

## Shared Acceptance Checklist

- `git status --short` is understood before and after work.
- Backend tests pass or failures are documented.
- Frontend typecheck/build passes or failures are documented.
- New APIs have tests.
- New UI flows have browser verification.
- No unrelated user changes are reverted.
- No old API is removed before compatibility is confirmed.
- New docs use the new product vocabulary.

