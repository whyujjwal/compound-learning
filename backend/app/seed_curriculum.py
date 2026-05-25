"""CLI: python -m app.seed_curriculum [path/to/curriculum.json]

Imports a curriculum file into the default user's tracks/materials.
"""

import sys
from pathlib import Path

from app.database import SessionLocal
from app.services.bootstrap import get_default_user
from app.services.curriculum_loader import import_curriculum, load_file


def main() -> None:
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = Path(__file__).resolve().parents[2] / "docs" / "curriculum.json"

    if not path.exists():
        print(f"Curriculum file not found: {path}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading curriculum from {path}…")
    data = load_file(path)

    db = SessionLocal()
    try:
        user = get_default_user(db)
        stats = import_curriculum(db, user, data)
        print("\nImport complete:")
        for key, value in stats.items():
            print(f"  {key:>22}: {value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
