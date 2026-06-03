# Frontend Architecture And Components Plan

## Goal

Reorganize the Next.js frontend into feature-based modules, reduce page-file size, centralize
data access, and build the new Library/Syllabus Studio experience without breaking existing flows.

## Current Problems

- Many `frontend/app/*/page.tsx` files contain fetching, state, forms, view logic, and UI markup.
- API types and endpoints are manually maintained in `frontend/lib/api`.
- Shared syllabus UI is duplicated across Library, Explore, public detail, build preview, and track detail.
- Admin-like pages (`tracks`, `materials`, `curriculum/edit`) duplicate editing concerns.
- Shell fetches broad data and stores it globally without a real client cache.

## Target Folder Structure

```text
frontend/
  app/
    library/
      page.tsx
      [slug]/
        page.tsx
    explore/
    coach/
    progress/
    settings/
  features/
    syllabus/
      api/
      components/
      hooks/
      studio/
      proposals/
      types.ts
    catalog/
      components/
      hooks/
    study/
      components/
      hooks/
    coach/
      components/
      hooks/
    progress/
      components/
      hooks/
    schedule/
      components/
      hooks/
  components/
    ui/
    layout/
    feedback/
  lib/
    api/
    query/
    routing/
    formatting/
```

## Component Boundaries

### Syllabus feature

- `SyllabusCard`
- `SyllabusHeader`
- `SyllabusTabs`
- `ModuleList`
- `ModuleTree`
- `ModuleEditor`
- `MaterialList`
- `MaterialEditor`
- `MaterialResourceList`
- `MaterialDetailDrawer`
- `SyllabusMap`
- `SyllabusHealthPanel`
- `SyllabusHistoryPanel`

### Studio feature

- `SyllabusStudioLayout`
- `StudioModuleTree`
- `StudioInspector`
- `StudioCommandBar`
- `ManualEditForm`
- `ResourcePicker`
- `ReorderableModuleList`
- `ReorderableMaterialList`

### Proposal feature

- `ProposalComposer`
- `ProposalDiff`
- `ProposalOperationRow`
- `ProposalSelectionToolbar`
- `ProposalConflictBanner`
- `ProposalHistoryList`

### Shared UI

- `Button`
- `IconButton`
- `Tabs`
- `Drawer`
- `Dialog`
- `Field`
- `Textarea`
- `Select`
- `SegmentedControl`
- `DataList`
- `EmptyState`
- `Skeleton`
- `Toast`

## Route Implementation

Add:

- `frontend/app/library/page.tsx`
- `frontend/app/library/[slug]/page.tsx`
- Optional `frontend/app/library/new/page.tsx`

Keep during migration:

- `frontend/app/curriculum/page.tsx`
- `frontend/app/curriculum/build/page.tsx`
- `frontend/app/curriculum/edit/page.tsx`
- `frontend/app/track/[slug]/page.tsx`
- `frontend/app/tracks/page.tsx`
- `frontend/app/materials/page.tsx`

Redirect later:

- `/curriculum` -> `/library`
- `/track/[slug]` -> `/library/[slug]`
- `/curriculum/edit` -> selected syllabus Studio

## Data Layer

Add TanStack Query:

- Query keys:
  - `["syllabi"]`
  - `["syllabus", idOrSlug]`
  - `["syllabus", id, "materials", filters]`
  - `["syllabus", id, "proposals"]`
  - `["today"]`
  - `["progress"]`
- Mutations:
  - create/update/delete syllabus
  - create/update/delete module
  - create/update/delete material
  - reorder syllabus
  - create proposal
  - apply proposal
  - reject proposal

Keep `frontend/lib/api` but move feature-specific wrappers into feature folders.

## API Type Strategy

Recommended:

1. Add OpenAPI type generation after backend canonical APIs stabilize.
2. Until then, add explicit `Syllabus*` frontend types in `features/syllabus/types.ts`.
3. Use adapter functions to convert legacy `Track` responses into `Syllabus` shape.
4. Remove adapters when `/api/syllabi` is the only source for new UI.

## Files Likely Affected

- `frontend/app/layout.tsx`
- `frontend/components/ui/Shell.tsx`
- `frontend/components/ui/LeftRail.tsx`
- `frontend/components/ui/CommandPalette.tsx`
- `frontend/lib/api/endpoints.ts`
- `frontend/lib/api/types.ts`
- `frontend/app/curriculum/page.tsx`
- `frontend/app/track/[slug]/page.tsx`
- `frontend/app/materials/page.tsx`
- `frontend/app/tracks/page.tsx`
- New `frontend/app/library/*`
- New `frontend/features/*`

## Implementation Steps

1. Add `features/syllabus/types.ts` and adapter helpers.
2. Extract shared syllabus presentation components from current track/explore pages.
3. Add Library page using existing APIs through adapters.
4. Add Syllabus detail page using existing APIs through adapters.
5. Add Studio tab shell with manual edit placeholders wired to existing material APIs.
6. Add proposal UI once backend proposal API exists.
7. Add TanStack Query and migrate shell/page fetching.
8. Update navigation labels and links.
9. Add redirects from old routes.
10. Remove duplicate old pages only after tests pass.

## Edge Cases

- User has zero syllabi.
- User has many syllabi.
- Syllabus has no modules but has materials with block labels.
- Syllabus has no materials.
- API returns old track shape during migration.
- AI proposal endpoint not available yet.
- Network failure during apply.
- User switches route while a proposal is being created.

## Tests

- Library renders empty state.
- Library renders adapted existing tracks.
- Syllabus detail renders modules and fallback modules.
- Studio can edit an existing material.
- Proposal diff renders mocked operations.
- Navigation routes to Library and Syllabus pages.
- Command palette includes new routes.
- Mobile layout keeps Studio usable.

## Acceptance Criteria

- New UI code lives under feature folders.
- Page files become thin composition layers.
- Shared syllabus components are reused by Library and Explore.
- Old routes continue to work until redirect phase.
- Data fetching is centralized through hooks.
- New frontend names use Syllabus language.

## Agent Coordination Notes

- Coordinate API response shapes with Agent A.
- Coordinate proposal UI contracts with Agent B.
- Coordinate CSS class/primitives with Agent D.
- Coordinate E2E selectors with Agent F.

