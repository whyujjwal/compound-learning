# Compound Engagement System — Design

Date: 2026-06-10
Status: Building (autonomous session — themes: engagement & gamification, AI & coaching, learning mechanics)

## Goal

Turn the spaced-repetition habit into a rewarding, game-like loop **without gimmicks** —
matching Compound's Notion-grade restraint. The loop: *review → earn XP → level up → unlock
achievements → keep your streak*. Every signal is honest (can't be gamed by mis-rating).

This is increment 1 of a progressive build. Later increments: AI coaching upgrades, new
learning mechanics (drill/cram modes, deeper analytics).

## Pillars

### 1. XP & Levels
- **Award:** every review grants a flat **10 XP** (the *act* of reviewing is the valued
  behavior). First-ever review of a card grants a **+10 discovery bonus**. XP is rating-
  agnostic on purpose — we never incentivize dishonest grading, which would poison FSRS.
- **Storage:** `users.xp_total` (int, cumulative). Awarded atomically inside
  `fsrs_service.review_card` (the single choke-point for both card and block review paths).
- **Level curve:** `xp_for_level(L) = 50 * L * (L - 1)` → level 1 = 0, L2 = 100, L3 = 300,
  L4 = 600, L5 = 1000 … Roughly 7–10 reviews per early level, widening over time.
  `level(xp) = floor((1 + sqrt(1 + 4*xp/50)) / 2)`. Progress = xp into current level /
  xp span to next level.

### 2. Achievements / Badges
- **Catalog:** code-defined (not user-editable), each with `slug, title, description, icon
  (emoji), category, metric, threshold`. ~18 across categories: Streak, Volume, Mastery,
  Consistency, Level, Special.
- **Storage:** `user_achievements(user_id, slug, unlocked_at)` — unique `(user_id, slug)`.
- **Evaluation:** after each review, `gamification_service.evaluate_achievements(db, user)`
  computes the current metric snapshot, unlocks any newly-satisfied achievements, and
  returns the newly-unlocked list so the UI can celebrate. Idempotent (insert-if-absent).
- **Metrics available:** total reviews, current/longest streak, level, materials mastered,
  days active (30d), retention, daily-goal hits. Progress toward locked achievements is
  shown (e.g. 64/100 reviews).

### 3. Surfacing (smooth, premium UI)
- **Today screen:** a compact Level ring (level + XP-to-next progress) and "+XP today"
  alongside the existing streak. Animated count-up.
- **Profile:** an Achievements wall (unlocked vs locked-with-progress), level/XP card.
- **Session complete:** XP earned this session + any unlock celebration.
- **Toast:** achievement-unlock toast (uses existing ToastProvider) with the badge icon.

## Data model changes
- `users.xp_total INT NOT NULL DEFAULT 0`.
- New table `user_achievements`: `id (uuid pk)`, `user_id (fk users)`, `slug (str)`,
  `unlocked_at (datetime)`, unique `(user_id, slug)`.
- Alembic: `0016_gamification` (down_revision `0015_user_streak_freeze`).

## API
- Extend `StatsResponse` with `xp_total, level, level_xp_into, level_xp_span,
  achievements_unlocked` (additive, defaults keep old clients working).
- New router `gamification` (`/api/gamification`):
  - `GET /profile` → `{ xp_total, level, level_xp_into, level_xp_span, next_level,
    achievements: AchievementView[] }`.
- `ReviewResponse` and the block review response gain an optional
  `newly_unlocked: AchievementView[]` (default `[]`) so the moment can be celebrated.

## Service design (`app/services/gamification_service.py`)
- `XP_PER_REVIEW = 10`, `XP_DISCOVERY_BONUS = 10`.
- `award_review_xp(user, *, is_first_review) -> int` — pure increment of `user.xp_total`.
- `xp_for_level(level) / level_for_xp(xp) / level_progress(xp)` — pure math, unit-tested.
- `ACHIEVEMENTS: list[AchievementDef]` — the catalog.
- `current_metrics(db, user) -> dict` — snapshot from existing stats primitives.
- `evaluate_achievements(db, user) -> list[AchievementDef]` — unlock + return newly-unlocked.
- `get_profile(db, user) -> dict` — full view with per-achievement unlocked/progress.

## Testing (TDD)
- Pure math: level curve monotonic, boundaries exact, progress in [0,1).
- XP awarding: 10 per review, +10 on first review, accumulates across reviews.
- Achievements: first-review unlock, volume threshold, streak threshold, idempotency
  (re-eval doesn't duplicate), newly-unlocked returns only the delta.
- API: `/gamification/profile` shape; stats includes xp/level; review response carries
  newly-unlocked on a threshold-crossing review.

## Non-negotiables honored
- Preserve user data; additive migration only. Old APIs unchanged. No mis-rating incentive.
- Streak-freeze double-award guard: XP is per-review and rating-agnostic, so grace days
  don't create XP; achievements read the (already freeze-aware) streak value.
