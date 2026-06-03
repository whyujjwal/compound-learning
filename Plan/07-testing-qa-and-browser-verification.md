# Testing QA And Browser Verification Plan

## Goal

Add enough automated and browser verification to safely reorganize the app while preserving
existing behavior and proving the new Syllabus Studio experience works.

## Current Problems

- Backend pytest coverage exists, but new canonical APIs and proposals are not covered yet.
- There are no committed frontend component tests.
- There are no committed Playwright E2E tests.
- Visual regressions are currently caught manually.
- Large refactors could break routes, navigation, or editing flows without quick feedback.

## Target State

Testing layers:

```text
Backend unit/API tests
Frontend component tests
Frontend typecheck/build
Playwright E2E tests
Browser screenshot QA
Performance smoke checks
```

## Backend Test Matrix

### Existing behavior

- Health endpoint works.
- Auth disabled/enabled behavior remains stable.
- Old `/api/tracks` works.
- Old `/api/materials` works.
- Old `/api/curriculum` schedule/generate/import works.
- Queue and review flow still work.
- Catalog adopt/star/rate still works.

### New syllabus API

- List syllabi.
- Get syllabus detail by ID.
- Get syllabus detail by slug.
- Create syllabus.
- Update syllabus.
- Delete non-system syllabus.
- Reject deleting system syllabus if current behavior requires that.
- Add/update/delete module.
- Add/update/delete material.
- Reorder modules/materials.
- Ownership checks.

### Proposal engine

- Create proposal from AI mock.
- Create proposal from manual operation payload.
- Reject proposal.
- Apply all operations.
- Apply selected operations.
- Detect conflict.
- Write change history.
- Preserve old AI update endpoint compatibility.

## Frontend Test Matrix

Recommended tooling:

- Vitest
- React Testing Library
- Playwright

Component tests:

- `SyllabusCard`
- `ModuleList`
- `MaterialEditor`
- `ProposalDiff`
- `ProposalOperationRow`
- `SyllabusStudioLayout`
- `LeftRail`
- `CommandPalette`

Hook tests:

- Syllabus list query loading/error/success.
- Syllabus mutation invalidation.
- Proposal apply mutation invalidation.

## Playwright E2E Flows

### Flow 1: Empty Library

1. Open app with blank database fixture.
2. Go to Library.
3. Verify empty state.
4. Verify actions: Explore, Generate with AI, Manual Syllabus.

### Flow 2: Manual Syllabus Creation

1. Open Library.
2. Create syllabus.
3. Add module.
4. Add material.
5. Add resource URL.
6. Save.
7. Verify material appears in syllabus.

### Flow 3: AI Proposal

1. Open an existing syllabus.
2. Open Studio.
3. Ask AI to add a project.
4. Mock backend proposal response.
5. Verify diff renders.
6. Select one operation.
7. Apply selected.
8. Verify syllabus updates.

### Flow 4: Explore Adopt

1. Open Explore.
2. Open public syllabus detail.
3. Adopt.
4. Verify private copy appears in Library.

### Flow 5: Study Session

1. Open Today.
2. Continue first block.
3. Submit review.
4. Verify progress/counts refresh.

### Flow 6: Responsive Navigation

1. Open mobile viewport.
2. Open nav drawer.
3. Navigate to Library.
4. Open syllabus.
5. Open Studio tab.
6. Verify no overlap or hidden primary actions.

## Browser Screenshot QA

Capture desktop and mobile screenshots for:

- Today
- Library
- Syllabus Overview
- Syllabus Studio
- Syllabus Proposal Diff
- Explore
- Public Syllabus Detail
- Coach
- Progress
- Settings

For each screenshot, verify:

- No overlapping text.
- No cropped primary action.
- No broken cards or nested-card clutter.
- Loading states reserve reasonable space.
- Mobile nav is usable.

## Performance QA

Seed a large syllabus:

- 20 modules.
- 1,000 materials.
- 1,500 resources.
- 100 proposal operations.

Verify:

- Library loads quickly.
- Syllabus detail opens.
- Studio material list scrolls smoothly.
- Proposal diff scrolls smoothly.
- Search/filter remains responsive.

## Files Likely Affected

- `backend/tests/test_api.py`
- New `backend/tests/test_syllabus.py`
- New `backend/tests/test_syllabus_proposals.py`
- `frontend/package.json`
- New `frontend/vitest.config.*`
- New `frontend/tests/*`
- New `frontend/playwright.config.*`
- New `frontend/e2e/*`
- Optional `scripts/qa/*`

## Implementation Steps

1. Keep existing backend tests passing before refactor work.
2. Add backend tests for canonical syllabus API.
3. Add backend tests for proposal engine.
4. Add frontend test tooling.
5. Add component tests for proposal diff and syllabus primitives.
6. Add Playwright config and first smoke flow.
7. Add E2E flows as features land.
8. Add screenshot capture script or documented command.
9. Add final acceptance test run.

## Edge Cases

- AI disabled.
- AI proposal failed.
- Network error during proposal apply.
- Empty syllabus.
- Large syllabus.
- Missing material URL.
- User with paused syllabus/track.
- Old bookmarked route.
- Mobile keyboard opening on Studio form.

## Acceptance Criteria

- Backend tests pass.
- Frontend typecheck/build passes.
- New canonical APIs are tested.
- Proposal apply/reject/conflict are tested.
- Main browser flows pass.
- Desktop and mobile screenshots are reviewed.
- Known test gaps are documented before merge.

## Agent Coordination Notes

- Coordinate fixtures with Agent A and Agent B.
- Coordinate selectors with Agent C.
- Coordinate screenshot expectations with Agent D.
- Coordinate large-data fixtures with Agent E.

