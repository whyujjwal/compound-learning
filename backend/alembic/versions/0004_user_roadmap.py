"""Add per-user roadmap fields: weekly_schedule, learning_goals, onboarded."""

from alembic import op
import sqlalchemy as sa

revision = "0004_user_roadmap"
down_revision = "0003_block_sessions"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    conn = op.get_bind()
    return {c["name"] for c in sa.inspect(conn).get_columns(table)}


def upgrade() -> None:
    cols = _columns("users")
    if "weekly_schedule" not in cols:
        op.add_column("users", sa.Column("weekly_schedule", sa.dialects.postgresql.JSONB(), nullable=True))
    if "learning_goals" not in cols:
        op.add_column("users", sa.Column("learning_goals", sa.String(length=2000), nullable=True))
    if "onboarded" not in cols:
        op.add_column(
            "users",
            sa.Column("onboarded", sa.Boolean(), nullable=False, server_default="false"),
        )


def downgrade() -> None:
    cols = _columns("users")
    for name in ("onboarded", "learning_goals", "weekly_schedule"):
        if name in cols:
            op.drop_column("users", name)
