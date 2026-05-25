from pathlib import Path

from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.scheduler_params import DEFAULT_FSRS_WEIGHTS, SchedulerParameters
from app.models.track import Track
from app.models.user import User

SYSTEM_TRACKS = [
    {
        "slug": "dsa",
        "name": "Data Structures & Algorithms",
        "description": "Striver A2Z / NeetCode 150 pattern-based progression",
        "color": "#22c55e",
        "cognitive_multiplier": 1.2,
    },
    {
        "slug": "ai-math",
        "name": "AI Foundations & LLM Engineering",
        "description": "Deisenroth math, transformers, alignment, RAG, agents",
        "color": "#8b5cf6",
        "cognitive_multiplier": 1.4,
    },
    {
        "slug": "system-design",
        "name": "Distributed System Design",
        "description": "LLD/HLD, caching, async, CAP, GenAI infrastructure",
        "color": "#f59e0b",
        "cognitive_multiplier": 1.1,
    },
]

SEED_MATERIALS = {
    "dsa": [
        {
            "title": "Two Sum — Hash Map Pattern",
            "raw_content": "Use a hash map to store complements. For each nums[i], check if target - nums[i] exists. O(n) time, O(n) space.",
            "external_url": "https://leetcode.com/problems/two-sum/",
            "estimated_minutes": 15,
            "priority_percent": 5,
        },
        {
            "title": "Sliding Window Maximum",
            "raw_content": "Monotonic deque stores indices in decreasing value order. Front is always the window max. Pop from back when adding smaller elements.",
            "estimated_minutes": 25,
            "priority_percent": 15,
        },
        {
            "title": "Binary Search on Answer Space",
            "raw_content": "When answer is monotonic (feasible/infeasible split), binary search the answer range. Template: while lo < hi, mid = (lo+hi+1)//2, check feasibility.",
            "estimated_minutes": 20,
            "priority_percent": 20,
        },
    ],
    "ai-math": [
        {
            "title": "Matrix Calculus — Chain Rule",
            "raw_content": "For y = f(g(x)), dy/dx = (df/dg)(dg/dx). Jacobian generalizes to vector-valued functions. Backprop is reverse-mode autodiff applying chain rule.",
            "estimated_minutes": 30,
            "priority_percent": 10,
        },
        {
            "title": "Attention Mechanism",
            "raw_content": "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V. Queries attend to keys; values are weighted sums. Multi-head splits into parallel subspaces.",
            "estimated_minutes": 25,
            "priority_percent": 15,
        },
    ],
    "system-design": [
        {
            "title": "Cache-Aside Pattern",
            "raw_content": "App checks cache first. On miss, read DB, populate cache, return. On write, update DB then invalidate cache. Simple but stale reads possible between write and invalidate.",
            "estimated_minutes": 15,
            "priority_percent": 10,
        },
        {
            "title": "CAP Theorem",
            "raw_content": "Under partition, choose Consistency (all nodes see same data) or Availability (every request gets response). CP: HBase, ZooKeeper. AP: Cassandra, DynamoDB.",
            "estimated_minutes": 20,
            "priority_percent": 15,
        },
    ],
}


def get_default_user(db: Session) -> User:
    user = db.query(User).filter(User.email == "learner@compound.local").first()
    if user:
        return user
    user = User(email="learner@compound.local")
    db.add(user)
    db.flush()
    seed_system_tracks(db, user)
    db.commit()
    db.refresh(user)
    return user


def seed_system_tracks(db: Session, user: User) -> None:
    for track_data in SYSTEM_TRACKS:
        track = Track(user_id=user.id, is_system=True, **track_data)
        db.add(track)
        db.flush()
        ensure_scheduler_params(db, user, track)


def seed_demo_materials(db: Session, user: User) -> None:
    tracks = {t.slug: t for t in db.query(Track).filter(Track.user_id == user.id).all()}
    for slug, materials in SEED_MATERIALS.items():
        track = tracks.get(slug)
        if not track:
            continue
        existing = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).count()
        if existing > 0:
            continue
        for item in materials:
            material = StudyMaterial(track_id=track.id, **item)
            db.add(material)
            db.flush()
            db.add(Card(user_id=user.id, material_id=material.id))


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


def _maybe_import_curriculum(db: Session, user: User) -> None:
    """Import bundled curriculum when the user has no materials yet."""
    material_count = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(Track.user_id == user.id)
        .count()
    )
    if material_count >= 10:
        return

    curriculum_path = Path(__file__).resolve().parents[3] / "docs" / "curriculum.json"
    if not curriculum_path.exists():
        return

    from app.services.curriculum_loader import import_curriculum, load_file

    import_curriculum(db, user, load_file(curriculum_path))


def bootstrap(db: Session) -> None:
    user = get_default_user(db)
    tracks = db.query(Track).filter(Track.user_id == user.id).all()
    for track in tracks:
        ensure_scheduler_params(db, user, track)
    _maybe_import_curriculum(db, user)
    db.commit()
