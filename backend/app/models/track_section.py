import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TrackSection(Base):
    __tablename__ = "track_sections"
    __table_args__ = (UniqueConstraint("module_id", "title", name="unique_module_section_title"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("track_modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="core", server_default="core")
    learning_outcomes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    module = relationship("TrackModule", back_populates="sections")
    materials = relationship("StudyMaterial", back_populates="section")
