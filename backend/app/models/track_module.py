import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TrackModule(Base):
    __tablename__ = "track_modules"
    __table_args__ = (UniqueConstraint("track_id", "title", name="unique_track_module_title"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    track_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    difficulty: Mapped[str | None] = mapped_column(String(24), nullable=True)
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="core", server_default="core")
    learning_outcomes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    quiz_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    track = relationship("Track", back_populates="modules")
    materials = relationship("StudyMaterial", back_populates="module")
    sections = relationship(
        "TrackSection",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="TrackSection.sequence",
    )
