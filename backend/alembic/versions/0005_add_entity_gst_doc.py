"""Add gst_doc_url to entities table

Revision ID: 0005_add_entity_gst_doc
Revises: 0004_add_staff_management
Create Date: 2026-07-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0005_add_entity_gst_doc'
down_revision: Union[str, None] = '0004_add_staff_management'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('entities', sa.Column('gst_doc_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('entities', 'gst_doc_url')
