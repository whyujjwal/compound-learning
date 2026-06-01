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
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_retention: Mapped[float] = mapped_column(Float, nullable=False, default=0.90)
    daily_study_minutes: Mapped[int] = mapped_column(nullable=False, default=120)
    paused_tracks: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, server_default="{}"
    )
    milestone_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    milestone_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tracks = relationship("Track", back_populates="user", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    scheduler_parameters = relationship(
        "SchedulerParameters", back_populates="user", cascade="all, delete-orphan"
    )
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    block_sessions = relationship("BlockSession", back_populates="user", cascade="all, delete-orphan")
    material_completions = relationship(
        "MaterialCompletion", back_populates="user", cascade="all, delete-orphan"
    )
    memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
