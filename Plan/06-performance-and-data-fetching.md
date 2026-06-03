# Performance And Data Fetching Plan

## Goal

Make the app feel fast with large syllabi, many materials, frequent progress updates, and
AI proposal workflows.

## Current Problems

- Shell fetches broad datasets and stores them globally.
- Some list endpoints return full objects instead of lightweight list rows.
- Several backend response builders do per-row or repeated queries.
- Frontend pages render long lists without virtualization.
- There is no client cache layer for dedupe, stale data, optimistic updates, or invalidation.
- Some generated build and Playwright artifacts clutter local workspace views.

## Target State

- TanStack Query handles client caching and invalidation.
- Backend list endpoints are paginated and lightweight.
- Detail endpoints load only when needed.
- Large material/module lists are virtualized.
- Expensive counts are batched.
- Syllabus/progress data refreshes predictably after edits/reviews.
- Local development workspace stays clean.

## Frontend Data Strategy

Add TanStack Query:

```text
QueryClientProvider
  Shell
    Today
    Library
    Syllabus
```

Recommended defaults:

- `staleTime` for syllabus lists: 30 seconds.
- `staleTime` for detail pages: 15 seconds.
- `gcTime`: 5 minutes.
- Refetch on window focus only for Today/progress data.
- Mutations invalidate precise query keys.

## Query Keys

```text
["shell"]
["today"]
["stats"]
["activity", days]
["syllabi", filters]
["syllabus", idOrSlug]
["syllabus", id, "materials", filters]
["syllabus", id, "proposals"]
["catalog", filters]
["catalog", id]
```

## Backend Endpoint Strategy

List endpoints should return summaries:

- Syllabus list: metadata, counts, progress, health.
- Material list: id, module, title, type, minutes, status, priority, resource count.
- Proposal list: id, status, summary, operation counts, created/applied dates.

Detail endpoints should return full nested content only when requested.

Add filters:

- `q`
- `module_id`
- `status`
- `resource_type`
- `difficulty`
- `limit`
- `offset`
- `sort`

## Query Optimization

Backend improvements:

- Batch material counts by syllabus ID.
- Batch module counts by syllabus ID.
- Batch due review counts by syllabus ID.
- Avoid querying card state one material at a time.
- Use `selectinload` or explicit joins where appropriate.
- Add indexes for frequent filters.

Candidate indexes:

- `tracks(user_id, slug)`
- `track_modules(track_id, sequence)`
- `study_materials(track_id, module_id, sequence)`
- `study_materials(track_id, title)`
- `cards(user_id, material_id)`
- `cards(user_id, due_at)`
- `syllabus_proposals(user_id, syllabus_id, status)`
- `material_resources(material_id, url)`

## Virtualization

Use `@tanstack/react-virtual` for:

- Syllabus materials list.
- Studio module/material tree if material count is high.
- Proposal operation list if operations exceed 50.
- Catalog list if server pagination is not enough.

## Optimistic Updates

Use optimistic updates for:

- Rename syllabus.
- Rename module.
- Edit material metadata.
- Star/unstar public syllabus.
- Select/deselect proposal operations.

Avoid optimistic updates for:

- AI proposal generation.
- Proposal apply.
- Large reorder across many modules unless rollback is implemented.

## Local Workspace Hygiene

Ensure `.gitignore` covers:

- `.next/`
- `node_modules/`
- `.playwright-cli/`
- `.pytest_cache/`
- `__pycache__/`
- `*.pyc`
- `*.tsbuildinfo`
- `output/`

Agents may remove ignored generated artifacts only when explicitly performing cleanup and
after checking they are not tracked.

## Files Likely Affected

- `frontend/package.json`
- `frontend/app/layout.tsx`
- `frontend/components/ui/Shell.tsx`
- `frontend/lib/api/*`
- New `frontend/lib/query/*`
- New feature hooks under `frontend/features/*/hooks`
- Backend domain query files
- Backend Alembic migration for indexes
- `.gitignore`

## Implementation Steps

1. Add TanStack Query dependency.
2. Add QueryClient provider.
3. Convert shell data fetching to query hooks.
4. Add canonical lightweight backend list endpoints.
5. Add paginated material and proposal endpoints.
6. Add virtualization to large lists.
7. Add indexes through migration.
8. Add basic timing logs or development measurement notes.
9. Run performance acceptance checks with large seeded data.

## Performance Targets

Local development targets:

- Syllabus list response: under 200ms with 100 syllabi.
- Syllabus detail response: under 500ms with 1,000 materials.
- Material list filter response: under 250ms with 1,000 materials.
- Studio initial render: under 1 second after data arrives.
- Typing in search/filter: no visible jank.
- Proposal diff with 100 operations: scroll remains smooth.

## Edge Cases

- Slow AI proposal creation.
- Backend unavailable while cached data exists.
- Large syllabus with 2,000 materials.
- Many due cards.
- User edits while cached data is stale.
- Network request returns after route change.
- Query invalidation after session review.

## Tests

- Backend tests verify pagination and filters.
- Backend tests verify old endpoints still return expected counts.
- Frontend tests verify query hooks render loading/error/success states.
- Browser test opens large syllabus and scrolls material list.
- Browser test applies a proposal and sees cache refresh.
- Build/typecheck after dependency addition.

## Acceptance Criteria

- Shell no longer manually fetches every broad dataset without caching.
- Large material lists do not render every row at once.
- Backend list endpoints are lightweight and paginated.
- Common edits refresh only affected queries.
- Performance targets are measured and documented.

## Agent Coordination Notes

- Coordinate API shape with Agent A.
- Coordinate frontend hooks with Agent C.
- Coordinate E2E/performance fixtures with Agent F.
- Coordinate dependency additions with any active frontend work.

