"""Ensure user profile columns exist (recover from skipped 0004/0005)."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006_ensure_user_profile_columns"
down_revision = "0005_user_columns_backfill"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    conn = op.get_bind()
    return {c["name"] for c in sa.inspect(conn).get_columns(table)}


def upgrade() -> None:
    cols = _columns("users")
    if "weekly_schedule" not in cols:
        op.add_column("users", sa.Column("weekly_schedule", postgresql.JSONB(), nullable=True))
    if "learning_goals" not in cols:
        op.add_column("users", sa.Column("learning_goals", sa.String(length=2000), nullable=True))
    if "onboarded" not in cols:
        op.add_column(
            "users",
            sa.Column("onboarded", sa.Boolean(), nullable=False, server_default="false"),
        )
    if "google_sub" not in cols:
        op.add_column("users", sa.Column("google_sub", sa.String(length=64), nullable=True))
        op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)


def downgrade() -> None:
    pass
