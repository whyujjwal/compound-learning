import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BlockSessionStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class BlockSession(Base):
    __tablename__ = "block_sessions"
    __table_args__ = (
        UniqueConstraint("user_id", "session_date", "slot", name="uq_block_session_user_date_slot"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    slot: Mapped[int] = mapped_column(Integer, nullable=False)
    slot_label: Mapped[str] = mapped_column(String(64), nullable=False)
    track_slug: Mapped[str] = mapped_column(String(64), nullable=False)
    track_name: Mapped[str] = mapped_column(String(256), nullable=False)
    track_color: Mapped[str] = mapped_column(String(32), nullable=False, default="#c89b6b")
    planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    card_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    current_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[BlockSessionStatus] = mapped_column(
        Enum(BlockSessionStatus, name="block_session_status"),
        nullable=False,
        default=BlockSessionStatus.IN_PROGRESS,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="block_sessions")
