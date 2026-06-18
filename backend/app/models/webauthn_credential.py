"""
WebAuthn credential storage.
We store the credential ID and public key — never biometric data.
"""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    credential_id: Mapped[str] = mapped_column(
        Text, nullable=False, unique=True,
        comment="Base64URL encoded credential ID from authenticator"
    )
    public_key: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Base64URL encoded COSE public key"
    )
    sign_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Monotonic counter — detects cloned authenticators"
    )
    aaguid: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="Authenticator model identifier"
    )
    device_type: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="windows_hello / touch_id / android_fingerprint etc"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )