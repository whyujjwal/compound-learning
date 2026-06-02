"""Add google_sub to users for Google OAuth login."""

from alembic import op
import sqlalchemy as sa

revision = "0004_google_oauth"
down_revision = "0004_user_roadmap"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    columns = [col["name"] for col in sa.inspect(conn).get_columns(table)]
    return column in columns


def upgrade() -> None:
    if not _column_exists("users", "google_sub"):
        op.add_column("users", sa.Column("google_sub", sa.String(length=64), nullable=True))
        op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)


def downgrade() -> None:
    if _column_exists("users", "google_sub"):
        op.drop_index("ix_users_google_sub", table_name="users")
        op.drop_column("users", "google_sub")
