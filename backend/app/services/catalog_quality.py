from __future__ import annotations

from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_rating import TrackRating

TRUSTED_DOMAINS = (
    "github.com",
    "docs.",
    "developer.",
    "khanacademy.org",
    "freecodecamp.org",
    "mit.edu",
    "stanford.edu",
    "berkeley.edu",
    "coursera.org",
    "youtube.com",
    "youtu.be",
    "arxiv.org",
)


def score_material(material: StudyMaterial) -> tuple[str, float]:
    url = material.external_url or ""
    parsed = urlparse(url)
    score = 0.0
    status = "MISSING"
    if parsed.scheme in ("http", "https") and parsed.netloc:
        status = "CHECKED"
        score += 35
        if parsed.scheme == "https":
            score += 10
        host = parsed.netloc.lower()
        if any(domain in host for domain in TRUSTED_DOMAINS):
            score += 30
    if material.resource_type in {"quiz", "checkpoint", "project", "practice"}:
        score += 10
    if material.raw_content:
        lower = material.raw_content.lower()
        if any(word in lower for word in ("easy", "medium", "hard", "checkpoint", "quiz", "project")):
            score += 10
    if material.estimated_minutes > 0:
        score += 5
    return status, min(100.0, score)


def quality_breakdown(materials: list[StudyMaterial]) -> dict[str, float | int]:
    total = len(materials)
    if total == 0:
        return {
            "quality_score": 0.0,
            "resource_score": 0.0,
            "quiz_count": 0,
            "project_count": 0,
            "practice_count": 0,
            "hard_count": 0,
            "module_count": 0,
        }
    modules = {m.block_label or "Core" for m in materials}
    quiz_count = sum(1 for m in materials if (m.resource_type or "").lower() in {"quiz", "checkpoint"})
    project_count = sum(1 for m in materials if (m.resource_type or "").lower() == "project")
    practice_count = sum(1 for m in materials if (m.resource_type or "").lower() == "practice")
    hard_count = sum(1 for m in materials if "hard" in f"{m.title} {m.raw_content or ''}".lower())
    resource_score = sum(m.resource_quality_score or score_material(m)[1] for m in materials) / total
    coverage = min(100.0, (len(modules) / 5) * 28 + (quiz_count / max(1, len(modules))) * 24 + project_count * 10 + practice_count * 5 + hard_count * 4)
    quality_score = round(min(100.0, resource_score * 0.52 + coverage * 0.48), 1)
    return {
        "quality_score": quality_score,
        "resource_score": round(resource_score, 1),
        "quiz_count": quiz_count,
        "project_count": project_count,
        "practice_count": practice_count,
        "hard_count": hard_count,
        "module_count": len(modules),
    }


def refresh_track_quality(db: Session, track: Track) -> dict[str, float | int]:
    materials = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).all()
    for material in materials:
        status, score = score_material(material)
        material.resource_health_status = status
        material.resource_quality_score = score
    breakdown = quality_breakdown(materials)
    track.quality_score = float(breakdown["quality_score"])
    return breakdown


def refresh_track_rating(db: Session, track: Track) -> None:
    ratings = db.query(TrackRating).filter(TrackRating.track_id == track.id).all()
    track.rating_count = len(ratings)
    track.rating_avg = round(sum(r.rating for r in ratings) / len(ratings), 2) if ratings else 0.0


def rank_score(track: Track, material_count: int) -> float:
    return round(
        track.star_count * 10
        + track.adoption_count * 14
        + track.rating_avg * 12
        + track.rating_count * 3
        + track.quality_score * 0.7
        + material_count * 0.6
        + (30 if track.is_featured else 0),
        2,
    )
