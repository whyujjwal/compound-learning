"""Google OAuth 2.0 — authorization code flow."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.services.auth_service import create_access_token
from app.services.bootstrap import seed_default_organization
from app.services.curriculum_loader import import_curriculum, load_file
from pathlib import Path

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
_SCOPES = "openid email profile"
_CURRICULUM = Path(__file__).resolve().parents[3] / "docs" / "curriculum.json"


def google_redirect_uri() -> str:
    """OAuth callback — use the web app origin so Google redirects through Next.js /api proxy."""
    if settings.google_redirect_uri:
        return settings.google_redirect_uri
    return f"{settings.frontend_url.rstrip('/')}/api/auth/google/callback"


def google_auth_enabled() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _state_secret() -> str:
    return settings.jwt_secret


def make_oauth_state(next_path: str) -> str:
    payload = {
        "n": secrets.token_urlsafe(8),
        "next": next_path if next_path.startswith("/") else "/",
        "exp": datetime.now(UTC) + timedelta(minutes=10),
    }
    return jwt.encode(payload, _state_secret(), algorithm="HS256")


def parse_oauth_state(state: str) -> str:
    data = jwt.decode(state, _state_secret(), algorithms=["HS256"])
    return str(data.get("next") or "/")


def authorization_url(next_path: str = "/") -> str:
    if not google_auth_enabled():
        raise RuntimeError("Google OAuth is not configured")
    redirect_uri = google_redirect_uri()
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": _SCOPES,
        "access_type": "online",
        "prompt": "select_account",
        "state": make_oauth_state(next_path),
    }
    return f"{_GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        token_res = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": google_redirect_uri(),
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_res.raise_for_status()
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise ValueError("Google token response missing access_token")

        user_res = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_res.raise_for_status()
        return user_res.json()


def upsert_google_user(db: Session, profile: dict[str, Any]) -> User:
    google_sub = profile.get("sub")
    email = profile.get("email")
    if not google_sub or not email:
        raise ValueError("Google profile missing sub or email")

    display_name = profile.get("name") or profile.get("given_name")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user:
        if display_name and not user.display_name:
            user.display_name = display_name
        return user

    user = db.query(User).filter(User.email == email).first()
    if user:
        if user.google_sub and user.google_sub != google_sub:
            raise ValueError("Email already linked to a different Google account")
        user.google_sub = google_sub
        if display_name and not user.display_name:
            user.display_name = display_name
        db.flush()
        return user

    user = User(
        email=email,
        display_name=display_name,
        google_sub=google_sub,
        password_hash=None,
        daily_study_minutes=120,
        target_retention=0.90,
    )
    db.add(user)
    db.flush()
    seed_default_organization(db, user)
    if _CURRICULUM.exists():
        import_curriculum(db, user, load_file(_CURRICULUM), prune_orphans=False)
    return user


def issue_token_for_user(user: User) -> str:
    return create_access_token(user.id, user.email)


def frontend_callback_url(token: str, next_path: str) -> str:
    base = settings.frontend_url.rstrip("/")
    params = urlencode({"token": token, "next": next_path})
    return f"{base}/login/callback?{params}"
