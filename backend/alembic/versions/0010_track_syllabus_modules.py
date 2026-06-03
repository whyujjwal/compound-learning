"""Add track syllabus metadata and modules."""

import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0010_track_syllabus_modules"
down_revision = "0009_catalog_quality_ratings"
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
    if "learning_outcomes" not in track_cols:
        op.add_column("tracks", sa.Column("learning_outcomes", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if "prerequisites" not in track_cols:
        op.add_column("tracks", sa.Column("prerequisites", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if "target_audience" not in track_cols:
        op.add_column("tracks", sa.Column("target_audience", sa.Text(), nullable=True))
    if "estimated_hours" not in track_cols:
        op.add_column("tracks", sa.Column("estimated_hours", sa.Integer(), nullable=True))
    if "difficulty" not in track_cols:
        op.add_column("tracks", sa.Column("difficulty", sa.String(length=32), nullable=True))
    if "syllabus_summary" not in track_cols:
        op.add_column("tracks", sa.Column("syllabus_summary", sa.Text(), nullable=True))

    if not _table_exists("track_modules"):
        op.create_table(
            "track_modules",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("track_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("objective", sa.Text(), nullable=True),
            sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("difficulty", sa.String(length=24), nullable=True),
            sa.Column("quiz_prompt", sa.Text(), nullable=True),
            sa.Column("project_prompt", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["track_id"], ["tracks.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("track_id", "title", name="unique_track_module_title"),
        )
        op.create_index("ix_track_modules_track_id", "track_modules", ["track_id"])

    material_cols = _columns("study_materials")
    if "module_id" not in material_cols:
        op.add_column("study_materials", sa.Column("module_id", postgresql.UUID(as_uuid=True), nullable=True))
        op.create_index("ix_study_materials_module_id", "study_materials", ["module_id"])
        op.create_foreign_key(
            "fk_study_materials_module_id_track_modules",
            "study_materials",
            "track_modules",
            ["module_id"],
            ["id"],
            ondelete="SET NULL",
        )
    if "difficulty" not in material_cols:
        op.add_column("study_materials", sa.Column("difficulty", sa.String(length=24), nullable=True))

    conn = op.get_bind()
    groups = conn.execute(sa.text("""
        SELECT
            sm.track_id,
            COALESCE(NULLIF(sm.block_label, ''), 'Core') AS title,
            MIN(sm.sequence) AS sequence,
            COALESCE(SUM(sm.estimated_minutes), 0) AS minutes,
            CASE
                WHEN MAX(LOWER(COALESCE(sm.raw_content, '') || ' ' || sm.title)) LIKE '%hard%' THEN 'hard'
                WHEN MAX(LOWER(COALESCE(sm.raw_content, '') || ' ' || sm.title)) LIKE '%easy%' THEN 'easy'
                ELSE 'mixed'
            END AS difficulty
        FROM study_materials sm
        GROUP BY sm.track_id, COALESCE(NULLIF(sm.block_label, ''), 'Core')
    """)).mappings().all()
    existing = {
        (row["track_id"], row["title"])
        for row in conn.execute(sa.text("SELECT track_id, title FROM track_modules")).mappings().all()
    }
    track_modules = sa.table(
        "track_modules",
        sa.column("id"),
        sa.column("track_id"),
        sa.column("title"),
        sa.column("sequence"),
        sa.column("estimated_minutes"),
        sa.column("difficulty"),
    )
    rows = [
        {
            "id": uuid.uuid4(),
            "track_id": group["track_id"],
            "title": group["title"],
            "sequence": group["sequence"] or 0,
            "estimated_minutes": group["minutes"] or 0,
            "difficulty": group["difficulty"],
        }
        for group in groups
        if (group["track_id"], group["title"]) not in existing
    ]
    if rows:
        op.bulk_insert(track_modules, rows)
    conn.execute(sa.text("""
        UPDATE study_materials sm
        SET module_id = tm.id
        FROM track_modules tm
        WHERE sm.track_id = tm.track_id
          AND COALESCE(NULLIF(sm.block_label, ''), 'Core') = tm.title
          AND sm.module_id IS NULL
    """))


def downgrade() -> None:
    material_cols = _columns("study_materials")
    if "difficulty" in material_cols:
        op.drop_column("study_materials", "difficulty")
    if "module_id" in material_cols:
        op.drop_constraint("fk_study_materials_module_id_track_modules", "study_materials", type_="foreignkey")
        op.drop_index("ix_study_materials_module_id", table_name="study_materials")
        op.drop_column("study_materials", "module_id")

    if _table_exists("track_modules"):
        op.drop_index("ix_track_modules_track_id", table_name="track_modules")
        op.drop_table("track_modules")

    track_cols = _columns("tracks")
    for col in ("syllabus_summary", "difficulty", "estimated_hours", "target_audience", "prerequisites", "learning_outcomes"):
        if col in track_cols:
            op.drop_column("tracks", col)
