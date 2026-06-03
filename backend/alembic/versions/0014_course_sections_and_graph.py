"""Course sections, edges, and label/kind/source columns."""

import sqlalchemy as sa
from alembic import op

revision = "0014_course_sections_and_graph"
down_revision = "0013_perf_fetch_indexes"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    conn = op.get_bind()
    return {col["name"] for col in sa.inspect(conn).get_columns(table)}


def _tables() -> set[str]:
    conn = op.get_bind()
    return set(sa.inspect(conn).get_table_names())


def upgrade() -> None:
    tables = _tables()

    if "track_sections" not in tables:
        op.create_table(
            "track_sections",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("module_id", sa.dialects.postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("track_modules.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("objective", sa.Text(), nullable=True),
            sa.Column("label", sa.String(80), nullable=True),
            sa.Column("kind", sa.String(16), nullable=False, server_default="core"),
            sa.Column("learning_outcomes", sa.JSON(), nullable=True),
            sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("module_id", "title", name="unique_module_section_title"),
        )
        op.create_index("ix_track_sections_module_id", "track_sections", ["module_id"])

    if "syllabus_edges" not in tables:
        op.create_table(
            "syllabus_edges",
            sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("syllabus_id", sa.dialects.postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False),
            sa.Column("from_node_type", sa.String(16), nullable=False),
            sa.Column("from_node_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("to_node_type", sa.String(16), nullable=False),
            sa.Column("to_node_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("kind", sa.String(16), nullable=False, server_default="requires"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_syllabus_edges_syllabus_id", "syllabus_edges", ["syllabus_id"])

    module_cols = _columns("track_modules")
    if "label" not in module_cols:
        op.add_column("track_modules", sa.Column("label", sa.String(80), nullable=True))
    if "kind" not in module_cols:
        op.add_column("track_modules", sa.Column("kind", sa.String(16), nullable=False, server_default="core"))
    if "learning_outcomes" not in module_cols:
        op.add_column("track_modules", sa.Column("learning_outcomes", sa.JSON(), nullable=True))

    material_cols = _columns("study_materials")
    if "section_id" not in material_cols:
        op.add_column("study_materials", sa.Column(
            "section_id", sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("track_sections.id", ondelete="SET NULL"), nullable=True))
        op.create_index("ix_study_materials_section_id", "study_materials", ["section_id"])
    if "provider" not in material_cols:
        op.add_column("study_materials", sa.Column("provider", sa.String(120), nullable=True))
    if "author" not in material_cols:
        op.add_column("study_materials", sa.Column("author", sa.String(200), nullable=True))
    if "license" not in material_cols:
        op.add_column("study_materials", sa.Column("license", sa.String(80), nullable=True))
    if "kind" not in material_cols:
        op.add_column("study_materials", sa.Column("kind", sa.String(16), nullable=False, server_default="core"))
    if "label" not in material_cols:
        op.add_column("study_materials", sa.Column("label", sa.String(80), nullable=True))

    _backfill_general_sections()


def _backfill_general_sections() -> None:
    """One 'General' section per module; point that module's materials at it."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    conn = op.get_bind()
    modules = conn.execute(sa.text("SELECT id FROM track_modules")).fetchall()
    for (module_id,) in modules:
        existing = conn.execute(
            sa.text("SELECT id FROM track_sections WHERE module_id = :mid LIMIT 1"),
            {"mid": module_id},
        ).fetchone()
        if existing:
            section_id = existing[0]
        else:
            row = conn.execute(
                sa.text(
                    "INSERT INTO track_sections (id, module_id, title, kind, sequence) "
                    "VALUES (gen_random_uuid(), :mid, 'General', 'core', 0) RETURNING id"
                ),
                {"mid": module_id},
            ).fetchone()
            section_id = row[0]
        conn.execute(
            sa.text(
                "UPDATE study_materials SET section_id = :sid "
                "WHERE module_id = :mid AND section_id IS NULL"
            ),
            {"sid": section_id, "mid": module_id},
        )


def downgrade() -> None:
    op.drop_index("ix_study_materials_section_id", table_name="study_materials")
    for col in ("section_id", "provider", "author", "license", "kind", "label"):
        op.drop_column("study_materials", col)
    for col in ("label", "kind", "learning_outcomes"):
        op.drop_column("track_modules", col)
    op.drop_index("ix_syllabus_edges_syllabus_id", table_name="syllabus_edges")
    op.drop_table("syllabus_edges")
    op.drop_index("ix_track_sections_module_id", table_name="track_sections")
    op.drop_table("track_sections")
