"""
Session and OTP workflow orchestration.
"""
from __future__ import annotations

import json
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import AuthSession, OTPChallenge
from app.schemas.user_schema import SessionSummary
from app.services.user_service import (
    PhoneAlreadyRegisteredError,
    create_user,
    get_user_by_face_profile_key,
    get_user_by_id,
    get_user_by_phone,
)


class AuthSessionError(Exception):
    pass


class OTPError(Exception):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _random_token(length: int = 32) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def to_session_summary(session: AuthSession) -> SessionSummary:
    return SessionSummary(
        session_token=session.session_token,
        session_type=session.session_type,
        status=session.status,
        desktop_approved=session.desktop_approved,
        expires_at=session.expires_at,
    )


def create_desktop_session(db: Session) -> AuthSession:
    session = AuthSession(
        id=str(uuid.uuid4()),
        session_token=_random_token(),
        session_type="desktop_login",
        status="pending_scan",
        device_label="desktop",
        expires_at=_utcnow() + timedelta(minutes=settings.desktop_session_expire_minutes),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_by_token(db: Session, session_token: str) -> AuthSession:
    session = db.query(AuthSession).filter(AuthSession.session_token == session_token).first()
    if session is None:
        raise AuthSessionError("The QR session could not be found.")
    if session.expires_at <= _utcnow():
        session.status = "expired"
        db.commit()
        raise AuthSessionError("The QR session has expired.")
    return session


def mark_session_scanned(db: Session, session_token: str) -> AuthSession:
    session = get_session_by_token(db, session_token)
    if session.session_type != "desktop_login":
        raise AuthSessionError("Only desktop login sessions can be scanned for approval.")
    session.status = "awaiting_approval"
    db.commit()
    db.refresh(session)
    return session


def match_face_login(
    db: Session,
    *,
    session_token: str,
    image_data: str,
    face_profile_key: str | None,
):
    """
    Face login logic:
    - matched + biometric_supported + biometric_registered → return 'matched_needs_fingerprint'
      (frontend will auto-prompt fingerprint — no button, just hardware check)
    - matched + biometric not supported/registered → return 'matched' → go directly to dashboard
    - not matched + face_profile_key exists → otp_fallback
    - not matched + no face_profile_key → registration_required
    """
    session = get_session_by_token(db, session_token)
    matched_user = get_user_by_face_profile_key(db, face_profile_key) if face_profile_key else None

    if matched_user is not None:
        # ✅ Face matched — now check if fingerprint is needed
        needs_fingerprint = (
            matched_user.biometric_supported and matched_user.biometric_registered
        )

        if needs_fingerprint:
            # Don't approve session yet — wait for fingerprint verification
            session.user_id = matched_user.id
            session.status = "pending_fingerprint"
            db.commit()
            db.refresh(session)
            return (
                "matched_needs_fingerprint",
                session,
                matched_user,
                None,  # no access token yet — fingerprint must pass first
            )
        else:
            # No fingerprint on this device — approve directly
            access_token = create_access_token(
                subject=matched_user.id,
                extra_claims={"amr": "face"},
            )
            session.user_id = matched_user.id
            session.status = "approved"
            session.access_token = access_token
            db.commit()
            db.refresh(session)
            return "matched", session, matched_user, access_token

    # ❌ Face not matched
    session.face_attempts += 1
    session.fallback_reason = "Face recognition was not confident enough."
    if face_profile_key:
        session.status = "otp_required"
        result = "otp_fallback"
    else:
        session.status = "registration_required"
        result = "registration_required"
    db.commit()
    db.refresh(session)
    return result, session, None, None


# ------------------------------------------------------------------ #
# NEW — Fingerprint verification after face match                     #
# ------------------------------------------------------------------ #
def verify_fingerprint_login(
    db: Session,
    *,
    session_token: str,
    fingerprint_verified: bool,  # frontend sends True/False after WebAuthn/hardware check
) -> tuple[AuthSession, object, str]:
    """
    Called after face matched and device supports fingerprint.
    Frontend auto-triggers hardware fingerprint — sends result here.
    - verified=True  → approve session, return access token → Dashboard
    - verified=False → raise error (let frontend retry or fallback to OTP)
    """
    session = get_session_by_token(db, session_token)

    if session.status != "pending_fingerprint":
        raise AuthSessionError("Session is not awaiting fingerprint verification.")

    if session.user_id is None:
        raise AuthSessionError("No user attached to this session.")

    if not fingerprint_verified:
        raise AuthSessionError("Fingerprint verification failed. Please try again.")

    user = get_user_by_id(db, session.user_id)
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"amr": "face+fingerprint"},
    )
    session.status = "approved"
    session.access_token = access_token
    db.commit()
    db.refresh(session)
    return session, user, access_token


