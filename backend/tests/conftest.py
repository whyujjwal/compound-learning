import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401
from app.config import settings
from app.database import Base, get_db
from app.main import app

engine = create_engine(settings.database_url, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TEST_CURRICULUM = {
    "tracks": [
        {
            "slug": "dsa",
            "name": "Data Structures & Algorithms",
            "color": "#22c55e",
            "materials": [
                {
                    "title": "Two Sum (test)",
                    "url": "https://leetcode.com/problems/two-sum/",
                    "block_label": "DSA · Test",
                    "estimated_minutes": 25,
                    "priority_percent": 10,
                    "notes": "Test material.",
                },
                {
                    "title": "Sliding Window Maximum (test)",
                    "url": "https://leetcode.com/problems/sliding-window-maximum/",
                    "block_label": "DSA · Test",
                    "estimated_minutes": 40,
                    "priority_percent": 12,
                },
            ],
        },
        {
            "slug": "ai-math",
            "name": "Mathematics for AI",
            "color": "#a87f9e",
            "materials": [
                {
                    "title": "Gradient intuition (test)",
                    "url": "https://www.3blue1brown.com/",
                    "block_label": "Math · Test",
                    "estimated_minutes": 20,
                    "priority_percent": 14,
                },
                {
                    "title": "Bayes rule (test)",
                    "url": "https://www.youtube.com/",
                    "block_label": "Math · Test",
                    "estimated_minutes": 25,
                    "priority_percent": 18,
                },
            ],
        },
        {
            "slug": "system-design",
            "name": "System Design",
            "color": "#0ea5e9",
            "materials": [
                {
                    "title": "CAP theorem (test)",
                    "url": "https://example.com",
                    "block_label": "SD · Test",
                    "estimated_minutes": 20,
                    "priority_percent": 16,
                },
                {
                    "title": "Load balancing (test)",
                    "url": "https://example.com",
                    "block_label": "SD · Test",
                    "estimated_minutes": 25,
                    "priority_percent": 22,
                },
            ],
        },
    ]
}


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("app.services.auth_service.settings.app_password", None)
    monkeypatch.setattr("app.config.settings.app_password", None)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    from app.services import bootstrap
    from app.services.bootstrap import get_default_user
    from app.services.curriculum_loader import import_curriculum

    bootstrap.bootstrap(db)
    user = get_default_user(db)
    import_curriculum(db, user, TEST_CURRICULUM)

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    db.close()
