import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.organization import MemberRole, Organization, OrganizationMember
from app.models.scheduler_params import DEFAULT_FSRS_WEIGHTS, SchedulerParameters
from app.models.track import Track
from app.models.user import User

logger = logging.getLogger("compound.bootstrap")

SYSTEM_TRACKS = [
    {
        "slug": "dsa",
        "name": "Data Structures & Algorithms",
        "description": "Striver A2Z — patterns + spaced re-solving, at your own pace",
        "color": "#22c55e",
        "cognitive_multiplier": 1.2,
    },
    {
        "slug": "ai-math",
        "name": "Mathematics for AI",
        "description": "Linear algebra, probability, optimization — the math behind ML",
        "color": "#8b5cf6",
        "cognitive_multiplier": 1.4,
    },
    {
        "slug": "llm-ml",
        "name": "LLM & Machine Learning",
        "description": "Karpathy builds, transformers, RAG, alignment",
        "color": "#6366f1",
        "cognitive_multiplier": 1.3,
    },
    {
        "slug": "system-design",
        "name": "System Design",
        "description": "LLD/HLD, distributed systems, GenAI infrastructure",
        "color": "#f59e0b",
        "cognitive_multiplier": 1.1,
    },
]


def get_default_user(db: Session) -> User:
    user = db.query(User).filter(User.email == "learner@compound.local").first()
    if user:
        return user
    user = User(email="learner@compound.local", display_name="Learner")
    user.daily_study_minutes = 120
    user.target_retention = 0.90
    db.add(user)
    db.flush()
    seed_system_tracks(db, user)
    seed_default_organization(db, user)
    db.commit()
    db.refresh(user)
    return user


def seed_default_organization(db: Session, user: User) -> None:
    org = db.query(Organization).filter(Organization.slug == "compound").first()
    if not org:
        org = Organization(
            name="Compound",
            slug="compound",
            description="Default learning organization",
        )
        db.add(org)
        db.flush()
    existing = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id, OrganizationMember.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(
            OrganizationMember(
                organization_id=org.id,
                user_id=user.id,
                role=MemberRole.ADMIN,
            )
        )


def seed_system_tracks(db: Session, user: User) -> None:
    for track_data in SYSTEM_TRACKS:
        track = Track(user_id=user.id, is_system=True, **track_data)
        db.add(track)
        db.flush()
        ensure_scheduler_params(db, user, track)


def ensure_scheduler_params(db: Session, user: User, track: Track) -> None:
    existing = (
        db.query(SchedulerParameters)
        .filter(
            SchedulerParameters.user_id == user.id,
            SchedulerParameters.track_id == track.id,
        )
        .first()
    )
    if existing:
        if len(existing.weights) != len(DEFAULT_FSRS_WEIGHTS):
            existing.weights = list(DEFAULT_FSRS_WEIGHTS)
            db.commit()
        return
    db.add(
        SchedulerParameters(
            user_id=user.id,
            track_id=track.id,
            weights=list(DEFAULT_FSRS_WEIGHTS),
        )
    )
    db.commit()


def _sync_curriculum(db: Session, user: User) -> None:
    curriculum_path = Path(__file__).resolve().parents[3] / "docs" / "curriculum.json"
    if not curriculum_path.exists():
        return

    from app.services.curriculum_loader import import_curriculum, load_file

    import_curriculum(db, user, load_file(curriculum_path), prune_orphans=True)
    from app.services.weekly_schedule import invalidate_schedule_cache

    invalidate_schedule_cache()


def bootstrap(db: Session) -> None:
    user = get_default_user(db)
    tracks = db.query(Track).filter(Track.user_id == user.id).all()
    for track in tracks:
        ensure_scheduler_params(db, user, track)
    _sync_curriculum(db, user)
    db.commit()
