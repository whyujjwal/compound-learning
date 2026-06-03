from __future__ import annotations

import json
import re
from typing import Any


def repair_json_text(text: str) -> str:
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return text


def extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    candidates = [text, repair_json_text(text)]
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        chunk = text[start : end + 1]
        candidates.extend([chunk, repair_json_text(chunk)])

    last_error: json.JSONDecodeError | None = None
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            last_error = e
            continue
    if last_error:
        raise last_error
    raise json.JSONDecodeError("No JSON object found", text, 0)
