import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    target_retention: Mapped[float] = mapped_column(Float, nullable=False, default=0.90)
    # Per-block budget in minutes (used to pack new items into each block).
    daily_study_minutes: Mapped[int] = mapped_column(nullable=False, default=120)
    # Track slugs the user has paused — excluded from the daily block stack.
    paused_tracks: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tracks = relationship("Track", back_populates="user", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    scheduler_parameters = relationship(
        "SchedulerParameters", back_populates="user", cascade="all, delete-orphan"
    )
