"""CLI: python -m app.recheck_links — re-verify all material URLs."""

from app.database import SessionLocal
from app.domains.course.link_health import recheck_links


def main() -> None:
    db = SessionLocal()
    try:
        stats = recheck_links(db)
        print("Link health:", stats)
    finally:
        db.close()


if __name__ == "__main__":
    main()
