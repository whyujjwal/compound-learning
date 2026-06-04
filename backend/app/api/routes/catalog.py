from collections import defaultdict
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.catalog_collection import CatalogCollection, CatalogCollectionItem
from app.models.material import StudyMaterial
from app.models.track import Track
from app.models.track_rating import TrackRating
from app.models.track_star import TrackStar
from app.models.user import User
from app.services.catalog_batch import catalog_list_item, load_catalog_batch
from app.services.catalog_quality import quality_breakdown, rank_score, refresh_track_quality, refresh_track_rating
from app.services.syllabus import clean_list, default_outcomes, syllabus_modules

router = APIRouter(prefix="/catalog", tags=["catalog"])


class CatalogTrackResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    description: str | None
    color: str
    creator_name: str | None = None
    creator_id: UUID
    material_count: int
    module_count: int
    star_count: int
    adoption_count: int
    rating_count: int
    rating_avg: float
    quality_score: float
    is_featured: bool
    is_starred: bool
    already_in_library: bool = False
    rank_score: float
    source_track_id: UUID | None = None
    learning_outcomes: list[str] = []
    prerequisites: list[str] = []
    target_audience: str | None = None
    estimated_hours: int | None = None
    difficulty: str | None = None
    syllabus_summary: str | None = None
    syllabus_preview: list[str] = []
    created_at: datetime
    published_at: datetime | None = None


class CatalogMaterialPreview(BaseModel):
    id: UUID
    module_id: UUID | None = None
    title: str
    external_url: str | None
    block_label: str | None
    resource_type: str | None
    difficulty: str | None = None
    estimated_minutes: int
    sequence: int
    resource_health_status: str = "UNKNOWN"
    resource_quality_score: float = 0.0


class CatalogModulePreview(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    objective: str
    sequence: int
    estimated_minutes: int
    difficulty: str
    quiz_prompt: str | None = None
    project_prompt: str | None = None
    material_count: int
    materials: list[CatalogMaterialPreview] = []


class CatalogTrackDetail(CatalogTrackResponse):
    materials: list[CatalogMaterialPreview]
    modules: list[CatalogModulePreview]
    quality: dict


class AdoptTrackResponse(BaseModel):
    track_id: UUID
    slug: str
    materials_created: int


class RateTrackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    note: str | None = Field(default=None, max_length=1000)


class CatalogCollectionResponse(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str | None
    tracks: list[CatalogTrackResponse]


class CreatorProfileResponse(BaseModel):
    id: UUID
    display_name: str | None
    track_count: int
    total_stars: int
    total_adoptions: int
    avg_rating: float
    tracks: list[CatalogTrackResponse]


class LeaderboardResponse(BaseModel):
    tracks: list[CatalogTrackResponse]
    creators: list[CreatorProfileResponse]


class ExplorePageResponse(BaseModel):
    """Single payload for the Explore page (avoids multiple round-trips from the web app)."""

    tracks: list[CatalogTrackResponse]
    collections: list[CatalogCollectionResponse]
    leaderboards: LeaderboardResponse


def _unique_slug(db: Session, user: User, base: str) -> str:
    slug = base
    i = 2
    while db.query(Track).filter(Track.user_id == user.id, Track.slug == slug).first():
        slug = f"{base}-{i}"
        i += 1
    return slug


def _public_tracks_query(
    db: Session,
    *,
    q: str | None,
    featured: bool,
    sort: str,
):
    query = db.query(Track).filter(Track.is_public.is_(True), Track.is_system.is_(False))
    if featured:
        query = query.filter(Track.is_featured.is_(True))
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Track.name.ilike(needle),
                Track.description.ilike(needle),
                Track.generation_prompt.ilike(needle),
                Track.id.in_(
                    db.query(StudyMaterial.track_id).filter(
                        or_(
                            StudyMaterial.title.ilike(needle),
                            StudyMaterial.block_label.ilike(needle),
                            StudyMaterial.resource_type.ilike(needle),
                        )
                    )
                ),
            )
        )
    if sort == "stars":
        query = query.order_by(Track.star_count.desc(), Track.created_at.desc())
    elif sort == "new":
        query = query.order_by(Track.created_at.desc())
    else:
        query = query.order_by(
            Track.is_featured.desc(),
            Track.quality_score.desc(),
            Track.star_count.desc(),
            Track.adoption_count.desc(),
            Track.created_at.desc(),
        )
    return query


