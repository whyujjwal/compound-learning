import logging

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.models.organization import MemberRole, Organization, OrganizationMember
from app.models.scheduler_params import DEFAULT_FSRS_WEIGHTS, SchedulerParameters
from app.models.track import Track
from app.models.user import User

logger = logging.getLogger("compound.bootstrap")


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
