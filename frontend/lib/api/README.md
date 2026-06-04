# lib/api — Compound Frontend Data Layer

## Regenerating `schema.ts`

`schema.ts` is auto-generated from the backend OpenAPI spec. To regenerate it:

```bash
# 1. Dump the OpenAPI schema from the live backend app definition (no server needed)
cd /Users/ujjwalraj/compound/backend
.venv/bin/python -c "import json,sys; sys.path.insert(0,'.'); from app.main import app; print(json.dumps(app.openapi()))" > /tmp/compound-openapi.json

# 2. Generate TypeScript types
cd /Users/ujjwalraj/compound/frontend
npx openapi-typescript /tmp/compound-openapi.json -o lib/api/schema.ts
```

Then add the header comment back to the top of `schema.ts`:
```
// GENERATED from backend OpenAPI — do not edit by hand
```

## File structure

| File | Purpose |
|---|---|
| `schema.ts` | Generated types — all `paths`, `components`, and `operations` from backend OpenAPI |
| `client.ts` | Thin typed fetch wrapper — attaches auth + timezone headers, handles errors |
| `endpoints.ts` | Typed function for every backend operation the app uses |
| `types.ts` | Hand-written domain types (kept for backward compat with existing pages) |
| `index.ts` | Re-exports `api` object + all types |

## Hooks

Per-feature TanStack Query hooks live in `lib/hooks/`:

- `lib/hooks/useToday.ts` — Home/Today screen (daily queue, stats, extra queue)
- `lib/hooks/useSyllabi.ts` — Library list + detail
- `lib/hooks/useCourse.ts` — Course tree + roadmap (Studio)
- `lib/hooks/useExplore.ts` — Explore catalog + detail
- `lib/hooks/useProfile.ts` — Profile (user, stats, activity)
- `lib/hooks/useSession.ts` — Session/review (card, submit review)
- `lib/hooks/useBlock.ts` — Block sessions
- `lib/hooks/useAuth.ts` — Auth/login mutations
- `lib/hooks/useCurriculum.ts` — Curriculum overview + schedule

## Auth & Timezone

- Auth token is stored in `sessionStorage` + cookie via `lib/auth.ts`
- `client.ts` automatically reads the token and injects `Authorization: Bearer <token>`
- `client.ts` automatically injects `X-Compound-Timezone: <IANA tz>` on the client
- Server-side fetches use `lib/server-api.ts` which reads the cookie
