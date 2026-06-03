"""Add syllabus proposals, change log, and track version."""

import sqlalchemy as sa
from alembic import op

revision = "0012_syllabus_proposals"
down_revision = "0011_api_query_indexes"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    return column in {col["name"] for col in sa.inspect(conn).get_columns(table)}


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    return name in sa.inspect(conn).get_table_names()


def upgrade() -> None:
    if not _has_column("tracks", "version"):
        op.add_column(
            "tracks",
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        )

    if not _has_table("syllabus_proposals"):
        op.create_table(
            "syllabus_proposals",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("syllabus_id", sa.UUID(), nullable=False),
            sa.Column("source", sa.String(length=24), server_default="MANUAL", nullable=False),
            sa.Column("status", sa.String(length=24), server_default="DRAFT", nullable=False),
            sa.Column("instruction", sa.Text(), nullable=True),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("base_version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("operations", sa.dialects.postgresql.JSONB(), server_default="[]", nullable=False),
            sa.Column("selected_operation_ids", sa.dialects.postgresql.JSONB(), nullable=True),
            sa.Column("applied_operation_ids", sa.dialects.postgresql.JSONB(), nullable=True),
            sa.Column("provider", sa.String(length=64), nullable=True),
            sa.Column("model", sa.String(length=128), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["syllabus_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_syllabus_proposals_user_syllabus", "syllabus_proposals", ["user_id", "syllabus_id"])
        op.create_index("ix_syllabus_proposals_status", "syllabus_proposals", ["status"])

    if not _has_table("syllabus_change_log"):
        op.create_table(
            "syllabus_change_log",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=False),
            sa.Column("syllabus_id", sa.UUID(), nullable=False),
            sa.Column("proposal_id", sa.UUID(), nullable=True),
            sa.Column("operation_id", sa.String(length=64), nullable=True),
            sa.Column("operation_type", sa.String(length=64), nullable=False),
            sa.Column("before", sa.dialects.postgresql.JSONB(), nullable=True),
            sa.Column("after", sa.dialects.postgresql.JSONB(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["proposal_id"], ["syllabus_proposals.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["syllabus_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_syllabus_change_log_syllabus", "syllabus_change_log", ["syllabus_id", "created_at"])


def downgrade() -> None:
    if _has_table("syllabus_change_log"):
        op.drop_index("ix_syllabus_change_log_syllabus", table_name="syllabus_change_log")
        op.drop_table("syllabus_change_log")
    if _has_table("syllabus_proposals"):
        op.drop_index("ix_syllabus_proposals_status", table_name="syllabus_proposals")
        op.drop_index("ix_syllabus_proposals_user_syllabus", table_name="syllabus_proposals")
        op.drop_table("syllabus_proposals")
    if _has_column("tracks", "version"):
        op.drop_column("tracks", "version")
