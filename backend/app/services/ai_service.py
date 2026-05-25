"""Coach AI — agentic chat with tool use, backed by Anthropic, OpenAI, or Gemini."""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models.chat import Conversation, Message, MessageRole
from app.models.user import User
from app.services.ai_tools import TOOL_DEFINITIONS, ToolExecutor

logger = logging.getLogger("compound.ai")

SYSTEM_PROMPT = """You are Compound Coach — a sharp, candid learning advisor for an advanced \
technical learner studying Data Structures & Algorithms, AI/LLM theory, and Distributed Systems.

The learner uses an FSRS-6 spaced repetition platform. You have read-only tools to inspect their \
real progress: stats, recent reviews, due cards, struggling cards, track details, and material search.

Operating principles:
- Always ground claims in tool data. If asked about progress, call get_overall_stats first.
- Be concise but specific. Quote actual numbers and material titles from the data.
- Identify patterns: which tracks lag, which concepts keep lapsing, whether retention is healthy.
- Recommend concrete next actions tied to FSRS principles (priority%, cognitive load, due timing).
- Encourage but don't flatter. Call out drops in streak or retention plainly.
- If a question can't be answered from the tools, say so — do not invent data.
- Use markdown for structure: bold for key numbers, short bulleted lists, code spans for material titles.
- Aim for 80–200 words unless the user asks for depth.
"""

MAX_TOOL_ROUNDS = 5


class AIDisabled(Exception):
    pass


def _to_provider_messages(messages: list[Message], provider: str) -> list[dict[str, Any]]:
    """Convert stored messages into provider-specific format."""
    out: list[dict[str, Any]] = []
    for msg in messages:
        role = msg.role.value.lower()
        if provider == "anthropic":
            if msg.role == MessageRole.USER:
                out.append({"role": "user", "content": msg.content})
            else:
                blocks: list[dict[str, Any]] = []
                if msg.content:
                    blocks.append({"type": "text", "text": msg.content})
                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        blocks.append(
                            {
                                "type": "tool_use",
                                "id": tc["id"],
                                "name": tc["name"],
                                "input": tc.get("input", {}),
                            }
                        )
                if blocks:
                    out.append({"role": "assistant", "content": blocks})
                if msg.tool_results:
                    out.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tr["tool_use_id"],
                                    "content": json.dumps(tr["result"]),
                                }
                                for tr in msg.tool_results
                            ],
                        }
                    )
        else:
            out.append({"role": role, "content": msg.content})
    return out


def _generate_title(content: str) -> str:
    snippet = content.strip().replace("\n", " ")
    if len(snippet) <= 60:
        return snippet
    return snippet[:57] + "…"


def chat_completion(
    db: Session,
    user: User,
    conversation: Conversation,
    user_message_content: str,
) -> tuple[Message, Message]:
    """Append user message, run agent loop, persist assistant message. Returns (user_msg, assistant_msg)."""

    if not settings.ai_enabled:
        env_name = {
            "anthropic": "ANTHROPIC_API_KEY",
            "openai": "OPENAI_API_KEY",
            "gemini": "GEMINI_API_KEY",
        }.get(settings.ai_provider, "API_KEY")
        raise AIDisabled(
            f"AI is not configured. Set {env_name} and restart the backend."
        )

    user_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=user_message_content,
    )
    db.add(user_msg)
    db.flush()

    if not conversation.messages or len(conversation.messages) == 1:
        conversation.title = _generate_title(user_message_content)

    db.refresh(conversation)

    if settings.ai_provider == "anthropic":
        assistant_text, tool_calls, tool_results = _run_anthropic_agent(db, user, conversation)
    elif settings.ai_provider == "openai":
        assistant_text, tool_calls, tool_results = _run_openai_agent(db, user, conversation)
    elif settings.ai_provider == "gemini":
        assistant_text, tool_calls, tool_results = _run_gemini_agent(db, user, conversation)
    else:
        raise AIDisabled(f"Unknown AI provider: {settings.ai_provider}")

    assistant_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=assistant_text,
        tool_calls=tool_calls or None,
        tool_results=tool_results or None,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    return user_msg, assistant_msg


