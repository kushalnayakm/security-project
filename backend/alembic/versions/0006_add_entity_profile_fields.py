"""Add entity profile fields for registration completion

Revision ID: 0006_add_entity_profile_fields
Revises: 0005_add_entity_gst_doc
Create Date: 2026-07-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0006_add_entity_profile_fields"
down_revision: Union[str, None] = "0005_add_entity_gst_doc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("entities", sa.Column("branch_name", sa.String(length=100), nullable=True))
    op.add_column("entities", sa.Column("location", sa.Text(), nullable=True))
    op.add_column("entities", sa.Column("location_lat", sa.String(length=50), nullable=True))
    op.add_column("entities", sa.Column("location_lng", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("entities", "location_lng")
    op.drop_column("entities", "location_lat")
    op.drop_column("entities", "location")
    op.drop_column("entities", "branch_name")
