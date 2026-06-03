from __future__ import annotations

import logging

from app.config import settings
from app.services.roadmap.errors import RoadmapError
from app.services.roadmap.json_utils import extract_json

logger = logging.getLogger("compound.roadmap")


def invoke_llm(system: str, user_prompt: str, max_tokens: int) -> tuple[str, str | None]:
    """Call the configured provider. Returns (text, finish_reason)."""
    provider = settings.ai_provider

    if provider == "anthropic":
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text")
        stop = getattr(resp, "stop_reason", None)
        return text, str(stop) if stop else None

    if provider == "openai":
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=settings.ai_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        choice = resp.choices[0]
        finish = getattr(choice, "finish_reason", None)
        return choice.message.content or "", str(finish) if finish else None

    if provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(
            model=settings.ai_model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=max_tokens,
                temperature=0.5,
                response_mime_type="application/json",
            ),
        )
        candidate = resp.candidates[0] if resp.candidates else None
        finish = getattr(candidate, "finish_reason", None) if candidate else None
        return resp.text or "", str(finish) if finish else None

    raise RoadmapError(f"Unknown AI provider: {provider}")


def is_truncated(finish: str | None) -> bool:
    if not finish:
        return False
    f = finish.upper()
    return "MAX_TOKENS" in f or f in ("LENGTH", "MAX_OUTPUT_TOKENS")


def call_model_json(system: str, user_prompt: str, *, max_tokens: int | None = None) -> dict:
    tokens = max_tokens or max(settings.ai_max_tokens, 8192)
    try:
        raw, finish = invoke_llm(system, user_prompt, tokens)
    except Exception as e:
        logger.exception("Roadmap model call failed")
        raise RoadmapError(f"AI request failed: {e}") from e

    if not raw.strip():
        raise RoadmapError("The AI returned an empty response. Try again.")
    if is_truncated(finish):
        raise RoadmapError("__truncated__")

    try:
        return extract_json(raw)
    except Exception as e:
        logger.warning("JSON parse failed: %s\nRaw: %s", e, raw[:600])
        raise RoadmapError("Could not parse the generated roadmap. Try rephrasing your goals.") from e