def _catalog_list_responses(db: Session, tracks: list[Track], user: User) -> list[CatalogTrackResponse]:
    ctx = load_catalog_batch(db, tracks, user)
    return [catalog_list_item(track, user, ctx, response_cls=CatalogTrackResponse) for track in tracks]


def _creator_totals(db: Session, creator_id: UUID) -> tuple[int, int, int, float]:
    row = (
        db.query(
            func.count(Track.id),
            func.coalesce(func.sum(Track.star_count), 0),
            func.coalesce(func.sum(Track.adoption_count), 0),
            func.avg(case((Track.rating_count > 0, Track.rating_avg), else_=None)),
        )
        .filter(Track.user_id == creator_id, Track.is_public.is_(True))
        .one()
    )
    track_count = int(row[0] or 0)
    total_stars = int(row[1] or 0)
    total_adoptions = int(row[2] or 0)
    avg_rating = round(float(row[3] or 0), 2) if row[3] is not None else 0.0
    return track_count, total_stars, total_adoptions, avg_rating


def _catalog_response(db: Session, track: Track, user: User) -> CatalogTrackResponse:
    materials = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).all()
    modules = syllabus_modules(db, track, materials)
    refresh_track_quality(db, track)
    starred = (
        db.query(TrackStar)
        .filter(TrackStar.track_id == track.id, TrackStar.user_id == user.id)
        .first()
        is not None
    )
    creator = db.query(User).filter(User.id == track.user_id).first()
    return CatalogTrackResponse(
        id=track.id,
        slug=track.slug,
        name=track.name,
        description=track.description,
        color=track.color,
        creator_name=creator.display_name if creator else None,
        creator_id=track.user_id,
        material_count=len(materials),
        module_count=len(modules),
        star_count=track.star_count,
        adoption_count=track.adoption_count,
        rating_count=track.rating_count,
        rating_avg=track.rating_avg,
        quality_score=track.quality_score,
        is_featured=track.is_featured,
        is_starred=starred,
        already_in_library=(
            db.query(Track.id)
            .filter(Track.user_id == user.id, Track.source_track_id == track.id)
            .first()
            is not None
        ),
        rank_score=rank_score(track, len(materials)),
        source_track_id=track.source_track_id,
        learning_outcomes=clean_list(track.learning_outcomes) or default_outcomes(track, len(modules)),
        prerequisites=clean_list(track.prerequisites),
        target_audience=track.target_audience,
        estimated_hours=track.estimated_hours or max(1, round(sum(m.estimated_minutes for m in materials) / 60)) if materials else track.estimated_hours,
        difficulty=track.difficulty,
        syllabus_summary=track.syllabus_summary or track.description,
        syllabus_preview=[m["title"] for m in modules[:5]],
        created_at=track.created_at,
        published_at=track.published_at,
    )


