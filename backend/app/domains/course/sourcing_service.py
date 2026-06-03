"""AI structure generation + open-source material sourcing into proposal operations."""

from __future__ import annotations

import uuid
from typing import Any

from app.domains.course.link_check import verify_url
from app.domains.course.source_registry import classify_source
from app.domains.syllabus.schemas import ProposalOperation, ProposalOperationTarget
from app.services.roadmap.llm import call_model_json

STRUCTURE_SYSTEM = (
    "You are a curriculum architect. Given a learning goal, output JSON describing a course as "
    "modules -> sections -> materials. Each material MUST include a real, well-known open-source URL "
    "(official docs, MIT OCW, freeCodeCamp, 3Blue1Brown, arXiv, Khan Academy, reputable GitHub). "
    "NEVER invent URLs. If unsure of a URL, omit the material. "
    'JSON shape: {"summary": str, "modules": [{"title", "objective", "kind"("core"|"optional"|"bonus"), '
    '"learning_outcomes": [str], "sections": [{"title","objective","kind","materials": '
    '[{"title","url","resource_type"("video"|"article"|"docs"|"paper"|"course"|"interactive"|"book"|"repo"|"practice"|"project"|"quiz"),'
    '"estimated_minutes","difficulty","notes"}]}]}]}'
)


def _op_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def generate_structure(goal: str, *, level: str | None = None, hours: int | None = None) -> dict[str, Any]:
    prompt = f"Goal: {goal}\nLevel: {level or 'unspecified'}\nWeekly hours: {hours or 'unspecified'}\nReturn JSON only."
    return call_model_json(STRUCTURE_SYSTEM, prompt, max_tokens=4096)


def draft_to_operations(draft: dict[str, Any]) -> list[ProposalOperation]:
    """Convert a structure draft into module.add/section.add/material.add operations."""
    ops: list[ProposalOperation] = []
    for m_index, module in enumerate(draft.get("modules") or []):
        module_title = (module.get("title") or "").strip()
        if not module_title:
            continue
        module_ref = _op_id("mod")
        ops.append(ProposalOperation(
            id=module_ref, type="module.add",
            target=ProposalOperationTarget(),
            payload={
                "title": module_title, "objective": module.get("objective"),
                "kind": module.get("kind") or "core",
                "learning_outcomes": module.get("learning_outcomes"),
                "sequence": m_index,
            },
            reason="AI generated module", risk="low",
        ))
        for s_index, section in enumerate(module.get("sections") or []):
            section_title = (section.get("title") or "").strip()
            if not section_title:
                continue
            section_ref = _op_id("sec")
            ops.append(ProposalOperation(
                id=section_ref, type="section.add",
                target=ProposalOperationTarget(),
                payload={
                    "title": section_title, "objective": section.get("objective"),
                    "kind": section.get("kind") or "core",
                    "learning_outcomes": section.get("learning_outcomes"),
                    "sequence": s_index, "_module_ref": module_ref,
                },
                reason="AI generated section", risk="low",
            ))
            for mat in section.get("materials") or []:
                title = (mat.get("title") or "").strip()
                url = mat.get("url")
                if not title or not url:
                    continue
                provider, license_name, trusted = classify_source(url)
                if not trusted:
                    continue
                status, score = verify_url(url)
                if status == "BROKEN":
                    continue
                ops.append(ProposalOperation(
                    id=_op_id("mat"), type="material.add",
                    target=ProposalOperationTarget(),
                    payload={
                        "title": title, "url": url, "resource_type": mat.get("resource_type"),
                        "estimated_minutes": mat.get("estimated_minutes", 20),
                        "difficulty": mat.get("difficulty"), "raw_content": mat.get("notes"),
                        "provider": provider, "license": license_name,
                        "kind": section.get("kind") or "core",
                        "resource_health_status": status, "resource_quality_score": score,
                        "_section_ref": section_ref,
                    },
                    reason=f"Sourced from {provider}", risk="low",
                ))
    return ops
