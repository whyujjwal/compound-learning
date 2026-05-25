"""xAPI statement emission (stored locally; can forward to external LRS later)."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.xapi_statement import XapiStatement


def emit_xapi_statement(
    db: Session,
    user: User,
    *,
    verb: str,
    activity_id: str,
    extra: dict[str, Any] | None = None,
) -> XapiStatement:
    statement = {
        "actor": {"mbox": f"mailto:{user.email}", "name": user.display_name or user.email},
        "verb": {"id": f"http://adlnet.gov/expapi/verbs/{verb}", "display": {"en-US": verb}},
        "object": {"id": activity_id, "definition": {"type": "http://adlnet.gov/expapi/activities/course"}},
        "timestamp": datetime.now(UTC).isoformat(),
        "context": extra or {},
    }
    row = XapiStatement(
        user_id=user.id,
        verb=verb,
        activity_id=activity_id,
        statement_json=json.dumps(statement),
    )
    db.add(row)
    db.flush()
    return row


def list_statements(db: Session, user_id: UUID, limit: int = 50) -> list[dict[str, Any]]:
    rows = (
        db.query(XapiStatement)
        .filter(XapiStatement.user_id == user_id)
        .order_by(XapiStatement.created_at.desc())
        .limit(limit)
        .all()
    )
    return [json.loads(r.statement_json) for r in rows]
