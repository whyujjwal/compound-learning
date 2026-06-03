"""Performance and data fetching indexes."""

import sqlalchemy as sa
from alembic import op

revision = "0013_performance_data_fetching_indexes"
down_revision = "0012_syllabus_proposals"
branch_labels = None
depends_on = None

def _index_names(table: str) -> set[str]:
    conn = op.get_bind()
    return {idx["name"] for idx in sa.inspect(conn).get_indexes(table)}

def upgrade() -> None:
    track_indexes = _index_names("tracks")
    if "ix_tracks_user_slug" not in track_indexes:
        op.create_index("ix_tracks_user_slug", "tracks", ["user_id", "slug"])
        
    track_module_indexes = _index_names("track_modules")
    if "ix_track_modules_track_seq" not in track_module_indexes:
        op.create_index("ix_track_modules_track_seq", "track_modules", ["track_id", "sequence"])
        
    study_material_indexes = _index_names("study_materials")
    if "ix_study_materials_track_module_seq" not in study_material_indexes:
        op.create_index("ix_study_materials_track_module_seq", "study_materials", ["track_id", "module_id", "sequence"])
    if "ix_study_materials_track_title" not in study_material_indexes:
        op.create_index("ix_study_materials_track_title", "study_materials", ["track_id", "title"])
        
    card_indexes = _index_names("cards")
    if "ix_cards_user_material" not in card_indexes:
        op.create_index("ix_cards_user_material", "cards", ["user_id", "material_id"])
    if "ix_cards_user_due" not in card_indexes:
        op.create_index("ix_cards_user_due", "cards", ["user_id", "due_at"])
        
    proposal_indexes = _index_names("syllabus_proposals")
    if "ix_syllabus_proposals_user_syllabus_status" not in proposal_indexes:
        op.create_index("ix_syllabus_proposals_user_syllabus_status", "syllabus_proposals", ["user_id", "syllabus_id", "status"])

def downgrade() -> None:
    proposal_indexes = _index_names("syllabus_proposals")
    if "ix_syllabus_proposals_user_syllabus_status" in proposal_indexes:
        op.drop_index("ix_syllabus_proposals_user_syllabus_status", table_name="syllabus_proposals")
        
    card_indexes = _index_names("cards")
    if "ix_cards_user_due" in card_indexes:
        op.drop_index("ix_cards_user_due", table_name="cards")
    if "ix_cards_user_material" in card_indexes:
        op.drop_index("ix_cards_user_material", table_name="cards")
        
    study_material_indexes = _index_names("study_materials")
    if "ix_study_materials_track_title" in study_material_indexes:
        op.drop_index("ix_study_materials_track_title", table_name="study_materials")
    if "ix_study_materials_track_module_seq" in study_material_indexes:
        op.drop_index("ix_study_materials_track_module_seq", table_name="study_materials")
        
    track_module_indexes = _index_names("track_modules")
    if "ix_track_modules_track_seq" in track_module_indexes:
        op.drop_index("ix_track_modules_track_seq", table_name="track_modules")
        
    track_indexes = _index_names("tracks")
    if "ix_tracks_user_slug" in track_indexes:
        op.drop_index("ix_tracks_user_slug", table_name="tracks")
