# Syllabus Studio And AI Diff System Plan

## Goal

Build a unified editing system where manual changes and AI-generated changes use the same
operation model. AI should propose a reviewed diff by default, not mutate the syllabus blindly.

## Current Problems

- Manual material CRUD exists but is separated from the private syllabus experience.
- AI track updates can add materials, but they are not a full structured diff.
- There is no robust proposal lifecycle: draft, preview, apply selected, reject, conflict, undo.
- There is no shared mutation model between manual edits and AI edits.
- Existing AI update history is not enough to reconstruct applied changes or recover mistakes.

## Target State

Syllabus Studio supports:

- Manual add/edit/remove/reorder modules.
- Manual add/edit/remove/move/reorder materials.
- Manual add/edit/remove resources attached to materials.
- AI proposal generation for additions, removals, edits, replacements, projects, quizzes,
  hard challenges, easy drills, and resource repair.
- Proposal review with selectable operations.
- Apply all or apply selected.
- Reject proposal.
- Conflict detection when the syllabus changed after proposal creation.
- Undo through change history.

## Proposal Lifecycle

```text
DRAFT -> READY -> APPLIED
      -> REJECTED
      -> SUPERSEDED
      -> CONFLICTED
      -> FAILED
```

Definitions:

- `DRAFT`: proposal row exists but operations are not complete.
- `READY`: operations validated and ready for review.
- `APPLIED`: at least one operation was applied.
- `REJECTED`: user rejected without applying.
- `SUPERSEDED`: newer proposal replaced it.
- `CONFLICTED`: base syllabus version no longer matches.
- `FAILED`: AI or validation failed.

## Operation Schema

Every mutation should be expressible as a proposal operation.

```json
{
  "id": "client-or-server-op-id",
  "type": "material.add",
  "target": {
    "syllabus_id": "uuid",
    "module_id": "uuid-or-null",
    "material_id": "uuid-or-null"
  },
  "payload": {
    "title": "Build a Redis-backed rate limiter",
    "resource_type": "project",
    "estimated_minutes": 90,
    "priority_percent": 20,
    "difficulty": "hard",
    "brief_markdown": "Build and explain a fixed-window and token-bucket limiter.",
    "resources": [
      {
        "url": "https://redis.io/docs/latest/develop/",
        "label": "Redis documentation",
        "kind": "official_docs"
      }
    ]
  },
  "before": null,
  "reason": "Adds a practical checkpoint to the caching/rate-limiting module.",
  "risk": "low"
}
```

Supported operation types:

```text
module.add
module.update
module.remove
module.restore
module.reorder
material.add
material.update
material.remove
material.restore
material.move
material.reorder
resource.add
resource.update
resource.remove
syllabus.update
schedule.update
```

## Proposal Data Model

Add `syllabus_proposals`:

- `id`
- `user_id`
- `syllabus_id`
- `source`: `AI`, `MANUAL`, `IMPORT`, `SYSTEM`
- `status`
- `instruction`
- `summary`
- `base_version`
- `operations`
- `selected_operation_ids`
- `applied_operation_ids`
- `provider`
- `model`
- `error`
- `created_at`
- `updated_at`
- `applied_at`

Add `syllabus_change_log`:

- `id`
- `user_id`
- `syllabus_id`
- `proposal_id`
- `operation_id`
- `operation_type`
- `before`
- `after`
- `created_at`

## AI Prompt Contract

AI must return JSON only:

```json
{
  "summary": "Added harder project checkpoints and replaced weak links.",
  "quality_notes": [
    "Module 2 had no project.",
    "Two resources were broad homepages."
  ],
  "operations": []
}
```

Rules for AI:

- Do not apply directly.
- Do not invent URLs when uncertain.
- Prefer official docs, university courses, canonical GitHub repos, papers, reputable videos,
  and high-signal blogs.
- Explain why every operation exists.
- Use explicit operation types.
- Reuse existing module IDs when improving a module.
- Mark risky removals as `risk: "medium"` or `risk: "high"`.

## Manual Editing Model

Manual edits can either:

- Apply immediately through canonical endpoints, while also writing change history.
- Or create a local proposal when the user is performing bulk changes.

Recommended v1:

- Single-field edits apply immediately and write history.
- Bulk edits and AI edits create proposals.
- Reorder can apply immediately but still records a grouped change.

## Conflict Handling

Each proposal stores `base_version`.

When applying:

- If current syllabus version equals `base_version`, apply.
- If not equal, validate every selected operation.
- If targets still exist and fields do not conflict, allow apply with warning.
- If targets are missing or changed incompatibly, mark proposal `CONFLICTED`.

## Files Likely Affected

- `backend/app/models/track_ai_update.py`
- New `backend/app/models/syllabus_proposal.py`
- New `backend/app/models/syllabus_change_log.py`
- New Alembic migration
- `backend/app/services/roadmap/generator.py`
- `backend/app/services/roadmap/prompts.py`
- `backend/app/api/routes/tracks.py`
- New `backend/app/domains/syllabus/operations.py`
- New `backend/app/domains/syllabus/proposals.py`
- `frontend/app/track/[slug]/page.tsx`
- New `frontend/features/syllabus/studio/*`
- New `frontend/features/syllabus/proposals/*`

## Implementation Steps

1. Define operation schema in backend Pydantic.
2. Add proposal and change-log models.
3. Add Alembic migration.
4. Implement operation validation helpers.
5. Implement operation apply helpers inside a transaction.
6. Implement proposal create/reject/apply endpoints.
7. Update AI generation to output operations instead of raw new materials.
8. Keep old `TrackAIUpdate` endpoint by adapting AI output to proposals or by wrapping it.
9. Build frontend proposal diff view.
10. Add Studio controls for apply all, apply selected, reject, and conflict retry.

## Proposal UI Requirements

- Show summary at top.
- Group operations by module.
- Use visual labels: Add, Edit, Remove, Move, Reorder, Resource.
- Show before/after for edits.
- Show old/new module for moves.
- Show risk level for removals.
- Allow selecting/deselecting operations.
- Disable apply if no operations are selected.
- Show conflict state with a clear retry path.
- After apply, refresh syllabus detail and history.

## Edge Cases

- AI returns invalid JSON.
- AI returns operations targeting missing modules/materials.
- AI suggests duplicate material titles.
- AI suggests paid-only resources.
- User applies only part of a proposal.
- User edits syllabus after proposal creation.
- Proposal includes both remove and update for same target.
- Material has review card/session history and user removes it.
- Resource URL already exists on another material.

## Tests

- Create AI proposal stores `READY` proposal with operations.
- Invalid AI response stores `FAILED` proposal with error.
- Apply selected operations mutates syllabus and writes history.
- Reject proposal does not mutate syllabus.
- Conflict detection catches stale target removal.
- Duplicate material operation is rejected or deduped.
- Old AI update endpoint still works during compatibility phase.
- Frontend diff view renders add/update/remove/move operations.
- Browser test applies selected operations and sees updated syllabus.

## Acceptance Criteria

- AI never mutates a syllabus without user approval by default.
- Manual and AI changes share one operation model.
- Every applied change has history.
- User can recover from accidental changes through history/undo design.
- Existing AI update behavior remains compatible until old UI is retired.
- Proposal UI is clear enough for a user to understand exactly what will change.

## Agent Coordination Notes

- Coordinate canonical API names with Agent A.
- Coordinate Studio UI with Agent C.
- Coordinate visual diff styling with Agent D.
- Coordinate proposal test scenarios with Agent F.

