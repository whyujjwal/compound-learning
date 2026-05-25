"""Single-user app password gate. Disabled when APP_PASSWORD is unset."""

from __future__ import annotations

import hashlib
import hmac

from app.config import settings

AUTH_SALT = "compound-app-v1"


def auth_enabled() -> bool:
    return bool(settings.app_password)


def make_token() -> str:
    if not settings.app_password:
        raise RuntimeError("APP_PASSWORD is not configured")
    return hmac.new(
        settings.app_password.encode(),
        AUTH_SALT.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_token(token: str | None) -> bool:
    if not auth_enabled():
        return True
    if not token:
        return False
    return hmac.compare_digest(token, make_token())


def verify_password(password: str) -> bool:
    if not auth_enabled():
        return True
    if not settings.app_password:
        return False
    return hmac.compare_digest(password, settings.app_password)
