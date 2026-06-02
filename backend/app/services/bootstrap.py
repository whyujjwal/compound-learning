import logging
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.organization import MemberRole, Organization, OrganizationMember
from app.models.scheduler_params import DEFAULT_FSRS_WEIGHTS, SchedulerParameters
from app.models.track import Track
from app.models.user import User

logger = logging.getLogger("compound.bootstrap")

# Fallback seeds. The canonical track presentation (descriptions, colors,
# multipliers) lives in docs/curriculum.json and overwrites these on every boot
# via _sync_curriculum -> import_curriculum. Keep them in sync so the library
# reads consistently even before the curriculum sync runs.
SYSTEM_TRACKS = [
    {
        "slug": "dsa",
        "name": "Data Structures & Algorithms",
        "description": (
            "The Striver A2Z (takeUforward) sheet end to end \u2014 syntax through advanced "
            "strings across 50+ topic blocks. Every problem becomes an FSRS card you "
            "re-solve, so patterns stay reflexive for interviews."
        ),
        "color": "#22c55e",
        "cognitive_multiplier": 1.2,
    },
    {
        "slug": "ai-math",
        "name": "Mathematics for AI",
        "description": (
            "The math bedrock under ML, from the free Mathematics for Machine Learning "
            "book plus 3Blue1Brown intuition: linear algebra \u2192 calculus \u2192 "
            "probability \u2192 optimization \u2192 regression & PCA."
        ),
        "color": "#a87f9e",
        "cognitive_multiplier": 1.4,
    },
    {
        "slug": "llm-ml",
        "name": "LLM & Machine Learning",
        "description": (
            "Bottom-up from classical ML to frontier systems, anchored by Karpathy's "
            "Zero-to-Hero builds: neural nets from scratch \u2192 transformers \u2192 LLM "
            "training \u2192 alignment, RAG & agents \u2192 production, evals & MLOps."
        ),
        "color": "#e8a849",
        "cognitive_multiplier": 1.3,
    },
    {
        "slug": "system-design",
        "name": "System Design",
        "description": (
            "How real systems are designed and scaled: LLD patterns \u2192 distributed "
            "building blocks \u2192 HLD case studies \u2192 a GenAI-infra capstone "
            "(vector DBs, KV-cache, vLLM serving)."
        ),
        "color": "#0ea5e9",
        "cognitive_multiplier": 1.2,
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

    import_curriculum(
        db, user, load_file(curriculum_path), prune_orphans=True, set_schedule=False
    )
    from app.services.weekly_schedule import invalidate_schedule_cache

    invalidate_schedule_cache()


def _ensure_user_roadmap_columns(db: Session) -> None:
    """Idempotently add per-user roadmap columns for DBs created before 0004."""
    try:
        cols = {c["name"] for c in inspect(db.bind).get_columns("users")}
    except Exception:
        return
    statements = []
    if "weekly_schedule" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN weekly_schedule JSONB")
    if "learning_goals" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN learning_goals VARCHAR(2000)")
    if "onboarded" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT false")
    if "daily_new_cards" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN daily_new_cards INTEGER NOT NULL DEFAULT 0")
    for stmt in statements:
        db.execute(text(stmt))
    if statements:
        db.commit()
        logger.info("Applied %d boot-time user roadmap column migration(s)", len(statements))


def bootstrap(db: Session) -> None:
    _ensure_user_roadmap_columns(db)
    user = get_default_user(db)
    tracks = db.query(Track).filter(Track.user_id == user.id).all()
    for track in tracks:
        ensure_scheduler_params(db, user, track)
    db.commit()
