"""Add entity branches support (parent_entity_id and entity_type)

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003_add_entity_branches'
down_revision: Union[str, None] = '0002_add_entities_phone_unique_index'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add parent_entity_id column (self-referencing FK)
    op.add_column('entities', sa.Column('parent_entity_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_entities_parent_entity_id',
        'entities',
        'entities',
        ['parent_entity_id'],
        ['entity_id'],
        ondelete='CASCADE',
    )

    # Add entity_type column with default 'MAIN'
    op.add_column('entities', sa.Column(
        'entity_type',
        sa.String(20),
        nullable=False,
        server_default=sa.text("'MAIN'"),
    ))
    op.create_check_constraint(
        'entities_entity_type_check',
        'entities',
        "entity_type IN ('MAIN','BRANCH')",
    )

    # Add partial index for fast branch lookups
    op.create_index(
        'idx_entities_parent',
        'entities',
        ['parent_entity_id'],
        postgresql_where=sa.text('parent_entity_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('idx_entities_parent', table_name='entities')
    op.drop_constraint('entities_entity_type_check', 'entities', type_='check')
    op.drop_column('entities', 'entity_type')
    op.drop_constraint('fk_entities_parent_entity_id', 'entities', type_='foreignkey')
    op.drop_column('entities', 'parent_entity_id')
