"""Add staff management and roles support

Revision ID: 0004_add_staff_management
Revises: 0003_add_entity_branches
Create Date: 2026-07-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0004_add_staff_management'
down_revision: Union[str, None] = '0003_add_entity_branches'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add photo_url to users table
    op.add_column('users', sa.Column('photo_url', sa.Text(), nullable=True))

    # 2. Add role column to entity_users table with default 'OWNER'
    op.add_column('entity_users', sa.Column('role', sa.String(length=30), nullable=False, server_default=sa.text("'OWNER'")))
    op.create_check_constraint(
        'entity_users_role_check',
        'entity_users',
        "role IN ('OWNER', 'MANAGER', 'STAFF')"
    )

    # 3. Add added_by column to entity_users table
    op.add_column('entity_users', sa.Column('added_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_entity_users_added_by',
        'entity_users',
        'users',
        ['added_by'],
        ['user_id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_entity_users_added_by', 'entity_users', type_='foreignkey')
    op.drop_column('entity_users', 'added_by')
    op.drop_constraint('entity_users_role_check', 'entity_users', type_='check')
    op.drop_column('entity_users', 'role')
    op.drop_column('users', 'photo_url')
