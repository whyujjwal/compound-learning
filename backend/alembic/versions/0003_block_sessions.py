"""Add block_sessions table for server-side daily block progress."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_block_sessions"
down_revision = "0002_auth_sessions_orgs"
branch_labels = None
depends_on = None


def _enum_exists(name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": name},
    ).scalar()
    return result is not None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return name in sa.inspect(conn).get_table_names()


def upgrade() -> None:
    if not _enum_exists("block_session_status"):
        op.execute("CREATE TYPE block_session_status AS ENUM ('IN_PROGRESS', 'COMPLETED')")

    if not _table_exists("block_sessions"):
        op.create_table(
            "block_sessions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("session_date", sa.Date(), nullable=False),
            sa.Column("slot", sa.Integer(), nullable=False),
            sa.Column("slot_label", sa.String(length=64), nullable=False),
            sa.Column("track_slug", sa.String(length=64), nullable=False),
            sa.Column("track_name", sa.String(length=256), nullable=False),
            sa.Column("track_color", sa.String(length=32), nullable=False, server_default="#c89b6b"),
            sa.Column("planned_minutes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("card_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("current_index", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "status",
                postgresql.ENUM("IN_PROGRESS", "COMPLETED", name="block_session_status", create_type=False),
                nullable=False,
                server_default="IN_PROGRESS",
            ),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "session_date", "slot", name="uq_block_session_user_date_slot"),
        )


def downgrade() -> None:
    if _table_exists("block_sessions"):
        op.drop_table("block_sessions")
    if _enum_exists("block_session_status"):
        op.execute("DROP TYPE block_session_status")
