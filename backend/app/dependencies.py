"""FastAPI dependencies for authentication."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.auth_service import auth_enabled, resolve_user_from_token, verify_legacy_token
from app.services.bootstrap import get_default_user
from app.services.timezone import resolve_timezone_name


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User:
    token = _extract_bearer(authorization)
    if token:
        user = resolve_user_from_token(db, token)
        if user:
            return user
        if auth_enabled() and not verify_legacy_token(token):
            raise HTTPException(status_code=401, detail="Unauthorized")
    if auth_enabled() and not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return get_default_user(db)


def get_client_timezone(
    timezone: str | None = Query(default=None),
    x_compound_timezone: str | None = Header(default=None, alias="X-Compound-Timezone"),
) -> str:
    return resolve_timezone_name(timezone or x_compound_timezone)
