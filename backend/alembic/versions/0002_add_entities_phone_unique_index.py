"""Add unique index on entities.phone column."""

from alembic import op


revision = "0002_add_entities_phone_unique_index"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE UNIQUE INDEX idx_entities_phone_unique ON entities(phone) WHERE phone IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_entities_phone_unique")
