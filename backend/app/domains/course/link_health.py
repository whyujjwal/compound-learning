"""Re-check material URLs and persist health/quality."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.domains.course.link_check import verify_url
from app.models.material import StudyMaterial


def recheck_links(db: Session, *, limit: int | None = None) -> dict[str, int]:
    query = db.query(StudyMaterial).filter(StudyMaterial.external_url.isnot(None))
    if limit:
        query = query.limit(limit)
    stats: dict[str, int] = {"checked": 0, "ok": 0, "broken": 0, "unknown": 0}
    for material in query.all():
        status, score = verify_url(material.external_url)
        material.resource_health_status = status
        material.resource_quality_score = score
        stats["checked"] += 1
        key = status.lower()
        stats[key] = stats.get(key, 0) + 1
    db.commit()
    return stats
