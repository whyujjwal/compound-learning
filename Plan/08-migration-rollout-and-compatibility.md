# Migration Rollout And Compatibility Plan

## Goal

Ship the reorganization safely by preserving old APIs and routes during migration, protecting
existing data, and removing duplicate surfaces only after the new experience is verified.

## Current Problems

- Existing frontend depends on `/api/tracks`, `/api/materials`, and `/api/curriculum`.
- Existing user data is stored in tables named around tracks and study materials.
- Route names and product language are changing.
- Multiple agents may work on backend, frontend, design, performance, and tests in parallel.

## Compatibility Strategy

Use a bridge period:

```text
Old DB tables -> New domain services -> New canonical APIs
                   |
                   -> Old compatibility APIs
```

Do not remove old paths until:

- New Library and Syllabus Studio are complete.
- Old routes redirect.
- Backend tests prove compatibility.
- Browser tests prove core flows.

## Migration Order

### Step 1: Plan and baseline

- Commit or clearly track plan docs.
- Record current test/build status.
- Confirm current uncommitted work.

### Step 2: Additive backend

- Add `domains/syllabus`.
- Add canonical `/api/syllabi`.
- Add proposal tables and endpoints.
- Keep old APIs working.

### Step 3: Additive frontend

- Add `/library` and `/library/[slug]`.
- Add feature folders.
- Use adapters if canonical API is not complete.
- Keep old pages reachable.

### Step 4: Route redirects

- Redirect `/curriculum` to `/library`.
- Redirect `/track/[slug]` to `/library/[slug]`.
- Redirect `/curriculum/edit` to the Studio tab.
- Keep build/generate route until new creation flow replaces it.

### Step 5: Cleanup duplicate surfaces

- Remove primary nav links for Tracks and Materials.
- Remove duplicate old UI pages only after redirects and tests pass.
- Keep backend compatibility APIs longer than frontend compatibility routes.

### Step 6: Documentation and final cleanup

- Update README.
- Update docs project structure.
- Add architecture doc for domains and frontend features.
- Remove dead CSS and unused components.

## Data Migration Rules

- Never drop existing columns in the first migration.
- Add new tables first.
- Backfill derived data only when safe and idempotent.
- Prefer nullable columns for first migration, then tighten later if needed.
- Store proposal operations as JSON with schema validation in application code.
- Keep old `TrackAIUpdate` rows readable.

## Route Compatibility

| Old route | During migration | Final behavior |
| --- | --- | --- |
| `/curriculum` | Still loads or redirects | Redirect to `/library` |
| `/curriculum/build` | Still loads | Redirect to new create/generate flow |
| `/curriculum/edit` | Still loads or redirects | Redirect to Studio |
| `/track/[slug]` | Still loads or redirects | Redirect to `/library/[slug]` |
| `/tracks` | Still reachable by URL | Remove from primary nav |
| `/materials` | Still reachable by URL | Remove from primary nav |
| `/stats` | Still loads | Optional redirect to `/progress` |

## API Compatibility

Keep these until frontend no longer calls them:

- `/api/tracks`
- `/api/materials`
- `/api/curriculum/overview`
- `/api/curriculum/generate`
- `/api/curriculum/import`
- `/api/catalog/tracks`

Compatibility wrappers should call canonical services where practical.

## Files Likely Affected

- `backend/app/main.py`
- `backend/app/api/routes/*`
- `backend/app/domains/*`
- `backend/alembic/versions/*`
- `frontend/app/*`
- `frontend/components/ui/LeftRail.tsx`
- `frontend/lib/api/*`
- `README.md`
- `docs/PROJECT_STRUCTURE.md`
- New `docs/ARCHITECTURE.md`

## Release Gates

### Backend gate

- Existing pytest suite passes.
- New syllabus tests pass.
- New proposal tests pass.
- Old endpoints return old expected shapes.

### Frontend gate

- Typecheck/build pass.
- New Library routes work.
- Old routes redirect or work.
- Syllabus Studio core editing works.

### UX gate

- No primary nav clutter.
- User can create/adopt/edit/study without admin pages.
- Mobile nav and Studio are usable.

### QA gate

- Playwright core flows pass.
- Desktop/mobile screenshots reviewed.
- Large syllabus performance checked.

## Rollback Strategy

- Because early backend changes are additive, rollback can hide new routes and keep old APIs.
- Frontend route rollout can be reverted by restoring old nav links and removing redirects.
- Proposal tables can remain unused if the proposal feature is disabled.
- Avoid destructive migrations until all compatibility gates pass.

## Edge Cases

- User has old generated roadmaps.
- User has manually created tracks with duplicate-like names.
- User has materials without module IDs.
- User has material cards/reviews linked to deleted or moved materials.
- AI disabled.
- Old route bookmarked.
- Agents merge partial changes out of order.

## Tests

- Old API tests remain.
- New API tests added before frontend migration depends on them.
- Redirect tests for old routes.
- Data migration tests for materials without modules.
- Browser tests for old route redirect into new route.
- Smoke test with seeded example curriculum.

## Acceptance Criteria

- Existing users do not lose data.
- Old API callers do not break during migration.
- New UI can be rolled out before old UI is deleted.
- Duplicate UI surfaces are removed only after tests pass.
- Docs clearly explain the new architecture.

## Agent Coordination Notes

- Lead/review agent should approve destructive cleanup.
- Agent A owns backend compatibility.
- Agent C owns route compatibility.
- Agent F owns compatibility tests.
- All agents should record assumptions in final handoff notes.

