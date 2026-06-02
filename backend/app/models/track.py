import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Track(Base):
    __tablename__ = "tracks"
    __table_args__ = (
        UniqueConstraint("user_id", "slug", name="unique_user_track_slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6366f1")
    cognitive_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    is_system: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_public: Mapped[bool] = mapped_column(nullable=False, default=True, server_default="true")
    is_featured: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")
    star_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    adoption_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    rating_avg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    source_track_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True
    )
    generation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", back_populates="tracks")
    source_track = relationship("Track", remote_side="Track.id")
    materials = relationship("StudyMaterial", back_populates="track", cascade="all, delete-orphan")
    stars = relationship("TrackStar", back_populates="track", cascade="all, delete-orphan")
    ratings = relationship("TrackRating", back_populates="track", cascade="all, delete-orphan")
    ai_updates = relationship("TrackAIUpdate", back_populates="track", cascade="all, delete-orphan")
    scheduler_parameters = relationship(
        "SchedulerParameters", back_populates="track", cascade="all, delete-orphan"
    )
