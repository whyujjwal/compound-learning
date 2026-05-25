from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.study_session import StudySession
from app.models.user import User
from app.schemas.session import StudySessionCreate, StudySessionResponse, StudySessionUpdate
from app.services.session_service import create_session, update_session

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _to_response(session: StudySession) -> StudySessionResponse:
    title = session.material.title if session.material else None
    return StudySessionResponse(
        id=session.id,
        material_id=session.material_id,
        material_title=title,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_minutes=session.duration_minutes,
        completion_status=session.completion_status,
        self_rating=session.self_rating,
        notes=session.notes,
        external_evidence_url=session.external_evidence_url,
        created_at=session.created_at,
    )


@router.post("", response_model=StudySessionResponse, status_code=201)
def log_session(
    payload: StudySessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StudySessionResponse:
    try:
        session = create_session(db, user, payload)
        db.commit()
        session = (
            db.query(StudySession)
            .options(joinedload(StudySession.material))
            .filter(StudySession.id == session.id)
            .first()
        )
        return _to_response(session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{session_id}", response_model=StudySessionResponse)
def patch_session(
    session_id: UUID,
    payload: StudySessionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StudySessionResponse:
    session = update_session(db, user, session_id, payload)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.commit()
    session = (
        db.query(StudySession)
        .options(joinedload(StudySession.material))
        .filter(StudySession.id == session.id)
        .first()
    )
    return _to_response(session)


@router.get("/material/{material_id}", response_model=list[StudySessionResponse])
def list_material_sessions(
    material_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[StudySessionResponse]:
    sessions = (
        db.query(StudySession)
        .options(joinedload(StudySession.material))
        .filter(StudySession.user_id == user.id, StudySession.material_id == material_id)
        .order_by(StudySession.created_at.desc())
        .limit(50)
        .all()
    )
    return [_to_response(s) for s in sessions]


@router.get("/recent", response_model=list[StudySessionResponse])
def recent_sessions(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[StudySessionResponse]:
    sessions = (
        db.query(StudySession)
        .options(joinedload(StudySession.material))
        .filter(StudySession.user_id == user.id)
        .order_by(StudySession.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return [_to_response(s) for s in sessions]
