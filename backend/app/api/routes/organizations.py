import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.organization import MemberRole, Organization, OrganizationMember, SharedCurriculum
from app.models.user import User
from app.schemas.organization import (
    MemberResponse,
    OrganizationCreate,
    OrganizationResponse,
    SharedCurriculumCreate,
    SharedCurriculumResponse,
)
from app.services.curriculum_loader import import_curriculum

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationResponse])
def list_organizations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OrganizationResponse]:
    memberships = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .all()
    )
    org_ids = [m.organization_id for m in memberships]
    if not org_ids:
        return []
    orgs = db.query(Organization).filter(Organization.id.in_(org_ids)).all()
    result = []
    for org in orgs:
        count = (
            db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org.id)
            .count()
        )
        result.append(
            OrganizationResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                description=org.description,
                created_at=org.created_at,
                member_count=count,
            )
        )
    return result


@router.post("", response_model=OrganizationResponse, status_code=201)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrganizationResponse:
    existing = db.query(Organization).filter(Organization.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Organization slug already exists")
    org = Organization(name=payload.name, slug=payload.slug, description=payload.description)
    db.add(org)
    db.flush()
    db.add(OrganizationMember(organization_id=org.id, user_id=user.id, role=MemberRole.ADMIN))
    db.commit()
    db.refresh(org)
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        created_at=org.created_at,
        member_count=1,
    )


@router.get("/{org_id}/members", response_model=list[MemberResponse])
def list_members(
    org_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MemberResponse]:
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    members = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org_id)
        .all()
    )
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append(
                MemberResponse(
                    id=m.id,
                    user_id=u.id,
                    email=u.email,
                    display_name=u.display_name,
                    role=m.role,
                    joined_at=m.joined_at,
                )
            )
    return result


@router.post("/{org_id}/curricula", response_model=SharedCurriculumResponse, status_code=201)
def share_curriculum(
    org_id: UUID,
    payload: SharedCurriculumCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SharedCurriculumResponse:
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.role.in_([MemberRole.ADMIN, MemberRole.COACH]),
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Admin or coach role required")
    row = SharedCurriculum(
        organization_id=org_id,
        name=payload.name,
        curriculum_json=payload.curriculum_json,
        created_by_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SharedCurriculumResponse(
        id=row.id,
        name=row.name,
        organization_id=row.organization_id,
        created_at=row.created_at,
    )


@router.post("/{org_id}/curricula/{curriculum_id}/import")
def import_shared_curriculum(
    org_id: UUID,
    curriculum_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, int]:
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")
    row = (
        db.query(SharedCurriculum)
        .filter(SharedCurriculum.id == curriculum_id, SharedCurriculum.organization_id == org_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Shared curriculum not found")
    data = json.loads(row.curriculum_json)
    return import_curriculum(db, user, data)
