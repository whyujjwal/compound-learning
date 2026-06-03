# Product Organization And Navigation Plan

## Goal

Make Compound feel like one coherent learning product instead of a collection of admin pages.
The learner should understand where to go, what to do next, and how to improve a syllabus
without thinking about backend concepts like tracks, materials, cards, and imports.

## Current Problems

- Similar concepts are spread across `My library`, `Build roadmap`, `Roadmap editor`,
  `Tracks`, `Materials`, and individual track pages.
- The current navigation exposes implementation concepts instead of learner tasks.
- Manual editing is hidden in `Roadmap editor` and `Materials`, far from the syllabus page.
- AI editing is embedded in the track page, but it only feels like an add-on.
- Explore, public track detail, private track detail, and builder preview repeat similar
  syllabus presentation logic.
- The product language changes between curriculum, roadmap, track, library, material,
  resource, and card.

## Target State

Primary navigation:

```text
Today
Library
Explore
Coach
Progress
Settings
```

Secondary surfaces:

```text
Library/[syllabus]
  Overview
  Studio
  Map
  Materials
  Practice
  History

Today
  Current blocks
  Reviews
  Continue learning
  Week glance

Explore
  Catalog
  Public syllabus detail
  Creator profile
```

The app should read like:

- Today: what should I do now?
- Library: what am I learning?
- Syllabus Studio: how do I shape what I am learning?
- Explore: what can I adopt or remix?
- Coach: what does my data suggest?
- Progress: how am I doing?
- Settings: how should the system behave?

## Route Plan

| Current route | Target route | Behavior |
| --- | --- | --- |
| `/` | `/` | Keep as Today |
| `/curriculum` | `/library` | Redirect, then remove duplicate UI later |
| `/track/[slug]` | `/library/[slug]` | Redirect after new page is ready |
| `/curriculum/edit` | `/library/[slug]?tab=studio` | Replace with Studio |
| `/tracks` | No primary nav | Move admin actions into Library/Studio |
| `/materials` | No primary nav | Move create/edit into Studio and material drawer |
| `/curriculum/build` | `/library/new` or `/studio/new` | Keep redirect from old route |
| `/explore` | `/explore` | Keep, reuse syllabus components |
| `/explore/[id]` | `/explore/[id]` | Keep, reuse public syllabus detail |
| `/schedule` | `/week` or Library secondary action | De-emphasize from main nav |
| `/stats` | `/progress` | Rename in UI, route can redirect later |
| `/coach` | `/coach` | Keep |
| `/settings` | `/settings` | Keep |

## Final Navigation Details

### Today

- Shows current learning blocks.
- Shows the next material or review.
- Shows a compact week glance.
- Has one primary action: continue.
- Keeps coach nudges but does not compete with the main action.

### Library

- Shows private syllabi.
- Shows progress, next material, module count, review count, and health.
- Has actions: create syllabus, import/adopt, open Studio, continue.
- Does not show low-level track/material administration as separate nav.

### Syllabus Detail

- Header shows name, summary, progress, next action, and health.
- Tabs:
  - Overview: outcomes, modules, progress, next work.
  - Studio: edit modules/materials/resources and review AI proposals.
  - Map: visual module/material graph.
  - Materials: dense searchable list.
  - Practice: reviews, projects, quizzes, checkpoints.
  - History: changes, proposals, undo points.

### Explore

- Public discovery remains separate from private learning.
- Public syllabus cards use same terminology and visual structure as private syllabus cards.
- Adopt creates a private copy.
- Remix opens Studio/new-generation flow with the public syllabus as source context.

### Coach

- Keeps chat and insights.
- Gains actions that deep-link into Studio:
  - Improve weak module
  - Add more practice
  - Replace weak resources
  - Create project

### Progress

- Renames Stats in UI.
- Shows retention, streak, time, track/syllabus breakdown, activity, and weak spots.
- Links weak spots back to Studio or Practice.

## User Journeys

### Create a syllabus manually

