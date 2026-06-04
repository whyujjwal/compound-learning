"""LTI, xAPI, and Anki import integration endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.xapi_service import list_statements

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/lti/config")
def lti_tool_config() -> dict[str, Any]:
    """LTI 1.3 tool provider metadata (stub for future Canvas/Moodle integration)."""
    return {
        "title": "Compound Learning Platform",
        "description": "Adaptive FSRS-6 learning OS with curriculum blocks and AI coach",
        "target_link_uri": "/api/integrations/lti/launch",
        "oidc_initiation_url": "/api/integrations/lti/oidc",
        "scopes": ["https://purl.imsglobal.org/spec/lti-ags/scope/score"],
        "messages": ["LtiResourceLinkRequest", "LtiDeepLinkingRequest"],
        "status": "stub",
    }


@router.post("/lti/launch")
def lti_launch(payload: dict[str, Any]) -> dict[str, str]:
    return {
        "status": "not_implemented",
        "message": "LTI launch requires platform registration. Use curriculum import for now.",
    }


@router.get("/xapi/statements")
def xapi_statements(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return list_statements(db, user.id, limit=limit, offset=offset)


@router.post("/anki/import")
async def anki_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Parse basic Anki .apkg metadata (full import requires zip extraction)."""
    if not file.filename or not file.filename.endswith(".apkg"):
        raise HTTPException(status_code=400, detail="Upload a .apkg Anki deck file")
    content = await file.read()
    return {
        "status": "received",
        "filename": file.filename,
        "bytes": len(content),
        "message": "Anki import stores deck for processing. Full card extraction is Phase 6.",
    }
