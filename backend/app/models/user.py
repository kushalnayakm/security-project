"""
SQLAlchemy models for the biometric identity platform.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    country_code: Mapped[str] = mapped_column(String(6), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    face_photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    face_embedding: Mapped[str | None] = mapped_column(Text, nullable=True)
    face_profile_key: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    biometric_supported: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    biometric_registered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    account_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    auth_sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user")
    otp_challenges: Mapped[list["OTPChallenge"]] = relationship(back_populates="user")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    session_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    session_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    location_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    location_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    device_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    fallback_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    desktop_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    registration_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    face_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User | None] = relationship(back_populates="auth_sessions")
    otp_challenges: Mapped[list["OTPChallenge"]] = relationship(back_populates="session")


class OTPChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    country_code: Mapped[str] = mapped_column(String(6), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    otp_code: Mapped[str] = mapped_column(String(8), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=5, server_default="5")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("auth_sessions.id"), nullable=True, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    session: Mapped[AuthSession | None] = relationship(back_populates="otp_challenges")
    user: Mapped[User | None] = relationship(back_populates="otp_challenges")
