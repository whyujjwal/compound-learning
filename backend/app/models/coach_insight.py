"""Cached AI-generated proactive insights (daily nudge, weekly postmortem)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CoachInsightKind(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"


class CoachInsight(Base):
    __tablename__ = "coach_insights"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "period_key", name="uq_coach_insight_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[CoachInsightKind] = mapped_column(
        Enum(CoachInsightKind, name="coach_insight_kind"), nullable=False
    )
    period_key: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
