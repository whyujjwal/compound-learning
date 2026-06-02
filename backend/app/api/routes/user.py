from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.curriculum import WeeklySchedule
from app.schemas.user import UserResponse, UserUpdate
from app.services.weekly_schedule import invalidate_schedule_cache

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserResponse:
    data = payload.model_dump(exclude_unset=True)
    if "weekly_schedule" in data and data["weekly_schedule"] is not None:
        # Validate shape before persisting so a malformed schedule can never
        # break the daily queue builder.
        try:
            data["weekly_schedule"] = WeeklySchedule.model_validate(
                data["weekly_schedule"]
            ).model_dump()
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=422, detail=f"Invalid weekly_schedule: {e}")
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    if "weekly_schedule" in data:
        invalidate_schedule_cache()
    return user
