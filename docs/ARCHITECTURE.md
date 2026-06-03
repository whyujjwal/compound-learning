# Architecture

## Product surfaces

| Route | Purpose |
| --- | --- |
| `/` | Today — daily queue and continue action |
| `/library` | Private syllabi hub |
| `/library/[slug]` | Syllabus detail with tabs (Overview, Studio, Map, Materials, Practice, History) |
| `/library/new` | Manual syllabus creation |
| `/explore` | Public catalog and adopt |
| `/coach` | AI coach |
| `/progress` | Retention, streaks, activity (formerly `/stats`) |
| `/settings` | Preferences |

Legacy routes (`/curriculum`, `/track/[slug]`, `/stats`, `/tracks`, `/materials`, `/curriculum/build`) redirect to the surfaces above.

## Backend

- **Canonical API:** `backend/app/domains/syllabus/` — `/api/syllabi` with modules, materials, proposals, change history.
- **Proposal engine:** AI and manual edits share `ProposalOperation` types; apply/reject with version conflict detection.
- **AI updates:** `/api/syllabi/{id}/proposals/ai` and `/api/tracks/{id}/ai-updates` (default: proposal, not direct apply).
- **Legacy APIs:** `/api/tracks`, `/api/materials`, `/api/curriculum/*` remain for compatibility.

## Frontend

- **Feature folder:** `frontend/features/syllabus/` — types, API client, hooks, Studio, proposal diff UI.
- **Data:** TanStack Query (`frontend/lib/query/`) for syllabus list/detail caching.
- **Styles:** layered CSS under `frontend/styles/` (tokens, reset, primitives, feature CSS); `globals.css` imports layers and retains page-specific rules.

## Testing

- Backend: `cd backend && pytest -v`
- Frontend unit: `cd frontend && npm test`
- E2E smoke: `cd frontend && npm run test:e2e` (starts Next.js on port 3099)
