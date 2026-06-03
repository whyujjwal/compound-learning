# Backend Domain Reorganization Plan

## Goal

Reorganize the backend around clear product domains and introduce a canonical syllabus API
without breaking existing frontend or user data.

## Current Problems

- `backend/app/api/routes/catalog.py`, `tracks.py`, and `curriculum.py` are large route files.
- Route modules mix HTTP concerns, query construction, response mapping, and business logic.
- Product concepts are split across `curriculum`, `tracks`, `materials`, `catalog`, `queue`,
  and `knowledge_graph`.
- The same track/material shape is manually mapped in several places.
- New UI needs a canonical syllabus API, but existing APIs must remain compatible.

## Target State

New backend structure:

```text
backend/app/domains/
  syllabus/
    __init__.py
    router.py
    schemas.py
    service.py
    queries.py
    mapper.py
    operations.py
  catalog/
    router.py
    service.py
    queries.py
    schemas.py
  study/
    router.py
    service.py
    queue.py
  coach/
    router.py
    service.py
  schedule/
    router.py
    service.py
  identity/
    router.py
    service.py
```

Existing route modules can remain while canonical domain modules are introduced.

## Domain Mapping

| Existing model | Canonical domain name | Initial DB action |
| --- | --- | --- |
| `Track` | `Syllabus` | Keep table name `tracks` initially |
| `TrackModule` | `SyllabusModule` | Keep table name `track_modules` initially |
| `StudyMaterial` | `Material` | Keep table name `study_materials` initially |
| `Card` | `ReviewCard` | Keep table name `cards` |
| `TrackAIUpdate` | `SyllabusProposal` legacy source | Add new proposal table before removing |

Do not rename tables in the first backend pass. Add a canonical service and API layer first.

## Canonical API

