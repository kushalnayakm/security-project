"""Initial biometric platform schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-05 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("country_code", sa.String(length=6), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=False),
        sa.Column("face_photo_url", sa.String(length=512), nullable=True),
        sa.Column("face_embedding", sa.Text(), nullable=True),
        sa.Column("face_profile_key", sa.String(length=64), nullable=True),
        sa.Column("biometric_supported", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("biometric_registered", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("account_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_phone_number"), "users", ["phone_number"], unique=True)
    op.create_index(op.f("ix_users_face_profile_key"), "users", ["face_profile_key"], unique=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_token", sa.String(length=64), nullable=False),
        sa.Column("session_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("location_code", sa.String(length=64), nullable=True),
        sa.Column("location_name", sa.String(length=120), nullable=True),
        sa.Column("device_label", sa.String(length=32), nullable=True),
        sa.Column("fallback_reason", sa.String(length=255), nullable=True),
        sa.Column("desktop_approved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("registration_payload", sa.Text(), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("face_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_sessions_id"), "auth_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_auth_sessions_session_token"), "auth_sessions", ["session_token"], unique=True)
    op.create_index(op.f("ix_auth_sessions_session_type"), "auth_sessions", ["session_type"], unique=False)
    op.create_index(op.f("ix_auth_sessions_status"), "auth_sessions", ["status"], unique=False)
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)

    op.create_table(
        "otp_challenges",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("country_code", sa.String(length=6), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=False),
        sa.Column("otp_code", sa.String(length=8), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=True),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["auth_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_otp_challenges_id"), "otp_challenges", ["id"], unique=False)
    op.create_index(op.f("ix_otp_challenges_phone_number"), "otp_challenges", ["phone_number"], unique=False)
    op.create_index(op.f("ix_otp_challenges_purpose"), "otp_challenges", ["purpose"], unique=False)
    op.create_index(op.f("ix_otp_challenges_session_id"), "otp_challenges", ["session_id"], unique=False)
    op.create_index(op.f("ix_otp_challenges_user_id"), "otp_challenges", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_otp_challenges_user_id"), table_name="otp_challenges")
    op.drop_index(op.f("ix_otp_challenges_session_id"), table_name="otp_challenges")
    op.drop_index(op.f("ix_otp_challenges_purpose"), table_name="otp_challenges")
    op.drop_index(op.f("ix_otp_challenges_phone_number"), table_name="otp_challenges")
    op.drop_index(op.f("ix_otp_challenges_id"), table_name="otp_challenges")
    op.drop_table("otp_challenges")

    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_status"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_session_type"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_session_token"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_id"), table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index(op.f("ix_users_face_profile_key"), table_name="users")
    op.drop_index(op.f("ix_users_phone_number"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
