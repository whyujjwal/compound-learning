"""CORS configuration helpers.

Browsers reject Access-Control-Allow-Origin: * when credentials are included.
When CORS_ORIGINS is *, we allow all origins without credentials.
"""

from __future__ import annotations

from app.config import settings


def cors_middleware_kwargs() -> dict:
    raw = settings.cors_origins.strip()
    if raw == "*" or raw == "":
        return {
            "allow_origins": ["*"],
            "allow_credentials": False,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
        }
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return {
        "allow_origins": origins,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
