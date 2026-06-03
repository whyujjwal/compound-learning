# Compound — Frontend Rebuild (Notion-grade) + Backend Cleanup

**Date:** 2026-06-04
**Status:** Approved design, pre-implementation
**Owner:** orchestrated by Claude; heavy lifting by dispatched Sonnet subagents

## Goal

Rebuild the Compound frontend from scratch with a clean, Notion-grade design system
(light + dark), regenerate the data layer from the live backend contract, and in parallel
remove dead code from the FastAPI backend. The backend's behavior and API contract are
**not** changing — only its dead weight is removed.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Redesign scope | Full frontend rebuild against the existing API |
| Backend | Cleanup only (dead code), in **parallel** with the rebuild; no behavior change |
| Theme | **Light default + dark from day one**, token-driven |
| Data layer | **Rebuilt**, with the backend **OpenAPI schema as the authoritative contract** |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`, CSS-variable tokens for light/dark) |
| Review cadence | Agents **run to completion**; Claude reviews & fixes; final result presented |
| Execution | Sonnet subagents do the heavy lifting; Claude scopes, dispatches, reviews |

## Non-goals

- No change to backend business logic, FSRS engine, scheduling, or API response shapes.
- No data migrations beyond removing provably-unused ones.
- No new product features. This is a visual + structural rebuild of existing surfaces.

## Design language — "Compound, Notion-grade"

Reverses the current moody-dark-premium theme (near-black `#07070a`, bronze accent, serif
display, film grain, ambient gradients, "hairlines never solid borders") in favor of Notion's
restraint.

**Tokens (CSS variables, switched by `data-theme`):**

- **Light:** canvas `#ffffff`; warm off-white panel `#f7f7f5`; text `#37352f`;
  muted text `#787774`; **real 1px solid hairline** `rgba(0,0,0,.09)`; accent (links/primary
  only) Notion blue `#2383e2`.
- **Dark:** canvas `#191919`; surface `#2f2f2f`; text `#d4d4d4`; muted `#9b9b9b`;
  hairline `rgba(255,255,255,.094)`; accent `#2383e2`.
- Small radii (~4px). Shadows only on floating elements (menus, popovers, dialogs).
  Generous whitespace. Hover-gray rows. **No** grain, gradients, bronze, or serif display.
- Type: sans-serif throughout (Geist/Inter system stack); mono for code only.

Tailwind v4 `@theme` maps these tokens to utilities; `data-theme="dark"` overrides the
CSS variables so utilities and custom CSS both flip with one attribute.

## Architecture

- **Stack unchanged:** Next.js 15 App Router · React 19 · TypeScript. Add Tailwind v4.
- **Shell:** quiet collapsible left sidebar (workspace + 4-destination nav + syllabus list)
  → max-width content column → optional right panel. Keep `cmdk` command palette.
- **Data layer (rebuilt):** generate TS types from the backend `/openapi.json`; thin typed
  fetch client; per-feature react-query hooks. Timezone header (`X-Compound-Timezone`) and
  auth handling preserved from the current contract.
- **Build on a new branch**, screen by screen; **legacy redirect routes preserved** so old
  links don't 404; swap when green.

## Screen inventory (rebuild targets)

Legacy routes already reduced to 4–6 line redirects (`cards`, `tracks`, `track`, `progress`,
`stats`, `settings`, `schedule`, `coach`, `materials`, `curriculum`, `team`, `graph`) — keep
as redirects.

| Group | Routes | Notes |
|---|---|---|
| Home / Today | `/` | Daily queue + coach panel |
| Library | `/library`, `/library/[slug]`, `/library/new` | Syllabus list; Outline/Roadmap tabs; AI generation wizard |
| Studio / Creator | `/library/[slug]` studio, `/creator/[id]` | Syllabus editing + AI proposal diff/apply |
| Explore | `/explore`, `/explore/[id]` | Catalog browse + detail |
| Profile | `/profile` | Identity + progress + study prefs |
| Session | `/session/[cardId]` | Core flashcard review loop (largest screen) |
| Block | `/block/[slot]` | Focus-window session |
| Login | `/login`, `/login/callback` | Auth |

## Execution plan (Sonnet subagents)

**Phase 1 — Foundations (parallel):**
1. **Backend cleanup** — find & remove dead endpoints/modules/unused deps/provably-unused
   migrations; `pytest` stays green; no contract change.
2. **Design system + shell** — Tailwind v4 setup, token system (light/dark), primitive
   components, app shell (sidebar/content/right panel), command palette.
3. **Data layer** — regenerate types + typed client + react-query hooks from `/openapi.json`.

**Phase 2 — Screens (fan-out, one agent per group):** Home, Library+Studio, Explore,
Profile, Session, Block, Login — each built on the Phase-1 foundation and wired to the new
hooks.

**Phase 3 — Integration & polish:** wire routing/redirects, dark-mode audit, accessibility
pass, `typecheck` + `vitest` + `playwright` green, remove the old `styles/` and dead
components, swap.

## Definition of done

- All real screens rebuilt in the new Tailwind design system, light + dark.
- Data layer regenerated and type-checked against the live backend `/openapi.json`.
- Backend dead code removed; backend tests green.
- `npm run typecheck`, `vitest run`, and `playwright test` all green.
- Old `styles/` (~8.3k lines CSS) and superseded components removed.

## Risks & mitigations

- **Rebuilding the data layer re-litigates a working contract** → mitigated by generating
  from `/openapi.json` (authoritative), not by hand.
- **Run-to-completion = less mid-flight steering** → Claude reviews every agent's output and
  fixes before integration; final result presented for inspection before merge.
- **Legacy links** → redirect routes kept.
- **Dark-mode regressions** → both themes built into tokens from day one and audited in Phase 3.
