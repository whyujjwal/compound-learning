"""Add public catalog tracks, stars, and AI update history."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0008_public_catalog_tracks"
down_revision = "0007_roadmap_generations"
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return name in sa.inspect(conn).get_table_names()


def _columns(table: str) -> set[str]:
    conn = op.get_bind()
    return {c["name"] for c in sa.inspect(conn).get_columns(table)}


def upgrade() -> None:
    track_cols = _columns("tracks")
    if "is_public" not in track_cols:
        op.add_column("tracks", sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"))
    if "is_featured" not in track_cols:
        op.add_column("tracks", sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"))
    if "star_count" not in track_cols:
        op.add_column("tracks", sa.Column("star_count", sa.Integer(), nullable=False, server_default="0"))
    if "source_track_id" not in track_cols:
        op.add_column("tracks", sa.Column("source_track_id", postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            "fk_tracks_source_track_id_tracks",
            "tracks",
            "tracks",
            ["source_track_id"],
            ["id"],
            ondelete="SET NULL",
        )
    if "generation_prompt" not in track_cols:
        op.add_column("tracks", sa.Column("generation_prompt", sa.Text(), nullable=True))
    if "published_at" not in track_cols:
        op.add_column("tracks", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))

    if not _table_exists("track_stars"):
        op.create_table(
            "track_stars",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("track_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["track_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("track_id", "user_id", name="unique_track_star"),
        )
        op.create_index("ix_track_stars_track_id", "track_stars", ["track_id"])
        op.create_index("ix_track_stars_user_id", "track_stars", ["user_id"])

    if not _table_exists("track_ai_updates"):
        op.create_table(
            "track_ai_updates",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("track_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("instruction", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="APPLIED"),
            sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["track_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_track_ai_updates_track_id", "track_ai_updates", ["track_id"])
        op.create_index("ix_track_ai_updates_user_id", "track_ai_updates", ["user_id"])


def downgrade() -> None:
    if _table_exists("track_ai_updates"):
        op.drop_index("ix_track_ai_updates_user_id", table_name="track_ai_updates")
        op.drop_index("ix_track_ai_updates_track_id", table_name="track_ai_updates")
        op.drop_table("track_ai_updates")
    if _table_exists("track_stars"):
        op.drop_index("ix_track_stars_user_id", table_name="track_stars")
        op.drop_index("ix_track_stars_track_id", table_name="track_stars")
        op.drop_table("track_stars")

    track_cols = _columns("tracks")
    if "published_at" in track_cols:
        op.drop_column("tracks", "published_at")
    if "generation_prompt" in track_cols:
        op.drop_column("tracks", "generation_prompt")
    if "source_track_id" in track_cols:
        op.drop_constraint("fk_tracks_source_track_id_tracks", "tracks", type_="foreignkey")
        op.drop_column("tracks", "source_track_id")
    if "star_count" in track_cols:
        op.drop_column("tracks", "star_count")
    if "is_featured" in track_cols:
        op.drop_column("tracks", "is_featured")
    if "is_public" in track_cols:
        op.drop_column("tracks", "is_public")
