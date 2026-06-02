"""Add catalog quality scores, ratings, collections, and resource health."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0009_catalog_quality_ratings"
down_revision = "0008_public_catalog_tracks"
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
    if "adoption_count" not in track_cols:
        op.add_column("tracks", sa.Column("adoption_count", sa.Integer(), nullable=False, server_default="0"))
    if "rating_count" not in track_cols:
        op.add_column("tracks", sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"))
    if "rating_avg" not in track_cols:
        op.add_column("tracks", sa.Column("rating_avg", sa.Float(), nullable=False, server_default="0"))
    if "quality_score" not in track_cols:
        op.add_column("tracks", sa.Column("quality_score", sa.Float(), nullable=False, server_default="0"))

    material_cols = _columns("study_materials")
    if "resource_health_status" not in material_cols:
        op.add_column(
            "study_materials",
            sa.Column("resource_health_status", sa.String(length=24), nullable=False, server_default="UNKNOWN"),
        )
    if "resource_quality_score" not in material_cols:
        op.add_column(
            "study_materials",
            sa.Column("resource_quality_score", sa.Float(), nullable=False, server_default="0"),
        )

    if not _table_exists("track_ratings"):
        op.create_table(
            "track_ratings",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("track_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["track_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("track_id", "user_id", name="unique_track_rating"),
        )
        op.create_index("ix_track_ratings_track_id", "track_ratings", ["track_id"])
        op.create_index("ix_track_ratings_user_id", "track_ratings", ["user_id"])

    if not _table_exists("catalog_collections"):
        op.create_table(
            "catalog_collections",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("title", sa.String(length=160), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )

    if not _table_exists("catalog_collection_items"):
        op.create_table(
            "catalog_collection_items",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("collection_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("track_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["collection_id"], ["catalog_collections.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["track_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("collection_id", "track_id", name="unique_catalog_collection_track"),
        )
        op.create_index("ix_catalog_collection_items_collection_id", "catalog_collection_items", ["collection_id"])
        op.create_index("ix_catalog_collection_items_track_id", "catalog_collection_items", ["track_id"])


def downgrade() -> None:
    if _table_exists("catalog_collection_items"):
        op.drop_index("ix_catalog_collection_items_track_id", table_name="catalog_collection_items")
        op.drop_index("ix_catalog_collection_items_collection_id", table_name="catalog_collection_items")
        op.drop_table("catalog_collection_items")
    if _table_exists("catalog_collections"):
        op.drop_table("catalog_collections")
    if _table_exists("track_ratings"):
        op.drop_index("ix_track_ratings_user_id", table_name="track_ratings")
        op.drop_index("ix_track_ratings_track_id", table_name="track_ratings")
        op.drop_table("track_ratings")

    material_cols = _columns("study_materials")
    if "resource_quality_score" in material_cols:
        op.drop_column("study_materials", "resource_quality_score")
    if "resource_health_status" in material_cols:
        op.drop_column("study_materials", "resource_health_status")

    track_cols = _columns("tracks")
    if "quality_score" in track_cols:
        op.drop_column("tracks", "quality_score")
    if "rating_avg" in track_cols:
        op.drop_column("tracks", "rating_avg")
    if "rating_count" in track_cols:
        op.drop_column("tracks", "rating_count")
    if "adoption_count" in track_cols:
        op.drop_column("tracks", "adoption_count")
