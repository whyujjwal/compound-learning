"""Tools the AI coach can call to inspect the learner's progress."""

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.review_log import ReviewLog, ReviewRating
from app.models.track import Track
from app.models.user import User
from app.services.stats_service import get_stats


def _aware(dt):
    if dt is None:
        return None
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "get_overall_stats",
        "description": (
            "Get high-level learning telemetry: total reviews, retention rate, streak, "
            "due cards, and per-track breakdown. Use this first when the user asks "
            "how they're doing overall."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_recent_reviews",
        "description": (
            "Get the most recent N review events with rating, track, material, and elapsed time. "
            "Useful for analyzing recent performance patterns or identifying problem areas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 20, "minimum": 1, "maximum": 100},
                "days": {"type": "integer", "default": 7, "minimum": 1, "maximum": 90},
            },
            "required": [],
        },
    },
    {
        "name": "get_due_cards",
        "description": "Get cards currently due for review, ordered by due date. Use to see what's coming up.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 20, "minimum": 1, "maximum": 100},
                "track_slug": {"type": "string", "description": "Optional track slug to filter (e.g. 'dsa')"},
            },
            "required": [],
        },
    },
    {
        "name": "get_struggling_cards",
        "description": (
            "Get cards the learner is struggling with — high lapses or low retrievability. "
            "Use when user asks what's hard or where they should focus."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "default": 10, "minimum": 1, "maximum": 50}},
            "required": [],
        },
    },
    {
        "name": "get_track_details",
        "description": "Deep dive into one track: materials, cards, retention for that domain.",
        "input_schema": {
            "type": "object",
            "properties": {"track_slug": {"type": "string", "description": "The track slug, e.g. 'dsa' or 'ai-math'"}},
            "required": ["track_slug"],
        },
    },
    {
        "name": "search_materials",
        "description": "Search materials by keyword in title or content. Use when user mentions a specific topic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "default": 10, "minimum": 1, "maximum": 30},
            },
            "required": ["query"],
        },
    },
    {
        "name": "list_tracks",
        "description": "List all tracks with their slugs, names, and material counts.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


class ToolExecutor:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user

    def execute(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        method = getattr(self, f"_tool_{name}", None)
        if not method:
            return {"error": f"Unknown tool: {name}"}
        try:
            return method(**arguments)
        except TypeError as e:
            return {"error": f"Invalid arguments: {e}"}
        except Exception as e:
            return {"error": f"Tool execution failed: {e}"}

    def _tool_get_overall_stats(self) -> dict[str, Any]:
        stats = get_stats(self.db, self.user)
        return {
            "total_reviews": stats.reviews_total,
            "reviews_today": stats.reviews_today,
            "reviews_this_week": stats.reviews_this_week,
            "retention_rate_percent": round(stats.retention_rate * 100, 1),
            "current_streak_days": stats.current_streak,
            "longest_streak_days": stats.longest_streak,
            "due_cards_now": stats.due_cards,
            "total_cards": stats.total_cards,
            "total_materials": stats.total_materials,
            "total_tracks": stats.total_tracks,
            "avg_review_seconds": stats.avg_review_seconds,
            "tracks": [
                {
                    "name": t.track_name,
                    "due": t.due_count,
                    "cards": t.card_count,
                    "materials": t.material_count,
                    "reviews": t.reviews_total,
                }
                for t in stats.track_breakdown
            ],
        }

    def _tool_get_recent_reviews(self, limit: int = 20, days: int = 7) -> dict[str, Any]:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        user_card_ids = select(Card.id).where(Card.user_id == self.user.id)
        logs = (
            self.db.query(ReviewLog)
            .join(Card, Card.id == ReviewLog.card_id)
            .join(StudyMaterial, StudyMaterial.id == Card.material_id)
            .join(Track, Track.id == StudyMaterial.track_id)
            .options(joinedload(ReviewLog.card).joinedload(Card.material).joinedload(StudyMaterial.track))
            .filter(ReviewLog.card_id.in_(user_card_ids), ReviewLog.reviewed_at >= cutoff)
            .order_by(desc(ReviewLog.reviewed_at))
            .limit(limit)
            .all()
        )
        return {
            "window_days": days,
            "count": len(logs),
            "reviews": [
                {
                    "when": log.reviewed_at.isoformat(),
                    "rating": log.rating.value,
                    "elapsed_seconds": log.elapsed_time_seconds,
                    "material": log.card.material.title,
                    "track": log.card.material.track.name,
                    "scheduled_interval_days": log.scheduled_interval_days,
                }
                for log in logs
            ],
        }

    def _tool_get_due_cards(self, limit: int = 20, track_slug: str | None = None) -> dict[str, Any]:
        now = datetime.now(UTC)
        q = (
            self.db.query(Card)
            .join(StudyMaterial)
            .join(Track)
            .options(joinedload(Card.material).joinedload(StudyMaterial.track))
            .filter(Card.user_id == self.user.id, Card.due_at <= now)
        )
        if track_slug:
            q = q.filter(Track.slug == track_slug)
        cards = q.order_by(Card.due_at.asc()).limit(limit).all()
        return {
            "count": len(cards),
            "cards": [
                {
                    "title": c.material.title,
                    "track": c.material.track.name,
                    "state": c.state.value,
                    "priority_percent": c.material.priority_percent,
                    "retrievability_percent": round(c.retrievability * 100, 1),
                    "stability_days": round(c.stability, 1),
                    "due_at": c.due_at.isoformat(),
                }
                for c in cards
            ],
        }

    def _tool_get_struggling_cards(self, limit: int = 10) -> dict[str, Any]:
        cards = (
            self.db.query(Card)
            .options(joinedload(Card.material).joinedload(StudyMaterial.track))
            .filter(Card.user_id == self.user.id, Card.reps > 0)
            .order_by(Card.lapses.desc(), Card.retrievability.asc())
            .limit(limit)
            .all()
        )
        return {
            "count": len(cards),
            "cards": [
                {
                    "title": c.material.title,
                    "track": c.material.track.name,
                    "lapses": c.lapses,
                    "reps": c.reps,
                    "retrievability_percent": round(c.retrievability * 100, 1),
                    "stability_days": round(c.stability, 1),
                    "difficulty": round(c.difficulty, 2),
                }
                for c in cards
            ],
        }

    def _tool_get_track_details(self, track_slug: str) -> dict[str, Any]:
        track = (
            self.db.query(Track)
            .filter(Track.user_id == self.user.id, Track.slug == track_slug)
            .first()
        )
        if not track:
            return {"error": f"Track '{track_slug}' not found"}

        materials = self.db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).all()
        cards = (
            self.db.query(Card)
            .join(StudyMaterial)
            .filter(StudyMaterial.track_id == track.id, Card.user_id == self.user.id)
            .all()
        )
        card_ids = [c.id for c in cards]
        log_count = (
            self.db.query(ReviewLog).filter(ReviewLog.card_id.in_(card_ids)).count() if card_ids else 0
        )
        successful = (
            self.db.query(ReviewLog)
            .filter(
                ReviewLog.card_id.in_(card_ids),
                ReviewLog.rating.in_([ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY]),
            )
            .count()
            if card_ids
            else 0
        )
        retention = round(successful / log_count * 100, 1) if log_count else 0.0
        now = datetime.now(UTC)

        return {
            "track": {
                "name": track.name,
                "slug": track.slug,
                "description": track.description,
                "cognitive_multiplier": track.cognitive_multiplier,
            },
            "material_count": len(materials),
            "card_count": len(cards),
            "due_count": sum(1 for c in cards if _aware(c.due_at) <= now),
            "review_count": log_count,
            "retention_percent": retention,
            "materials": [
                {
                    "title": m.title,
                    "priority_percent": m.priority_percent,
                    "estimated_minutes": m.estimated_minutes,
                }
                for m in materials[:25]
            ],
        }

    def _tool_search_materials(self, query: str, limit: int = 10) -> dict[str, Any]:
        like = f"%{query.lower()}%"
        materials = (
            self.db.query(StudyMaterial)
            .join(Track)
            .options(joinedload(StudyMaterial.track))
            .filter(
                Track.user_id == self.user.id,
                (func.lower(StudyMaterial.title).like(like))
                | (func.lower(StudyMaterial.raw_content).like(like)),
            )
            .limit(limit)
            .all()
        )
        return {
            "query": query,
            "count": len(materials),
            "matches": [
                {
                    "title": m.title,
                    "track": m.track.name,
                    "content_excerpt": (m.raw_content or "")[:200],
                    "priority_percent": m.priority_percent,
                }
                for m in materials
            ],
        }

    def _tool_list_tracks(self) -> dict[str, Any]:
        tracks = self.db.query(Track).filter(Track.user_id == self.user.id).all()
        return {
            "count": len(tracks),
            "tracks": [
                {
                    "slug": t.slug,
                    "name": t.name,
                    "description": t.description,
                    "is_system": t.is_system,
                }
                for t in tracks
            ],
        }
