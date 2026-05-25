import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ReviewRating(str, enum.Enum):
    AGAIN = "AGAIN"
    HARD = "HARD"
    GOOD = "GOOD"
    EASY = "EASY"


class ReviewLog(Base):
    __tablename__ = "review_logs"
    __table_args__ = (Index("idx_review_logs_card", "card_id", "reviewed_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[ReviewRating] = mapped_column(
        Enum(ReviewRating, name="review_rating"), nullable=False
    )
    elapsed_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    actual_interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scheduled_interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    card = relationship("Card", back_populates="review_logs")
