import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompletionState(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class MaterialCompletion(Base):
    __tablename__ = "material_completions"
    __table_args__ = (UniqueConstraint("user_id", "material_id", name="uq_user_material_completion"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    material_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("study_materials.id", ondelete="CASCADE"), nullable=False
    )
    state: Mapped[CompletionState] = mapped_column(
        Enum(CompletionState, name="completion_state"), nullable=False, default=CompletionState.NOT_STARTED
    )
    session_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_session_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="material_completions")
    material = relationship("StudyMaterial", back_populates="completions")
