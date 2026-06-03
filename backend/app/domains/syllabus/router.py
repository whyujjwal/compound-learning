"""Canonical syllabus API routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.domains.syllabus import proposals as proposal_service
from app.domains.syllabus import service as syllabus_service
from app.domains.syllabus.schemas import (
    ChangeLogEntry,
    ProposalApplyRequest,
    ProposalAIRequest,
    ProposalCreate,
    ProposalResponse,
    SyllabusCreate,
    SyllabusDetail,
    SyllabusListItem,
    SyllabusMaterialCreate,
    SyllabusMaterialListResponse,
    SyllabusMaterialUpdate,
    SyllabusModuleCreate,
    SyllabusModuleUpdate,
    SyllabusReorderRequest,
    SyllabusUpdate,
)
from app.models.user import User

router = APIRouter(prefix="/syllabi", tags=["syllabi"])


@router.get("", response_model=list[SyllabusListItem])
def list_syllabi(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SyllabusListItem]:
    return syllabus_service.list_syllabi(db, user, limit=limit, offset=offset)


@router.post("", response_model=SyllabusDetail, status_code=201)
def create_syllabus(
    payload: SyllabusCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.create_syllabus(db, user, payload)


@router.get("/slug/{slug}", response_model=SyllabusDetail)
def get_syllabus_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.get_syllabus_by_slug(db, user, slug)


@router.get("/{syllabus_id}", response_model=SyllabusDetail)
def get_syllabus(
    syllabus_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.get_syllabus(db, user, syllabus_id)


@router.patch("/{syllabus_id}", response_model=SyllabusDetail)
def update_syllabus(
    syllabus_id: UUID,
    payload: SyllabusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.update_syllabus(db, user, syllabus_id, payload)


@router.delete("/{syllabus_id}", status_code=204)
def delete_syllabus(
    syllabus_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    syllabus_service.delete_syllabus(db, user, syllabus_id)


@router.post("/{syllabus_id}/modules", response_model=SyllabusDetail)
def add_module(
    syllabus_id: UUID,
    payload: SyllabusModuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.add_module(db, user, syllabus_id, payload)


@router.patch("/{syllabus_id}/modules/{module_id}", response_model=SyllabusDetail)
def update_module(
    syllabus_id: UUID,
    module_id: UUID,
    payload: SyllabusModuleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.update_module(db, user, syllabus_id, module_id, payload)


@router.delete("/{syllabus_id}/modules/{module_id}", response_model=SyllabusDetail)
def delete_module(
    syllabus_id: UUID,
    module_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.delete_module(db, user, syllabus_id, module_id)


@router.post("/{syllabus_id}/materials", response_model=SyllabusDetail)
def add_material(
    syllabus_id: UUID,
    payload: SyllabusMaterialCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.add_material(db, user, syllabus_id, payload)


@router.patch("/{syllabus_id}/materials/{material_id}", response_model=SyllabusDetail)
def update_material(
    syllabus_id: UUID,
    material_id: UUID,
    payload: SyllabusMaterialUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.update_material(db, user, syllabus_id, material_id, payload)


@router.delete("/{syllabus_id}/materials/{material_id}", response_model=SyllabusDetail)
def delete_material(
    syllabus_id: UUID,
    material_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.delete_material(db, user, syllabus_id, material_id)


@router.post("/{syllabus_id}/reorder", response_model=SyllabusDetail)
def reorder_syllabus(
    syllabus_id: UUID,
    payload: SyllabusReorderRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusDetail:
    return syllabus_service.reorder_syllabus(db, user, syllabus_id, payload)


@router.get("/{syllabus_id}/materials", response_model=SyllabusMaterialListResponse)
def list_materials(
    syllabus_id: UUID,
    q: str | None = Query(default=None),
    module_id: UUID | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SyllabusMaterialListResponse:
    return syllabus_service.list_materials(
        db,
        user,
        syllabus_id,
        q=q,
        module_id=module_id,
        resource_type=resource_type,
        limit=limit,
        offset=offset,
    )


@router.get("/{syllabus_id}/history", response_model=list[ChangeLogEntry])
def get_history(
    syllabus_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ChangeLogEntry]:
    return syllabus_service.list_history(db, user, syllabus_id, limit=limit)


@router.post("/{syllabus_id}/proposals/ai", response_model=ProposalResponse, status_code=201)
def create_ai_proposal(
    syllabus_id: UUID,
    payload: ProposalAIRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProposalResponse:
    return proposal_service.create_ai_proposal(db, user, syllabus_id, payload.instruction)


@router.get("/{syllabus_id}/proposals", response_model=list[ProposalResponse])
def list_proposals(
    syllabus_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProposalResponse]:
    return proposal_service.list_proposals(db, user, syllabus_id)


@router.post("/{syllabus_id}/proposals", response_model=ProposalResponse, status_code=201)
def create_proposal(
    syllabus_id: UUID,
    payload: ProposalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProposalResponse:
    return proposal_service.create_proposal(db, user, syllabus_id, payload)


@router.get("/{syllabus_id}/proposals/{proposal_id}", response_model=ProposalResponse)
def get_proposal(
    syllabus_id: UUID,
    proposal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProposalResponse:
    return proposal_service.get_proposal(db, user, syllabus_id, proposal_id)


@router.post("/{syllabus_id}/proposals/{proposal_id}/reject", response_model=ProposalResponse)
def reject_proposal(
    syllabus_id: UUID,
    proposal_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProposalResponse:
    return proposal_service.reject_proposal(db, user, syllabus_id, proposal_id)


@router.post("/{syllabus_id}/proposals/{proposal_id}/apply", response_model=ProposalResponse)
def apply_proposal(
    syllabus_id: UUID,
    proposal_id: UUID,
    payload: ProposalApplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProposalResponse:
    return proposal_service.apply_proposal(db, user, syllabus_id, proposal_id, payload)
