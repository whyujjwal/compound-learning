from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.chat import MessageRole


class MessageResponse(BaseModel):
    id: UUID
    role: MessageRole
    content: str
    tool_calls: list[dict[str, Any]] | None = None
    tool_results: list[dict[str, Any]] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=8000)


class SendMessageResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    conversation_title: str


class CreateConversationRequest(BaseModel):
    title: str | None = None


class AIStatus(BaseModel):
    enabled: bool
    provider: str
    model: str


class CoachInsightResponse(BaseModel):
    kind: str
    period_key: str
    content: str
    metrics: dict[str, Any] | None = None
    provider: str
    model: str
    generated_at: datetime

    model_config = {"from_attributes": True}
