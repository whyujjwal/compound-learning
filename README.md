# Compound

> An adaptive learning platform for advanced technical mastery — FSRS-6 spaced repetition, HEFT daily planning, and an AI coach with read-only access to your real progress.

Compound treats learning as a scheduling problem. Tell it what you want to master and it
**generates a personalized roadmap** — real tracks, curated internet resources, and a weekly
schedule — then keeps you on pace. Three engines collaborate:

| Engine | Role |
|---|---|
| **FSRS-6** | Models memory decay (Difficulty, Stability, Retrievability) and schedules reviews before you forget. |
| **Priority queue** | SuperMemo-style absolute priorities (0–100%); auto-postpones low-priority cards when daily budget is exceeded. Protects critical (0–10%) cards. |
| **HEFT planner** | Orders the daily session across morning/midday/afternoon/evening focus windows using upward-rank heuristics and cognitive cost. |

A fourth layer — **Coach** — is an AI advisor with tool access to your stats, recent reviews, struggling cards, and per-track breakdowns. Ask it natural questions about your progress.

---

## Personalized roadmaps

New users start with an empty library and build their own. On **Build roadmap**
(`/curriculum/build`) you describe your goals ("master backend engineering: Go, databases,
system design, distributed systems") and weekly hours. Compound asks the configured AI provider
to design a complete curriculum:

- **One track per goal** — ordered, beginner → advanced.
- **Real resources** — official docs, MIT OCW, freeCodeCamp, 3Blue1Brown, arXiv, etc. (no invented URLs).
- **A weekly schedule** — denser tracks earlier in the week, a light Sunday review block.
- **FSRS-aware priorities** — foundational items get lower `priority_percent` so they surface first.

The roadmap is previewed before you apply it ("Add to my library" or "Replace & start"), and the
generated weekly schedule is stored **per user** — the daily queue and HEFT planner read it directly.

---

## Stack

**Backend** — FastAPI · SQLAlchemy 2 · PostgreSQL · `py-fsrs` 6 · Anthropic/OpenAI SDK · pytest
**Frontend** — Next.js 15 (App Router) · React 19 · TypeScript · Instrument Serif + Geist + JetBrains Mono

---

## Run with Docker (recommended)

```bash
# Optional: enable Coach by exporting an AI key
export ANTHROPIC_API_KEY=sk-ant-...
# or: export OPENAI_API_KEY=sk-... AI_PROVIDER=openai AI_MODEL=gpt-4o

docker compose up --build
```

- App → http://localhost:3000
- API docs → http://localhost:8000/docs

The database is seeded automatically with four system tracks (DSA, AI Math, LLM & ML, System Design) and their full curricula.

---

## Run locally (without Docker)

```bash
# 1. PostgreSQL
docker compose up -d db   # or use a local postgres

# 2. Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # add ANTHROPIC_API_KEY here if you want Coach
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev
```

---

## The Coach

Coach is a multi-round tool-using agent. When you ask "how am I doing in DSA?", it calls `get_track_details(track_slug="dsa")`, reads the real numbers, and responds in context.

Available tools:

| Tool | What it sees |
|---|---|
| `get_overall_stats` | Totals, retention, streak, per-track summary |
| `get_recent_reviews` | Last N reviews with rating, track, elapsed time |
| `get_due_cards` | Cards due now, optionally filtered by track |
| `get_struggling_cards` | High-lapse / low-retrievability cards |
| `get_track_details` | Materials, retention, due count for one track |
| `search_materials` | Full-text search across all materials |
| `list_tracks` | All track slugs and metadata |

Conversations are persisted in PostgreSQL (`conversations`, `messages` tables) as long-term agent memory — you can revisit past coaching threads.

Coach gracefully degrades: without an API key, the chat UI still lets you create conversations and view history, but sending messages returns `503` with a clear setup hint.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                          │
│  • Today (review session, kbd shortcuts)                     │
│  • Coach (AI chat with conversation memory)                  │
│  • Tracks / Materials / Cards / Stats / Settings             │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST
┌────────────────────────▼─────────────────────────────────────┐
│  FastAPI                                                     │
│  /api/queue/daily      — HEFT + priority queue               │
│  /api/cards/{id}/review — FSRS-6 review                      │
│  /api/chat/*           — Coach (Anthropic / OpenAI tools)    │
│  /api/stats /tracks /materials /user                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│  PostgreSQL                                                  │
│  users, tracks, study_materials, cards, review_logs,         │
│  scheduler_parameters, conversations, messages               │
└──────────────────────────────────────────────────────────────┘
```

---

## Testing

```bash
cd backend && pytest -v
```

31 tests cover the queue, FSRS review flow, CRUD endpoints, stats, chat, auth-adjacent flows, catalog, sessions, and roadmap generation.

---

## Configuration

All settings via env vars (see `backend/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://compound:compound@localhost:5432/compound` | Postgres connection |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | `INFO` | Python logger level |
| `AI_PROVIDER` | `gemini` | `gemini`, `anthropic`, or `openai` |
| `AI_MODEL` | `gemini-2.5-flash` | Model identifier for the chosen provider |
| `ANTHROPIC_API_KEY` | _(empty)_ | Required if `AI_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | _(empty)_ | Required if `AI_PROVIDER=openai` |
| `GEMINI_API_KEY` | _(empty)_ | Required if `AI_PROVIDER=gemini` |
| `AI_MAX_TOKENS` | `2048` | Max tokens per Coach response |

---

## Design notes

- **Aesthetic** — "Scholar's Lamp": warm umber background, cream text, amber accent, Instrument Serif display italics, grain overlay. Rejects generic SaaS dark blue/purple.
- **Single-user** by design (`learner@compound.local`). Auth is intentionally out of scope; the data model supports adding it later (every row has a `user_id`).
- **FSRS-6** with 21-parameter weight arrays per track, allowing domain-specific memory profiles to emerge as you accumulate review logs.
- **No telemetry** leaves your machine. Coach only talks to the AI provider you configure.

---

## Project layout

```
backend/
  app/
    api/routes/         FastAPI endpoints
    models/             SQLAlchemy ORM
    schemas/            Pydantic request/response models
    services/           FSRS, HEFT, stats, AI tools, AI agent
    config.py, database.py, main.py
  tests/                pytest suite
  Dockerfile, requirements.txt, .env.example

frontend/
  app/                  Next.js App Router pages
  components/           Nav, ReviewSession, StatCard, Markdown
  lib/api.ts            Typed fetch client
  Dockerfile, package.json
```
