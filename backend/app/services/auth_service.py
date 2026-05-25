"""JWT authentication and password hashing."""

from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

AUTH_SALT = "compound-app-v1"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password_hash(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: UUID, email: str) -> str:
    expire = datetime.now(UTC) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def auth_enabled() -> bool:
    return bool(settings.app_password)


def make_legacy_token() -> str:
    if not settings.app_password:
        raise RuntimeError("APP_PASSWORD is not configured")
    return hmac.new(
        settings.app_password.encode(),
        AUTH_SALT.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_legacy_token(token: str | None) -> bool:
    if not auth_enabled():
        return True
    if not token:
        return False
    return hmac.compare_digest(token, make_legacy_token())


def verify_legacy_password(password: str) -> bool:
    if not auth_enabled():
        return True
    if not settings.app_password:
        return False
    return hmac.compare_digest(password, settings.app_password)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash:
        return None
    if not verify_password_hash(password, user.password_hash):
        return None
    return user


def resolve_user_from_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    if auth_enabled() and verify_legacy_token(token):
        from app.services.bootstrap import get_default_user

        return get_default_user(db)
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == UUID(user_id)).first()
