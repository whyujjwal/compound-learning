from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings

from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.services.auth_service import (
    auth_enabled,
    authenticate_user,
    create_access_token,
    hash_password,
    make_legacy_token,
    verify_legacy_password,
)
from app.services.bootstrap import get_default_user, seed_default_organization
from app.services.google_oauth_service import (
    authorization_url,
    exchange_code,
    frontend_callback_url,
    google_auth_enabled,
    issue_token_for_user,
    parse_oauth_state,
    upsert_google_user,
)
router = APIRouter(tags=["auth"])


def _login_error_redirect(message: str) -> RedirectResponse:
    params = urlencode({"error": message})
    return RedirectResponse(url=f"{settings.frontend_url.rstrip('/')}/login?{params}", status_code=302)


class GoogleAuthStatus(BaseModel):
    enabled: bool


@router.get("/auth/google/status", response_model=GoogleAuthStatus)
def google_status() -> GoogleAuthStatus:
    return GoogleAuthStatus(enabled=google_auth_enabled())


@router.get("/auth/google")
def google_login(next: str = Query("/", alias="next")) -> RedirectResponse:
    if not google_auth_enabled():
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    safe_next = next if next.startswith("/") else "/"
    return RedirectResponse(url=authorization_url(safe_next), status_code=302)


@router.get("/auth/google/callback")
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return _login_error_redirect(f"Google sign-in failed: {error}")
    if not code or not state:
        return _login_error_redirect("Google sign-in did not complete. Please try again.")
    if not google_auth_enabled():
        return _login_error_redirect("Google sign-in is not configured on this server.")

    try:
        next_path = parse_oauth_state(state)
        profile = await exchange_code(code)
        user = upsert_google_user(db, profile)
        db.commit()
        token = issue_token_for_user(user)
        return RedirectResponse(url=frontend_callback_url(token, next_path), status_code=302)
    except Exception as exc:
        db.rollback()
        return _login_error_redirect(str(exc))


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
            daily_study_minutes=120,
            target_retention=0.90,
        )
        db.add(user)
    db.flush()
    seed_default_organization(db, user)
    from app.domains.course.clone_service import seed_user_default_tracks

    seed_user_default_tracks(db, user)
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
        token=make_legacy_token(),
        user_id=str(user.id),
        email=user.email,
    )
