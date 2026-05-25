"""Add auth columns, sessions, orgs, and integration tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_auth_sessions_orgs"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def _enum_exists(name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": name},
    ).scalar()
    return result is not None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    columns = [col["name"] for col in sa.inspect(conn).get_columns(table)]
    return column in columns


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return name in sa.inspect(conn).get_table_names()


def _create_enum(name: str, values: tuple[str, ...]) -> None:
    if _enum_exists(name):
        return
    quoted = ", ".join(f"'{value}'" for value in values)
    op.execute(f"CREATE TYPE {name} AS ENUM ({quoted})")


def upgrade() -> None:
    _create_enum("completion_status", ("STARTED", "COMPLETED", "SKIPPED"))
    _create_enum("member_role", ("LEARNER", "COACH", "ADMIN"))
    _create_enum("completion_state", ("NOT_STARTED", "IN_PROGRESS", "COMPLETED"))

    if not _column_exists("users", "display_name"):
        op.add_column("users", sa.Column("display_name", sa.String(length=200), nullable=True))
    if not _column_exists("users", "password_hash"):
        op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    if not _column_exists("users", "milestone_title"):
        op.add_column("users", sa.Column("milestone_title", sa.String(length=200), nullable=True))
    if not _column_exists("users", "milestone_date"):
        op.add_column("users", sa.Column("milestone_date", sa.DateTime(timezone=True), nullable=True))

    if not _table_exists("organizations"):
        op.create_table(
            "organizations",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )

    if not _table_exists("study_sessions"):
        op.create_table(
            "study_sessions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("material_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=True),
            sa.Column(
                "completion_status",
                postgresql.ENUM("STARTED", "COMPLETED", "SKIPPED", name="completion_status", create_type=False),
                nullable=False,
            ),
            sa.Column("self_rating", sa.Integer(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("external_evidence_url", sa.String(length=2048), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["material_id"], ["study_materials.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("material_completions"):
        op.create_table(
            "material_completions",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("material_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column(
                "state",
                postgresql.ENUM("NOT_STARTED", "IN_PROGRESS", "COMPLETED", name="completion_state", create_type=False),
                nullable=False,
            ),
            sa.Column("session_count", sa.Integer(), nullable=False),
            sa.Column("total_minutes", sa.Integer(), nullable=False),
            sa.Column("last_session_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["material_id"], ["study_materials.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "material_id", name="uq_user_material_completion"),
        )

    if not _table_exists("organization_members"):
        op.create_table(
            "organization_members",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column(
                "role",
                postgresql.ENUM("LEARNER", "COACH", "ADMIN", name="member_role", create_type=False),
                nullable=False,
            ),
            sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
        )

    if not _table_exists("shared_curricula"):
        op.create_table(
            "shared_curricula",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("curriculum_json", sa.Text(), nullable=False),
            sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _table_exists("xapi_statements"):
        op.create_table(
            "xapi_statements",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("verb", sa.String(length=100), nullable=False),
            sa.Column("activity_id", sa.String(length=500), nullable=False),
            sa.Column("statement_json", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    if _table_exists("xapi_statements"):
        op.drop_table("xapi_statements")
    if _table_exists("shared_curricula"):
        op.drop_table("shared_curricula")
    if _table_exists("organization_members"):
        op.drop_table("organization_members")
    if _table_exists("material_completions"):
        op.drop_table("material_completions")
    if _table_exists("study_sessions"):
        op.drop_table("study_sessions")
    if _table_exists("organizations"):
        op.drop_table("organizations")
    if _column_exists("users", "milestone_date"):
        op.drop_column("users", "milestone_date")
    if _column_exists("users", "milestone_title"):
        op.drop_column("users", "milestone_title")
    if _column_exists("users", "password_hash"):
        op.drop_column("users", "password_hash")
    if _column_exists("users", "display_name"):
        op.drop_column("users", "display_name")
    if _enum_exists("completion_state"):
        op.execute("DROP TYPE completion_state")
    if _enum_exists("member_role"):
        op.execute("DROP TYPE member_role")
    if _enum_exists("completion_status"):
        op.execute("DROP TYPE completion_status")
