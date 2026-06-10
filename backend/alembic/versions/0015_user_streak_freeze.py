"""Add streak freeze balance for humane streak grace day."""

from alembic import op
import sqlalchemy as sa

revision = "0015_user_streak_freeze"
down_revision = "0014_course_sections_and_graph"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("streak_freeze_remaining", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("users", "streak_freeze_remaining")
