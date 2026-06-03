"""Convert AI track update output into syllabus proposal operations."""

from __future__ import annotations

import uuid
from typing import Any

from app.domains.syllabus.schemas import ProposalOperation, ProposalOperationTarget
from app.models.material import StudyMaterial
from app.models.track import Track


def ai_materials_to_operations(
    track: Track,
    materials: list[dict[str, Any]],
    existing: list[StudyMaterial],
) -> list[ProposalOperation]:
    existing_titles = {m.title for m in existing}
    operations: list[ProposalOperation] = []

    for item in materials:
        title = (item.get("title") or "").strip()
        if not title or title in existing_titles:
            continue
        existing_titles.add(title)
        op_id = f"ai-{uuid.uuid4().hex[:8]}"
        module_title = item.get("module") or item.get("module_title")
        operations.append(
            ProposalOperation(
                id=op_id,
                type="material.add",
                target=ProposalOperationTarget(syllabus_id=track.id),
                payload={
                    "title": title,
                    "external_url": item.get("url"),
                    "resource_type": item.get("type"),
                    "estimated_minutes": item.get("estimated_minutes", 20),
                    "priority_percent": item.get("priority_percent", 50),
                    "difficulty": item.get("difficulty"),
                    "block_label": item.get("block_label"),
                    "module_title": module_title,
                    "raw_content": item.get("notes"),
                },
                reason=item.get("notes") or "AI suggested addition",
                risk="low",
            )
        )

    return operations
