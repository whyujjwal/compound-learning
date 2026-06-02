import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    track_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    block_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    resource_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    resource_health_status: Mapped[str] = mapped_column(String(24), nullable=False, default="UNKNOWN", server_default="UNKNOWN")
    resource_quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cognitive_cost_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    priority_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    prerequisite_material_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("study_materials.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    track = relationship("Track", back_populates="materials")
    cards = relationship("Card", back_populates="material", cascade="all, delete-orphan")
    prerequisite = relationship("StudyMaterial", remote_side="StudyMaterial.id")
    study_sessions = relationship("StudySession", back_populates="material", cascade="all, delete-orphan")
    completions = relationship("MaterialCompletion", back_populates="material", cascade="all, delete-orphan")
