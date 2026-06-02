"""Add roadmap_generations table for saved AI roadmap history."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007_roadmap_generations"
down_revision = "0006_ensure_user_profile_columns"
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return name in sa.inspect(conn).get_table_names()


def upgrade() -> None:
    if not _table_exists("roadmap_generations"):
        op.create_table(
            "roadmap_generations",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("goals", sa.Text(), nullable=False),
            sa.Column("weekly_hours", sa.Integer(), nullable=False, server_default="10"),
            sa.Column("level", sa.String(length=32), nullable=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("curriculum", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("applied", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_roadmap_generations_user_id", "roadmap_generations", ["user_id"])


def downgrade() -> None:
    if _table_exists("roadmap_generations"):
        op.drop_index("ix_roadmap_generations_user_id", table_name="roadmap_generations")
        op.drop_table("roadmap_generations")
