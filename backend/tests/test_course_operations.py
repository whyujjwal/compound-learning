"""Tests for 3-level (section/edge) proposal operations."""

import uuid

import pytest
from fastapi import HTTPException

from app.domains.syllabus.operations import apply_operation
from app.domains.syllabus.schemas import ProposalOperation, ProposalOperationTarget
from app.models.material import StudyMaterial
from app.models.syllabus_edge import SyllabusEdge
from app.models.track import Track
from app.models.track_module import TrackModule
from app.models.track_section import TrackSection
from app.models.user import User


def test_operation_target_supports_section_id():
    target = ProposalOperationTarget(section_id="00000000-0000-0000-0000-000000000001")
    assert str(target.section_id) == "00000000-0000-0000-0000-000000000001"


def _track_with_module(db):
    user = db.query(User).first()
    track = Track(user_id=user.id, slug=f"ops-{uuid.uuid4().hex[:8]}", name="Ops", color="#6366f1")
    db.add(track)
    db.flush()
    module = TrackModule(track_id=track.id, title="M1", sequence=0)
    db.add(module)
    db.flush()
    return user, track, module


def test_section_add_creates_section(db_session):
    user, track, module = _track_with_module(db_session)
    op = ProposalOperation(
        id="op1", type="section.add",
        target=ProposalOperationTarget(syllabus_id=track.id, module_id=module.id),
        payload={"title": "Intro", "objective": "warm up", "kind": "core", "sequence": 0},
    )
    result = apply_operation(db_session, user=user, track=track, operation=op)
    section = db_session.query(TrackSection).filter(TrackSection.id == result["section_id"]).first()
    assert section is not None
    assert section.title == "Intro"
    assert section.module_id == module.id


def test_section_add_requires_module(db_session):
    user, track, module = _track_with_module(db_session)
    op = ProposalOperation(
        id="op2", type="section.add",
        target=ProposalOperationTarget(syllabus_id=track.id),
        payload={"title": "No module"},
    )
    with pytest.raises(HTTPException) as exc:
        apply_operation(db_session, user=user, track=track, operation=op)
    assert exc.value.status_code == 400


def _track_with_section(db):
    user, track, module = _track_with_module(db)
    section = TrackSection(module_id=module.id, title="S1", kind="core", sequence=0)
    db.add(section)
    db.flush()
    return user, track, module, section


def test_section_update_changes_fields(db_session):
    user, track, module, section = _track_with_section(db_session)
    op = ProposalOperation(
        id="u1", type="section.update",
        target=ProposalOperationTarget(syllabus_id=track.id, section_id=section.id),
        payload={"title": "S1 renamed", "kind": "optional"},
    )
    apply_operation(db_session, user=user, track=track, operation=op)
    db_session.refresh(section)
    assert section.title == "S1 renamed"
    assert section.kind == "optional"


def test_section_remove_deletes(db_session):
    user, track, module, section = _track_with_section(db_session)
    sid = section.id
    op = ProposalOperation(
        id="r1", type="section.remove",
        target=ProposalOperationTarget(syllabus_id=track.id, section_id=sid),
        payload={},
    )
    apply_operation(db_session, user=user, track=track, operation=op)
    assert db_session.query(TrackSection).filter(TrackSection.id == sid).first() is None


def test_section_move_sets_sequence_and_module(db_session):
    user, track, module, section = _track_with_section(db_session)
    op = ProposalOperation(
        id="m1", type="section.move",
        target=ProposalOperationTarget(syllabus_id=track.id, section_id=section.id),
        payload={"sequence": 3},
    )
    apply_operation(db_session, user=user, track=track, operation=op)
    db_session.refresh(section)
    assert section.sequence == 3


def test_material_add_attaches_section_and_source(db_session):
    user, track, module, section = _track_with_section(db_session)
    op = ProposalOperation(
        id="ma1", type="material.add",
        target=ProposalOperationTarget(syllabus_id=track.id, module_id=module.id, section_id=section.id),
        payload={
            "title": "Backprop video", "url": "https://www.youtube.com/watch?v=abc",
            "resource_type": "video", "provider": "YouTube", "author": "3Blue1Brown",
            "license": "Standard YouTube", "kind": "core", "label": "Foundations",
            "estimated_minutes": 18, "create_card": False,
        },
    )
    result = apply_operation(db_session, user=user, track=track, operation=op)
    mat = db_session.query(StudyMaterial).filter(StudyMaterial.id == result["material_id"]).first()
    assert mat.section_id == section.id
    assert mat.module_id == module.id
    assert mat.provider == "YouTube"
    assert mat.author == "3Blue1Brown"
    assert mat.kind == "core"
    assert mat.label == "Foundations"


def test_edge_add_and_remove(db_session):
    user, track, module, section = _track_with_section(db_session)
    add = ProposalOperation(
        id="e1", type="edge.add",
        target=ProposalOperationTarget(syllabus_id=track.id),
        payload={"from_node_type": "module", "from_node_id": str(module.id),
                 "to_node_type": "section", "to_node_id": str(section.id), "kind": "requires"},
    )
    result = apply_operation(db_session, user=user, track=track, operation=add)
    edge_id = result["edge_id"]
    assert db_session.query(SyllabusEdge).filter(SyllabusEdge.id == edge_id).first() is not None

    remove = ProposalOperation(
        id="e2", type="edge.remove",
        target=ProposalOperationTarget(syllabus_id=track.id),
        payload={"edge_id": edge_id},
    )
    apply_operation(db_session, user=user, track=track, operation=remove)
    assert db_session.query(SyllabusEdge).filter(SyllabusEdge.id == edge_id).first() is None
