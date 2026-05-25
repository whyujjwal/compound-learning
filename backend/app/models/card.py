import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CardState(str, enum.Enum):
    LEARNING = "LEARNING"
    REVIEW = "REVIEW"
    RELEARNING = "RELEARNING"


class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (
        Index("idx_cards_due_user", "user_id", "due_at"),
        Index("idx_cards_material", "material_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("study_materials.id", ondelete="CASCADE"), nullable=False
    )
    state: Mapped[CardState] = mapped_column(
        Enum(CardState, name="card_state"), nullable=False, default=CardState.LEARNING
    )
    difficulty: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    stability: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    retrievability: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    reps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lapses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="cards")
    material = relationship("StudyMaterial", back_populates="cards")
    review_logs = relationship("ReviewLog", back_populates="card", cascade="all, delete-orphan")