def _run_anthropic_agent(
    db: Session, user: User, conversation: Conversation
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    from anthropic import Anthropic

    client = Anthropic(api_key=settings.anthropic_api_key)
    executor = ToolExecutor(db, user)
    messages = _to_provider_messages(conversation.messages, "anthropic")
    tool_calls_log: list[dict[str, Any]] = []
    tool_results_log: list[dict[str, Any]] = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=settings.ai_max_tokens,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            assistant_blocks: list[dict[str, Any]] = []
            tool_use_blocks = []
            text_so_far = ""
            for block in response.content:
                if block.type == "text":
                    assistant_blocks.append({"type": "text", "text": block.text})
                    text_so_far += block.text
                elif block.type == "tool_use":
                    assistant_blocks.append(
                        {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
                    )
                    tool_use_blocks.append(block)
                    tool_calls_log.append({"id": block.id, "name": block.name, "input": block.input})

            messages.append({"role": "assistant", "content": assistant_blocks})

            tool_result_contents = []
            for tu in tool_use_blocks:
                result = executor.execute(tu.name, tu.input or {})
                tool_results_log.append({"tool_use_id": tu.id, "name": tu.name, "result": result})
                tool_result_contents.append(
                    {"type": "tool_result", "tool_use_id": tu.id, "content": json.dumps(result, default=str)}
                )
            messages.append({"role": "user", "content": tool_result_contents})
            continue

        final_text = "".join(b.text for b in response.content if b.type == "text")
        return final_text or "(no response)", tool_calls_log, tool_results_log

    return ("I gathered the data but ran out of reasoning rounds — try a more focused question.",
            tool_calls_log, tool_results_log)


def _gemini_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Gemini function parameters must be strict JSON schema. Strip what isn't supported."""
    cleaned: dict[str, Any] = {"type": schema.get("type", "object")}
    if "properties" in schema:
        cleaned["properties"] = {
            name: {k: v for k, v in spec.items() if k in {"type", "description", "enum", "items"}}
            for name, spec in schema["properties"].items()
        }
    if "required" in schema and schema["required"]:
        cleaned["required"] = schema["required"]
    return cleaned


def _run_gemini_agent(
    db: Session, user: User, conversation: Conversation
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    executor = ToolExecutor(db, user)

    function_decls = [
        types.FunctionDeclaration(
            name=t["name"],
            description=t["description"],
            parameters=_gemini_schema(t["input_schema"]),
        )
        for t in TOOL_DEFINITIONS
    ]
    tools = [types.Tool(function_declarations=function_decls)]

    # Build conversation history as Gemini Content list (role: 'user' | 'model')
    contents: list[types.Content] = []
    pending_tool_results: dict[str, Any] = {}
    for msg in conversation.messages:
        if msg.role == MessageRole.USER:
            contents.append(
                types.Content(role="user", parts=[types.Part.from_text(text=msg.content)])
            )
        else:
            parts: list[types.Part] = []
            if msg.content:
                parts.append(types.Part.from_text(text=msg.content))
            if msg.tool_calls:
                for tc in msg.tool_calls:
                    parts.append(
                        types.Part.from_function_call(
                            name=tc["name"], args=tc.get("input", {}) or {}
                        )
                    )
            if parts:
                contents.append(types.Content(role="model", parts=parts))
            if msg.tool_results:
                response_parts = []
                for tr in msg.tool_results:
                    response_parts.append(
                        types.Part.from_function_response(
                            name=tr["name"],
                            response={"result": tr["result"]},
                        )
                    )
                if response_parts:
                    contents.append(types.Content(role="user", parts=response_parts))
            pending_tool_results = {}

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=tools,
        max_output_tokens=settings.ai_max_tokens,
        temperature=0.4,
    )

    tool_calls_log: list[dict[str, Any]] = []
    tool_results_log: list[dict[str, Any]] = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.models.generate_content(
            model=settings.ai_model,
            contents=contents,
            config=config,
        )

        candidate = response.candidates[0] if response.candidates else None
        parts = candidate.content.parts if candidate and candidate.content else []
        function_calls = [p.function_call for p in parts if getattr(p, "function_call", None)]
        text_parts = [p.text for p in parts if getattr(p, "text", None)]

        if function_calls:
            assistant_parts: list[types.Part] = []
            for tp in text_parts:
                assistant_parts.append(types.Part.from_text(text=tp))
            for fc in function_calls:
                fc_args = dict(fc.args) if fc.args else {}
                assistant_parts.append(
                    types.Part.from_function_call(name=fc.name, args=fc_args)
                )
                call_id = f"gemini-{len(tool_calls_log)}"
                tool_calls_log.append({"id": call_id, "name": fc.name, "input": fc_args})
            contents.append(types.Content(role="model", parts=assistant_parts))

            response_parts: list[types.Part] = []
            for fc, call_record in zip(function_calls, tool_calls_log[-len(function_calls):]):
                fc_args = dict(fc.args) if fc.args else {}
                result = executor.execute(fc.name, fc_args)
                tool_results_log.append(
                    {"tool_use_id": call_record["id"], "name": fc.name, "result": result}
                )
                response_parts.append(
                    types.Part.from_function_response(
                        name=fc.name, response={"result": result}
                    )
                )
            contents.append(types.Content(role="user", parts=response_parts))
            continue

        final_text = "".join(text_parts) or (response.text if hasattr(response, "text") and response.text else "")
        return final_text or "(no response)", tool_calls_log, tool_results_log

    return (
        "I gathered the data but ran out of reasoning rounds — try a more focused question.",
        tool_calls_log,
        tool_results_log,
    )


def _run_openai_agent(
    db: Session, user: User, conversation: Conversation
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    executor = ToolExecutor(db, user)

    openai_tools = [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in TOOL_DEFINITIONS
    ]

    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in conversation.messages:
        if msg.role == MessageRole.USER:
            messages.append({"role": "user", "content": msg.content})
        else:
            entry: dict[str, Any] = {"role": "assistant", "content": msg.content or ""}
            if msg.tool_calls:
                entry["tool_calls"] = [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": json.dumps(tc.get("input", {}))},
                    }
                    for tc in msg.tool_calls
                ]
            messages.append(entry)
            if msg.tool_results:
                for tr in msg.tool_results:
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tr["tool_use_id"],
                            "content": json.dumps(tr["result"], default=str),
                        }
                    )

    tool_calls_log: list[dict[str, Any]] = []
    tool_results_log: list[dict[str, Any]] = []

    for _ in range(MAX_TOOL_ROUNDS):
        completion = client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            tools=openai_tools,
            max_tokens=settings.ai_max_tokens,
        )
        choice = completion.choices[0].message

        if choice.tool_calls:
            messages.append(
                {
                    "role": "assistant",
                    "content": choice.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in choice.tool_calls
                    ],
                }
            )
            for tc in choice.tool_calls:
                args = json.loads(tc.function.arguments or "{}")
                tool_calls_log.append({"id": tc.id, "name": tc.function.name, "input": args})
                result = executor.execute(tc.function.name, args)
                tool_results_log.append({"tool_use_id": tc.id, "name": tc.function.name, "result": result})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str),
                    }
                )
            continue

        return choice.content or "(no response)", tool_calls_log, tool_results_log

    return ("I gathered the data but ran out of reasoning rounds — try a more focused question.",
            tool_calls_log, tool_results_log)
