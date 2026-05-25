from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.card import Card
from app.models.material import StudyMaterial
from app.models.track import Track
from app.schemas.material import MaterialCreate, MaterialResponse, MaterialUpdate
from app.services.bootstrap import get_default_user

router = APIRouter(prefix="/materials", tags=["materials"])


def _material_response(db: Session, material: StudyMaterial) -> MaterialResponse:
    card = db.query(Card).filter(Card.material_id == material.id).first()
    return MaterialResponse(
        id=material.id,
        track_id=material.track_id,
        title=material.title,
        raw_content=material.raw_content,
        external_url=material.external_url,
        block_label=material.block_label,
        resource_type=material.resource_type,
        sequence=material.sequence,
        cognitive_cost_multiplier=material.cognitive_cost_multiplier,
        estimated_minutes=material.estimated_minutes,
        priority_percent=material.priority_percent,
        prerequisite_material_id=material.prerequisite_material_id,
        created_at=material.created_at,
        card_id=card.id if card else None,
        card_state=card.state.value if card else None,
        card_due_at=card.due_at if card else None,
    )


@router.get("", response_model=list[MaterialResponse])
def list_materials(track_id: UUID | None = None, db: Session = Depends(get_db)) -> list[MaterialResponse]:
    user = get_default_user(db)
    query = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(Track.user_id == user.id)
    )
    if track_id:
        query = query.filter(StudyMaterial.track_id == track_id)
    materials = query.order_by(StudyMaterial.created_at.desc()).all()
    return [_material_response(db, m) for m in materials]


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(material_id: UUID, db: Session = Depends(get_db)) -> MaterialResponse:
    user = get_default_user(db)
    material = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(StudyMaterial.id == material_id, Track.user_id == user.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return _material_response(db, material)


@router.post("", response_model=MaterialResponse, status_code=201)
def create_material(payload: MaterialCreate, db: Session = Depends(get_db)) -> MaterialResponse:
    user = get_default_user(db)
    track = db.query(Track).filter(Track.id == payload.track_id, Track.user_id == user.id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    material = StudyMaterial(
        track_id=payload.track_id,
        title=payload.title,
        raw_content=payload.raw_content,
        external_url=payload.external_url,
        block_label=payload.block_label,
        resource_type=payload.resource_type,
        sequence=payload.sequence,
        cognitive_cost_multiplier=payload.cognitive_cost_multiplier,
        estimated_minutes=payload.estimated_minutes,
        priority_percent=payload.priority_percent,
        prerequisite_material_id=payload.prerequisite_material_id,
    )
    db.add(material)
    db.flush()

    if payload.create_card:
        db.add(Card(user_id=user.id, material_id=material.id))

    db.commit()
    db.refresh(material)
    return _material_response(db, material)


@router.patch("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: UUID, payload: MaterialUpdate, db: Session = Depends(get_db)
) -> MaterialResponse:
    user = get_default_user(db)
    material = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(StudyMaterial.id == material_id, Track.user_id == user.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(material, field, value)

    db.commit()
    db.refresh(material)
    return _material_response(db, material)


@router.delete("/{material_id}", status_code=204)
def delete_material(material_id: UUID, db: Session = Depends(get_db)) -> None:
    user = get_default_user(db)
    material = (
        db.query(StudyMaterial)
        .join(Track)
        .filter(StudyMaterial.id == material_id, Track.user_id == user.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(material)
    db.commit()
