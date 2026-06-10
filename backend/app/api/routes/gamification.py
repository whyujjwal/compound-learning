from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.gamification import GamificationProfile
from app.services import gamification_service as gamification

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/profile", response_model=GamificationProfile)
def get_gamification_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GamificationProfile:
    return GamificationProfile(**gamification.get_profile(db, user))