def create_otp_challenge(
    db: Session,
    *,
    session: AuthSession,
    country_code: str,
    phone_number: str,
    purpose: str,
    user_id: str | None = None,
) -> OTPChallenge:
    code = "".join(random.choices(string.digits, k=settings.otp_length))
    challenge = OTPChallenge(
        id=str(uuid.uuid4()),
        purpose=purpose,
        country_code=country_code,
        phone_number=phone_number,
        otp_code=code,
        session_id=session.id,
        user_id=user_id,
        expires_at=_utcnow() + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def prepare_registration_otp(
    db: Session,
    *,
    session_token: str,
    payload: dict,
) -> tuple[AuthSession, OTPChallenge]:
    session = get_session_by_token(db, session_token)
    if get_user_by_phone(db, payload["country_code"], payload["phone_number"]):
        raise PhoneAlreadyRegisteredError(
            f'Phone {payload["country_code"]}{payload["phone_number"]} is already registered.'
        )
    session.registration_payload = json.dumps(payload)
    session.status = "otp_required"
    challenge = create_otp_challenge(
        db,
        session=session,
        country_code=payload["country_code"],
        phone_number=payload["phone_number"],
        purpose="registration",
    )
    db.refresh(session)
    return session, challenge


def prepare_login_otp(
    db: Session,
    *,
    session_token: str,
    country_code: str,
    phone_number: str,
) -> tuple[AuthSession, OTPChallenge]:
    session = get_session_by_token(db, session_token)
    user = get_user_by_phone(db, country_code, phone_number)
    if user is None:
        raise OTPError("No existing user account was found for this phone number.")
    session.user_id = user.id
    session.status = "otp_required"
    challenge = create_otp_challenge(
        db,
        session=session,
        country_code=country_code,
        phone_number=phone_number,
        purpose="login_fallback",
        user_id=user.id,
    )
    db.refresh(session)
    return session, challenge


def _get_active_challenge(db: Session, session: AuthSession) -> OTPChallenge:
    challenge = (
        db.query(OTPChallenge)
        .filter(OTPChallenge.session_id == session.id)
        .order_by(OTPChallenge.created_at.desc())
        .first()
    )
    if challenge is None:
        raise OTPError("No OTP challenge was found for this session.")
    if challenge.verified_at is not None:
        raise OTPError("This OTP challenge has already been used.")
    if challenge.expires_at <= _utcnow():
        raise OTPError("OTP has expired. Please request a new one.")
    if challenge.attempts >= challenge.max_attempts:
        raise OTPError("Too many incorrect OTP attempts. Please request a new one.")
    return challenge


def verify_registration_otp(db: Session, *, session_token: str, otp: str):
    session = get_session_by_token(db, session_token)
    challenge = _get_active_challenge(db, session)

    if challenge.otp_code != otp.strip():
        challenge.attempts += 1
        db.commit()
        raise OTPError("Incorrect OTP. Please try again.")

    payload = json.loads(session.registration_payload or "{}")
    user = create_user(
        db,
        name=payload["name"],
        country_code=payload["country_code"],
        phone_number=payload["phone_number"],
        face_photo_url=payload["face_photo_url"],
        biometric_supported=payload["biometric_supported"],
        biometric_registered=payload["biometric_registered"],
        upload_root=settings.upload_path,
    )
    challenge.verified_at = _utcnow()
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"amr": "otp_registration"},
    )
    session.user_id = user.id
    session.status = "approved"
    session.access_token = access_token
    db.commit()
    db.refresh(session)
    return session, user, access_token


def verify_login_otp(db: Session, *, session_token: str, otp: str):
    session = get_session_by_token(db, session_token)
    challenge = _get_active_challenge(db, session)
    if challenge.otp_code != otp.strip():
        challenge.attempts += 1
        db.commit()
        raise OTPError("Incorrect OTP. Please try again.")

    challenge.verified_at = _utcnow()
    user = get_user_by_id(db, session.user_id or "")
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"amr": "otp_fallback"},
    )
    session.status = "approved"
    session.access_token = access_token
    db.commit()
    db.refresh(session)
    return session, user, access_token


def approve_desktop_session(db: Session, *, session_token: str):
    session = get_session_by_token(db, session_token)
    if session.session_type != "desktop_login":
        raise AuthSessionError("This session is not a desktop login flow.")
    if session.user_id is None or session.access_token is None:
        raise AuthSessionError("Authenticate on mobile before approving the desktop login.")
    user = get_user_by_id(db, session.user_id)
    session.desktop_approved = True
    session.status = "approved"
    db.commit()
    db.refresh(session)
    return session, user, session.access_token


def get_dashboard_user(db: Session, session_token: str):
    session = get_session_by_token(db, session_token)
    if session.user_id is None:
        raise AuthSessionError("No authenticated user is attached to this session.")
    return session, get_user_by_id(db, session.user_id)