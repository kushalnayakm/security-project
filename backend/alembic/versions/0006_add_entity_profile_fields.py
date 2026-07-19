"""Add entity profile fields for registration completion

Revision ID: 0006_add_entity_profile_fields
Revises: 0005_add_entity_gst_doc
Create Date: 2026-07-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "0006_add_entity_profile_fields"
down_revision: Union[str, None] = "0005_add_entity_gst_doc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("entities")}

    if "branch_name" not in existing_columns:
        op.add_column("entities", sa.Column("branch_name", sa.String(length=100), nullable=True))
    if "location" not in existing_columns:
        op.add_column("entities", sa.Column("location", sa.Text(), nullable=True))
    if "location_lat" not in existing_columns:
        op.add_column("entities", sa.Column("location_lat", sa.String(length=50), nullable=True))
    if "location_lng" not in existing_columns:
        op.add_column("entities", sa.Column("location_lng", sa.String(length=50), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("entities")}

    if "location_lng" in existing_columns:
        op.drop_column("entities", "location_lng")
    if "location_lat" in existing_columns:
        op.drop_column("entities", "location_lat")
    if "location" in existing_columns:
        op.drop_column("entities", "location")
    if "branch_name" in existing_columns:
        op.drop_column("entities", "branch_name")
