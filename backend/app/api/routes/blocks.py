from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_client_timezone, get_current_user
from app.models.user import User
from app.schemas.block import BlockReviewSubmit, BlockSessionResponse
from app.services.block_service import get_block, start_block, submit_block_review

router = APIRouter(prefix="/blocks", tags=["blocks"])


@router.post("/{slot}/start", response_model=BlockSessionResponse)
def post_start_block(
    slot: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> BlockSessionResponse:
    return start_block(db, user, slot, timezone_name)


@router.get("/{slot}", response_model=BlockSessionResponse)
def get_block_session(
    slot: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> BlockSessionResponse:
    return get_block(db, user, slot, timezone_name)


@router.post("/{slot}/items/{card_id}/review", response_model=BlockSessionResponse)
def post_block_item_review(
    slot: int,
    card_id: UUID,
    payload: BlockReviewSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> BlockSessionResponse:
    return submit_block_review(
        db, user, slot, card_id, payload.rating, payload.elapsed_time_seconds, timezone_name
    )