Add these endpoints under `/api/syllabi`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/syllabi` | Lightweight list of user syllabi |
| POST | `/api/syllabi` | Create manual syllabus |
| GET | `/api/syllabi/{syllabus_id}` | Full syllabus detail |
| PATCH | `/api/syllabi/{syllabus_id}` | Update syllabus metadata |
| DELETE | `/api/syllabi/{syllabus_id}` | Delete non-system syllabus |
| GET | `/api/syllabi/slug/{slug}` | Resolve by slug for frontend routes |
| POST | `/api/syllabi/{syllabus_id}/modules` | Add module |
| PATCH | `/api/syllabi/{syllabus_id}/modules/{module_id}` | Update module |
| DELETE | `/api/syllabi/{syllabus_id}/modules/{module_id}` | Delete/archive module |
| POST | `/api/syllabi/{syllabus_id}/materials` | Add material |
| PATCH | `/api/syllabi/{syllabus_id}/materials/{material_id}` | Update material |
| DELETE | `/api/syllabi/{syllabus_id}/materials/{material_id}` | Delete/archive material |
| POST | `/api/syllabi/{syllabus_id}/reorder` | Reorder modules/materials |
| GET | `/api/syllabi/{syllabus_id}/history` | Change history |
| POST | `/api/syllabi/{syllabus_id}/proposals` | Create AI/manual proposal |

## Response Shape Principles

List response should be lightweight:

```json
{
  "id": "uuid",
  "slug": "system-design",
  "name": "System Design",
  "summary": "Short syllabus summary",
  "color": "#0ea5e9",
  "visibility": "PUBLIC",
  "module_count": 6,
  "material_count": 72,
  "started_count": 12,
  "mastered_count": 5,
  "due_review_count": 3,
  "health_score": 82,
  "updated_at": "iso-date"
}
```

Detail response should include modules and material summaries:

```json
{
  "id": "uuid",
  "slug": "system-design",
  "name": "System Design",
  "summary": "Short syllabus summary",
  "outcomes": [],
  "modules": [],
  "version": 12,
  "permissions": {
    "can_edit": true,
    "can_publish": true
  }
}
```

Material detail can be loaded separately for large syllabi.

## Service Split

- `router.py`: HTTP methods, auth dependency, status codes.
- `schemas.py`: Pydantic request/response contracts.
- `queries.py`: SQLAlchemy query builders and count aggregation.
- `service.py`: application behavior and transactions.
- `mapper.py`: model-to-response conversion.
- `operations.py`: shared mutation helpers used by manual edits and proposal apply.

Routes should not contain:

- Large mapping loops.
- Complex SQL aggregation.
- AI prompt logic.
- Multi-step mutation logic.

## Files Likely Affected

- `backend/app/main.py`
- `backend/app/api/routes/tracks.py`
- `backend/app/api/routes/materials.py`
- `backend/app/api/routes/curriculum.py`
- `backend/app/api/routes/catalog.py`
- `backend/app/schemas/track.py`
- `backend/app/schemas/material.py`
- `backend/app/schemas/curriculum.py`
- `backend/app/models/track.py`
- `backend/app/models/track_module.py`
- `backend/app/models/material.py`
- `backend/app/services/syllabus.py`
- `backend/app/services/curriculum_loader.py`
- New `backend/app/domains/syllabus/*`
- New Alembic migration files as needed

## Implementation Steps

1. Create `backend/app/domains/syllabus/`.
2. Move response mapping from `tracks.py` into `domains/syllabus/mapper.py`.
3. Move module/material query logic into `domains/syllabus/queries.py`.
4. Add `schemas.py` with canonical `Syllabus*` names.
5. Add `service.py` for create/update/delete and module/material mutation.
6. Add `router.py` with `/syllabi` endpoints.
7. Include the new router in `backend/app/main.py`.
8. Update old `tracks.py` and `materials.py` to reuse domain services where practical.
9. Add tests for new canonical APIs.
10. Add compatibility tests proving old endpoints still work.

## API And Type Changes

- New canonical schemas:
  - `SyllabusCreate`
  - `SyllabusUpdate`
  - `SyllabusListItem`
  - `SyllabusDetail`
  - `SyllabusModuleCreate`
  - `SyllabusModuleUpdate`
  - `SyllabusMaterialCreate`
  - `SyllabusMaterialUpdate`
  - `SyllabusReorderRequest`
- Old schemas remain until migration is complete.
- Frontend can initially consume canonical APIs through adapter functions.

## Data Safety Rules

- Use user ownership filters on every syllabus/module/material query.
- Do not allow deleting system syllabi unless existing behavior explicitly permits it.
- When deleting a module, either reject if it has materials or require an explicit move/archive policy.
- Use transactions for multi-step changes.
- Add optimistic `version` checking before applying bulk changes.

## Edge Cases

- Duplicate slug for same user returns 409.
- Module title duplicate inside a syllabus returns 409 or resolves through explicit rename.
- Material move across modules must preserve ownership.
- Material reorder must not drop items omitted from a partial request.
- Unknown IDs in reorder payload should return 400.
- Old `block_label` materials without module IDs should still group into modules.
- Missing cards should be created when a material is created with review enabled.

## Tests

- `GET /api/syllabi` returns existing seeded tracks as syllabi.
- `GET /api/syllabi/{id}` returns modules and materials.
- Create/update/delete syllabus preserves old track behavior.
- Create/update/delete module works with ownership checks.
- Create/update/delete material creates/updates/deletes related card correctly.
- Reorder changes module and material sequence.
- Old `/api/tracks` and `/api/materials` tests still pass.
- User cannot access another user's syllabus.

## Acceptance Criteria

- New canonical API exists and passes tests.
- Existing frontend continues working.
- Old API contracts remain stable.
- Route files become thinner for newly touched behavior.
- Domain folder organization is clear enough for future agents to extend.

## Agent Coordination Notes

- Coordinate proposal-related model changes with Agent B.
- Coordinate frontend response types with Agent C.
- Coordinate query optimization with Agent E.
- Coordinate test fixtures with Agent F.