@router.get("/explore", response_model=ExplorePageResponse)
def get_explore_page(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExplorePageResponse:
    _ensure_default_collections(db)
    explore_tracks = _public_tracks_query(db, q=None, featured=False, sort="ranking").offset(0).limit(100).all()
    leaderboard_tracks = (
        _public_tracks_query(db, q=None, featured=False, sort="ranking").offset(0).limit(20).all()
    )

    collections_meta = (
        db.query(CatalogCollection)
        .order_by(CatalogCollection.sort_order.asc(), CatalogCollection.title.asc())
        .offset(0)
        .limit(12)
        .all()
    )
    collection_ids = [c.id for c in collections_meta]
    tracks_by_collection: dict[UUID, list[Track]] = defaultdict(list)
    if collection_ids:
        rows = (
            db.query(CatalogCollectionItem, Track)
            .join(Track, CatalogCollectionItem.track_id == Track.id)
            .filter(CatalogCollectionItem.collection_id.in_(collection_ids), Track.is_public.is_(True))
            .order_by(
                CatalogCollectionItem.collection_id.asc(),
                CatalogCollectionItem.sort_order.asc(),
                Track.star_count.desc(),
            )
            .all()
        )
        for item, track in rows:
            bucket = tracks_by_collection[item.collection_id]
            if len(bucket) < 8:
                bucket.append(track)

    unique: dict[UUID, Track] = {}
    for track in (*explore_tracks, *leaderboard_tracks):
        unique[track.id] = track
    for coll_tracks in tracks_by_collection.values():
        for track in coll_tracks:
            unique[track.id] = track

    creator_ids: list[UUID] = []
    for track in leaderboard_tracks:
        if track.user_id not in creator_ids:
            creator_ids.append(track.user_id)
    creator_tracks_by_id: dict[UUID, list[Track]] = {}
    for creator_id in creator_ids[:10]:
        creator_tracks = (
            db.query(Track)
            .filter(Track.user_id == creator_id, Track.is_public.is_(True))
            .order_by(Track.star_count.desc(), Track.created_at.desc())
            .limit(10)
            .all()
        )
        creator_tracks_by_id[creator_id] = creator_tracks
        for t in creator_tracks:
            unique[t.id] = t

    ctx = load_catalog_batch(db, list(unique.values()), user)

    track_responses = [catalog_list_item(t, user, ctx, response_cls=CatalogTrackResponse) for t in explore_tracks]
    collection_responses = [
        CatalogCollectionResponse(
            id=c.id,
            slug=c.slug,
            title=c.title,
            description=c.description,
            tracks=[catalog_list_item(t, user, ctx, response_cls=CatalogTrackResponse) for t in tracks_by_collection[c.id]],
        )
        for c in collections_meta
    ]

    leaderboard_track_responses = [
        catalog_list_item(t, user, ctx, response_cls=CatalogTrackResponse) for t in leaderboard_tracks
    ]
    creator_profiles: list[CreatorProfileResponse] = []
    for creator_id in creator_ids[:10]:
        creator = db.query(User).filter(User.id == creator_id).first()
        if not creator:
            continue
        track_count, total_stars, total_adoptions, avg_rating = _creator_totals(db, creator.id)
        creator_tracks = creator_tracks_by_id.get(creator_id, [])
        creator_profiles.append(
            CreatorProfileResponse(
                id=creator.id,
                display_name=creator.display_name,
                track_count=track_count,
                total_stars=total_stars,
                total_adoptions=total_adoptions,
                avg_rating=avg_rating,
                tracks=[catalog_list_item(t, user, ctx, response_cls=CatalogTrackResponse) for t in creator_tracks],
            )
        )

    return ExplorePageResponse(
        tracks=track_responses,
        collections=collection_responses,
        leaderboards=LeaderboardResponse(tracks=leaderboard_track_responses, creators=creator_profiles),
    )


@router.get("/tracks", response_model=list[CatalogTrackResponse])
def list_catalog_tracks(
    q: str | None = Query(default=None),
    featured: bool = False,
    sort: str = Query(default="ranking", pattern="^(ranking|stars|new)$"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CatalogTrackResponse]:
    tracks = _public_tracks_query(db, q=q, featured=featured, sort=sort).offset(offset).limit(limit).all()
    return _catalog_list_responses(db, tracks, user)


@router.get("/tracks/{track_id}", response_model=CatalogTrackDetail)
def get_catalog_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CatalogTrackDetail:
    track = db.query(Track).filter(Track.id == track_id, Track.is_public.is_(True)).first()
    if not track:
        raise HTTPException(status_code=404, detail="Public track not found")
    base = _catalog_response(db, track, user)
    materials = (
        db.query(StudyMaterial)
        .filter(StudyMaterial.track_id == track.id)
        .order_by(StudyMaterial.sequence.asc(), StudyMaterial.created_at.asc())
        .all()
    )
    module_payload = []
    for module in syllabus_modules(db, track, materials):
        module_materials = [
            CatalogMaterialPreview(
                id=m.id,
                module_id=m.module_id,
                title=m.title,
                external_url=m.external_url,
                block_label=m.block_label,
                resource_type=m.resource_type,
                difficulty=m.difficulty,
                estimated_minutes=m.estimated_minutes,
                sequence=m.sequence,
                resource_health_status=m.resource_health_status,
                resource_quality_score=m.resource_quality_score,
            )
            for m in module.pop("materials")
        ]
        module_payload.append(CatalogModulePreview(**module, materials=module_materials))
    return CatalogTrackDetail(
        **base.model_dump(),
        materials=[
            CatalogMaterialPreview(
                id=m.id,
                module_id=m.module_id,
                title=m.title,
                external_url=m.external_url,
                block_label=m.block_label,
                resource_type=m.resource_type,
                difficulty=m.difficulty,
                estimated_minutes=m.estimated_minutes,
                sequence=m.sequence,
                resource_health_status=m.resource_health_status,
                resource_quality_score=m.resource_quality_score,
            )
            for m in materials
        ],
        modules=module_payload,
        quality=quality_breakdown(materials),
    )


@router.post("/tracks/{track_id}/star", response_model=CatalogTrackResponse)
def star_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CatalogTrackResponse:
    track = db.query(Track).filter(Track.id == track_id, Track.is_public.is_(True)).first()
    if not track:
        raise HTTPException(status_code=404, detail="Public track not found")
    existing = db.query(TrackStar).filter(TrackStar.track_id == track.id, TrackStar.user_id == user.id).first()
    if not existing:
        db.add(TrackStar(track_id=track.id, user_id=user.id))
        track.star_count += 1
        db.commit()
        db.refresh(track)
    return _catalog_response(db, track, user)


@router.delete("/tracks/{track_id}/star", response_model=CatalogTrackResponse)
def unstar_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CatalogTrackResponse:
    track = db.query(Track).filter(Track.id == track_id, Track.is_public.is_(True)).first()
    if not track:
        raise HTTPException(status_code=404, detail="Public track not found")
    existing = db.query(TrackStar).filter(TrackStar.track_id == track.id, TrackStar.user_id == user.id).first()
    if existing:
        db.delete(existing)
        track.star_count = max(0, track.star_count - 1)
        db.commit()
        db.refresh(track)
    return _catalog_response(db, track, user)


@router.post("/tracks/{track_id}/rate", response_model=CatalogTrackResponse)
def rate_track(
    track_id: UUID,
    payload: RateTrackRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CatalogTrackResponse:
    track = db.query(Track).filter(Track.id == track_id, Track.is_public.is_(True)).first()
    if not track:
        raise HTTPException(status_code=404, detail="Public track not found")
    rating = db.query(TrackRating).filter(TrackRating.track_id == track.id, TrackRating.user_id == user.id).first()
    if not rating:
        rating = TrackRating(track_id=track.id, user_id=user.id, rating=payload.rating, note=payload.note)
        db.add(rating)
    else:
        rating.rating = payload.rating
        rating.note = payload.note
    refresh_track_rating(db, track)
    db.commit()
    db.refresh(track)
    return _catalog_response(db, track, user)


@router.post("/tracks/{track_id}/adopt", response_model=AdoptTrackResponse, status_code=201)
def adopt_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AdoptTrackResponse:
    source = db.query(Track).filter(Track.id == track_id, Track.is_public.is_(True)).first()
    if not source:
        raise HTTPException(status_code=404, detail="Public track not found")

    from app.domains.course.clone_service import clone_track

    track = clone_track(db, source, user)
    created = db.query(StudyMaterial).filter(StudyMaterial.track_id == track.id).count()
    db.commit()
    db.refresh(track)
    return AdoptTrackResponse(track_id=track.id, slug=track.slug, materials_created=created)


def _collection_tracks(
    db: Session,
    collection: CatalogCollection,
    user: User,
    *,
    limit: int,
    offset: int = 0,
) -> list[CatalogTrackResponse]:
    rows = (
        db.query(CatalogCollectionItem)
        .join(Track, CatalogCollectionItem.track_id == Track.id)
        .filter(CatalogCollectionItem.collection_id == collection.id, Track.is_public.is_(True))
        .order_by(CatalogCollectionItem.sort_order.asc(), Track.star_count.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    tracks = [row.track for row in rows]
    return _catalog_list_responses(db, tracks, user)


def _ensure_default_collections(db: Session) -> None:
    if db.query(CatalogCollection).first():
        return
    specs = [
        ("best-roadmaps", "Best Roadmaps", "Highest-signal public tracks ranked by stars, quality, and adoption.", None),
        ("system-design", "System Design", "Scalable systems, architecture tradeoffs, databases, queues, and case studies.", "system"),
        ("ai-engineering", "AI Engineering", "ML, LLMs, RAG, evals, deployment, and AI foundations.", "ai"),
        ("interview-prep", "Interview Prep", "DSA, system design, behavioral prep, and high-signal practice loops.", "interview"),
    ]
    public_tracks = db.query(Track).filter(Track.is_public.is_(True)).all()
    for order, (slug, title, description, needle) in enumerate(specs):
        collection = CatalogCollection(slug=slug, title=title, description=description, sort_order=order)
        db.add(collection)
        db.flush()
        candidates = public_tracks
        if needle:
            n = needle.lower()
            candidates = [
                t for t in public_tracks
                if n in f"{t.name} {t.description or ''} {t.generation_prompt or ''}".lower()
            ]
        candidates = sorted(candidates, key=lambda t: (t.star_count, t.quality_score, t.created_at), reverse=True)[:8]
        for item_order, track in enumerate(candidates):
            db.add(CatalogCollectionItem(collection_id=collection.id, track_id=track.id, sort_order=item_order))
    db.commit()


@router.get("/collections", response_model=list[CatalogCollectionResponse])
def list_collections(
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    track_limit: int = Query(default=8, ge=1, le=50),
    track_offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CatalogCollectionResponse]:
    _ensure_default_collections(db)
    collections = (
        db.query(CatalogCollection)
        .order_by(CatalogCollection.sort_order.asc(), CatalogCollection.title.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        CatalogCollectionResponse(
            id=c.id,
            slug=c.slug,
            title=c.title,
            description=c.description,
            tracks=_collection_tracks(db, c, user, limit=track_limit, offset=track_offset),
        )
        for c in collections
    ]


@router.get("/creators/{creator_id}", response_model=CreatorProfileResponse)
def get_creator_profile(
    creator_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CreatorProfileResponse:
    creator = db.query(User).filter(User.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    tracks = (
        db.query(Track)
        .filter(Track.user_id == creator.id, Track.is_public.is_(True))
        .order_by(Track.star_count.desc(), Track.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    track_count, total_stars, total_adoptions, avg_rating = _creator_totals(db, creator.id)
    return CreatorProfileResponse(
        id=creator.id,
        display_name=creator.display_name,
        track_count=track_count,
        total_stars=total_stars,
        total_adoptions=total_adoptions,
        avg_rating=avg_rating,
        tracks=_catalog_list_responses(db, tracks, user),
    )


@router.get("/leaderboards", response_model=LeaderboardResponse)
def get_leaderboards(
    track_limit: int = Query(default=20, ge=1, le=100),
    track_offset: int = Query(default=0, ge=0),
    creator_limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeaderboardResponse:
    tracks = _public_tracks_query(db, q=None, featured=False, sort="ranking").offset(track_offset).limit(track_limit).all()
    creator_ids: list[UUID] = []
    for track in tracks:
        if track.user_id not in creator_ids:
            creator_ids.append(track.user_id)

    creator_tracks_by_id: dict[UUID, list[Track]] = {}
    batch_unique: dict[UUID, Track] = {t.id: t for t in tracks}
    for creator_id in creator_ids[:creator_limit]:
        creator_tracks = (
            db.query(Track)
            .filter(Track.user_id == creator_id, Track.is_public.is_(True))
            .order_by(Track.star_count.desc(), Track.created_at.desc())
            .limit(10)
            .all()
        )
        creator_tracks_by_id[creator_id] = creator_tracks
        for t in creator_tracks:
            batch_unique[t.id] = t

    ctx = load_catalog_batch(db, list(batch_unique.values()), user)
    track_responses = [catalog_list_item(t, user, ctx, response_cls=CatalogTrackResponse) for t in tracks]
    creators: list[CreatorProfileResponse] = []
    for creator_id in creator_ids[:creator_limit]:
        creator = db.query(User).filter(User.id == creator_id).first()
        if not creator:
            continue
        track_count, total_stars, total_adoptions, avg_rating = _creator_totals(db, creator.id)
        creator_tracks = creator_tracks_by_id.get(creator_id, [])
        creators.append(
            CreatorProfileResponse(
                id=creator.id,
                display_name=creator.display_name,
                track_count=track_count,
                total_stars=total_stars,
                total_adoptions=total_adoptions,
                avg_rating=avg_rating,
                tracks=[catalog_list_item(t, user, ctx, response_cls=CatalogTrackResponse) for t in creator_tracks],
            )
        )
    return LeaderboardResponse(tracks=track_responses, creators=creators)
