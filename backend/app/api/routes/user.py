from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.bootstrap import get_default_user

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db)) -> UserResponse:
    return get_default_user(db)


@router.patch("/me", response_model=UserResponse)
def update_me(payload: UserUpdate, db: Session = Depends(get_db)) -> UserResponse:
    user = get_default_user(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