1. User opens Library.
2. User clicks New Syllabus.
3. User enters name, goal, difficulty, and optional public/private setting.
4. User lands in Syllabus Studio.
5. User adds modules.
6. User adds materials/resources inside each module.
7. User can start learning immediately.

### Generate a syllabus with AI

1. User opens Library.
2. User clicks Generate with AI.
3. User describes goal, level, weekly hours, and preferred source types.
4. AI returns a proposal, not an immediate apply.
5. User reviews modules, resources, projects, estimated time, and quality warnings.
6. User applies selected parts.
7. New syllabus appears in Library.

### Improve an existing syllabus

1. User opens a syllabus.
2. User enters Studio.
3. User asks AI to improve a module, add projects, replace links, remove fluff, or deepen a topic.
4. AI creates a proposal diff.
5. User edits or selects proposal operations.
6. User applies changes.
7. History records what changed and why.

### Study from a syllabus

1. User opens Today or a syllabus.
2. User clicks Continue.
3. Session opens with the current material/review.
4. Completion updates progress and review state.
5. The next item is chosen without extra admin decisions.

## Files And Folders Likely Affected

- `frontend/components/ui/LeftRail.tsx`
- `frontend/components/ui/CommandPalette.tsx`
- `frontend/components/ui/Shell.tsx`
- `frontend/app/curriculum/page.tsx`
- `frontend/app/curriculum/build/page.tsx`
- `frontend/app/curriculum/edit/page.tsx`
- `frontend/app/track/[slug]/page.tsx`
- `frontend/app/tracks/page.tsx`
- `frontend/app/materials/page.tsx`
- `frontend/app/explore/ExploreClient.tsx`
- `frontend/app/explore/[id]/page.tsx`
- `frontend/app/stats/page.tsx`
- `frontend/app/schedule/page.tsx`
- New `frontend/app/library/*`
- New `frontend/features/syllabus/*`

## Implementation Steps

1. Add new Library route while leaving current routes intact.
2. Extract shared syllabus card/module/material preview components.
3. Update left rail labels and reduce primary nav to final six items.
4. Move create/edit entry points into Library and Syllabus Studio.
5. Add redirects from old routes after new route parity exists.
6. Remove old nav entries for Tracks and Materials.
7. Keep old pages temporarily reachable by URL during migration.
8. Remove duplicate old pages only after acceptance checks pass.

## API, Type, And Interface Changes

- New frontend type names should prefer `Syllabus`, `SyllabusModule`, `SyllabusMaterial`,
  and `SyllabusResource`.
- Existing API types can be adapted through mapping functions during migration.
- UI copy should stop saying "roadmap editor" and use "Syllabus Studio".
- UI copy should stop using "admin view" for learner-facing surfaces.

## Edge Cases

- Empty user library should offer Explore, Generate with AI, and Manual Syllabus.
- Users with old generated tracks should see them as syllabi without data migration surprises.
- Broken or missing material URLs should not block opening a syllabus.
- Very large syllabi should show list virtualization and progressive loading.
- Public/private status should be visible but not noisy.
- Old bookmarked URLs must redirect gracefully.

## Tests

- Navigation renders final primary items.
- Old routes redirect or still load during migration.
- Empty Library shows correct actions.
- User can open a private syllabus from Library.
- User can open Studio from a syllabus.
- Explore adopt still creates a private syllabus.
- Command palette opens new Library and syllabus routes.
- Mobile nav does not overflow or hide primary actions.

## Acceptance Criteria

- A learner can explain the app using only the primary nav labels.
- No learner-facing page sends the user to a separate "admin" area to edit a syllabus.
- Manual and AI editing are both reachable from the syllabus itself.
- The app has one canonical private learning hub: Library.
- Old route access does not break existing users.
- The naming is consistent across nav, headers, buttons, and empty states.

## Agent Coordination Notes

- Coordinate with Agent C before removing or redirecting pages.
- Coordinate with Agent A before relying on new `/api/syllabi` endpoints.
- Coordinate with Agent D before large class name or layout changes.
- Coordinate with Agent F for browser verification after each route migration.

