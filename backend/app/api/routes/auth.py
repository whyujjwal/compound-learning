from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import auth_enabled, make_token, verify_password as verify_legacy_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.services.auth_service import authenticate_user, create_access_token, hash_password
from app.services.bootstrap import get_default_user, seed_default_organization

router = APIRouter(tags=["auth"])


class LegacyLoginRequest(BaseModel):
    password: str


@router.post("/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing and existing.password_hash:
        raise HTTPException(status_code=409, detail="Email already registered")
    if existing:
        existing.password_hash = hash_password(payload.password)
        existing.display_name = payload.display_name or existing.display_name
        user = existing
    else:
        user = User(
            email=payload.email,
            display_name=payload.display_name,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
    db.flush()
    seed_default_organization(db, user)
    db.commit()
    token = create_access_token(user.id, user.email)
    return AuthResponse(
        auth_required=True,
        token=token,
        user_id=str(user.id),
        email=user.email,
    )


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if payload.email:
        user = authenticate_user(db, payload.email, payload.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token(user.id, user.email)
        return AuthResponse(
            auth_required=True,
            token=token,
            user_id=str(user.id),
            email=user.email,
        )

    if not auth_enabled():
        user = get_default_user(db)
        return AuthResponse(auth_required=False, token=None, user_id=str(user.id), email=user.email)

    if not verify_legacy_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    user = get_default_user(db)
    return AuthResponse(
        auth_required=True,
        token=make_token(),
        user_id=str(user.id),
        email=user.email,
    )
