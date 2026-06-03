"""Indexes for catalog, track list, and card due queries."""

import sqlalchemy as sa
from alembic import op

revision = "0011_api_query_indexes"
down_revision = "0010_track_syllabus_modules"
branch_labels = None
depends_on = None


def _index_names(table: str) -> set[str]:
    conn = op.get_bind()
    return {idx["name"] for idx in sa.inspect(conn).get_indexes(table)}


def upgrade() -> None:
    if "ix_study_materials_track_id" not in _index_names("study_materials"):
        op.create_index("ix_study_materials_track_id", "study_materials", ["track_id"])
    if "ix_tracks_is_public" not in _index_names("tracks"):
        op.create_index("ix_tracks_is_public", "tracks", ["is_public"])
    if "ix_track_stars_user_track" not in _index_names("track_stars"):
        op.create_index("ix_track_stars_user_track", "track_stars", ["user_id", "track_id"])


def downgrade() -> None:
    for name, table in (
        ("ix_track_stars_user_track", "track_stars"),
        ("ix_tracks_is_public", "tracks"),
        ("ix_study_materials_track_id", "study_materials"),
    ):
        if name in _index_names(table):
            op.drop_index(name, table_name=table)
