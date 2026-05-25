"""Initial schema baseline for Compound v2."""

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tables are created via SQLAlchemy create_all at startup for dev/test.
    # Alembic tracks schema evolution for production deployments.
    pass


def downgrade() -> None:
    pass
