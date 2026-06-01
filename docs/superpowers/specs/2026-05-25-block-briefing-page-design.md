# Block Briefing Page — Design Spec

**Date:** 2026-05-25  
**Status:** Approved  
**Goal:** Replace card-by-card session flow with one scrollable block page that shows the full daily agenda.

## Problem

The daily loop (Today → session) feels disconnected. Users see one card at a time with no block context, progress lives in `sessionStorage`, and the session screen feels empty despite recent UI polish.

## Solution

**Approach 2 — Block Briefing Page:** One page per block (`/block/[slot]`) with a full checklist. Users work through items top-to-bottom, leave for external resources (LeetCode, YouTube), return to mark done and rate recall.

## Today Page

- Shows next incomplete block with checklist preview
- Primary CTA: **Open block** → `/block/{slot}`
- Auto-start navigates to `/block/{nextSlot}` directly
- Later blocks collapsed as "Up later today"

## Block Page (`/block/[slot]`)

- Header: block meta, progress bar (3/8), time remaining
- Accordion list: one item expanded at a time
- Collapsed row: title, type icon, time, status
- Expanded row: Watch / Do / Deliverable brief, Open ↗ link
- **Done working** → reveals recall prompts
- Rate (FSRS) → row collapses to ✓, next item auto-expands
- All items rated → block complete screen

## Backend: BlockSession

PostgreSQL record per user + date + slot:

| Field | Purpose |
|-------|---------|
| `card_ids` | Ordered snapshot of queue items |
| `current_index` | First incomplete item |
| `status` | `IN_PROGRESS` · `COMPLETED` |
| Block metadata | slot_label, track_name, track_slug |

### API

| Endpoint | Role |
|----------|------|
| `POST /api/blocks/{slot}/start` | Create/resume block session |
| `GET /api/blocks/{slot}` | Current state + hydrated items |
| `POST /api/blocks/{slot}/items/{card_id}/review` | FSRS rating + advance index |

## Deprecations

- `/session/[cardId]` redirects to `/block/{slot}#item-{cardId}` for daily blocks
- `sessionStorage` queue no longer used for daily flow
- Block completion tracked server-side; localStorage slot completion synced on complete

## Out of Scope

- Embedded video/player
- Real-time multi-tab sync
- Mid-block reordering
