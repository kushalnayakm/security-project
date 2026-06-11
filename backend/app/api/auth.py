"""
End-to-end auth workflow routes for mobile, desktop, QR sessions, and registration.
"""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import AuthSession
from app.schemas.user_schema import (
    AuthenticatedSessionResponse,
    DesktopApprovalRequest,
    DesktopSessionCreateResponse,
    FaceLoginOutcomeResponse,
    FaceLoginRequest,
    OTPStartRequest,
    OTPStartResponse,
    RegistrationOTPSendRequest,
    RegistrationOTPVerifyRequest,
    SessionScanRequest,
    SessionScanResponse,
    FingerprintVerifyRequest,
)
from app.services.auth_service import (
    AuthSessionError,
    OTPError,
    approve_desktop_session,
    create_desktop_session,
    get_session_by_token,
    mark_session_scanned,
    match_face_login,
    prepare_login_otp,
    prepare_registration_otp,
    to_session_summary,
    verify_login_otp,
    verify_registration_otp,
    verify_fingerprint_login,
)
from app.services.user_service import PhoneAlreadyRegisteredError, serialize_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/desktop/session", response_model=DesktopSessionCreateResponse, summary="Create a desktop QR login session")
def create_desktop_qr_session(db: Session = Depends(get_db)) -> DesktopSessionCreateResponse:
    session = create_desktop_session(db)
    qr_url = f"{settings.frontend_base_url}/desktop/approve?session={session.session_token}"
    return DesktopSessionCreateResponse(
        message="Desktop login QR is ready",
        session=to_session_summary(session),
        qr_url=qr_url,
    )


@router.post("/registration/session", response_model=SessionScanResponse, summary="Create a registration session for new user onboarding")
def create_registration_session(db: Session = Depends(get_db)) -> SessionScanResponse:
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    def _random_token(length: int = 32) -> str:
        import random
        import string
        return "".join(random.choices(string.ascii_letters + string.digits, k=length))

    session = AuthSession(
        id=str(uuid.uuid4()),
        session_token=_random_token(),
        session_type="registration",
        status="pending_face",
        device_label="mobile",
        expires_at=_utcnow() + timedelta(minutes=settings.access_session_expire_minutes),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionScanResponse(
        message="Registration session created",
        session=to_session_summary(session),
        requires_approval=False,
    )


@router.post("/sessions/scan", response_model=SessionScanResponse, summary="Scan a desktop QR session from mobile")
def scan_session(payload: SessionScanRequest, db: Session = Depends(get_db)) -> SessionScanResponse:
    try:
        session = mark_session_scanned(db, payload.session_token)
    except AuthSessionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return SessionScanResponse(
        message="Desktop session linked to mobile device",
        session=to_session_summary(session),
        requires_approval=True,
    )


@router.get("/sessions/{session_token}", response_model=SessionScanResponse, summary="Check the latest QR session status")
def get_session(session_token: str, db: Session = Depends(get_db)) -> SessionScanResponse:
    try:
        session = get_session_by_token(db, session_token)
    except AuthSessionError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return SessionScanResponse(
        message="Session loaded successfully",
        session=to_session_summary(session),
        requires_approval=session.session_type == "desktop_login",
    )


@router.post("/mobile/face-login", response_model=FaceLoginOutcomeResponse, summary="Run mobile face recognition for QR access")
def mobile_face_login(payload: FaceLoginRequest, db: Session = Depends(get_db)) -> FaceLoginOutcomeResponse:
    try:
        result, session, user, access_token = match_face_login(
            db,
            session_token=payload.session_token,
            image_data=payload.image_data,
            face_profile_key=payload.face_profile_key,
        )
    except AuthSessionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return FaceLoginOutcomeResponse(
        message="Face login processed",
        session=to_session_summary(session),
        result=result,
        user=serialize_user(user) if user else None,
        access_token=access_token,
        face_profile_key=user.face_profile_key if user else None,
        token_type="bearer" if access_token else None,
    )


@router.post("/registration/send-otp", response_model=OTPStartResponse, summary="Send OTP for first-time registration")
def send_registration_otp(
    payload: RegistrationOTPSendRequest,
    db: Session = Depends(get_db),
) -> OTPStartResponse:
    try:
        session, challenge = prepare_registration_otp(db, session_token=payload.session_token, payload=payload.model_dump())
    except (AuthSessionError, OTPError, PhoneAlreadyRegisteredError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return OTPStartResponse(
        message="Registration OTP sent successfully",
        session=to_session_summary(session),
        expires_in_seconds=int((challenge.expires_at - challenge.created_at).total_seconds()),
        otp=challenge.otp_code,
    )


@router.post("/registration/verify-otp", response_model=AuthenticatedSessionResponse, summary="Verify registration OTP and create the user")
def complete_registration(
    payload: RegistrationOTPVerifyRequest,
    db: Session = Depends(get_db),
) -> AuthenticatedSessionResponse:
    try:
        session, user, access_token = verify_registration_otp(db, session_token=payload.session_token, otp=payload.otp)
    except (AuthSessionError, OTPError, PhoneAlreadyRegisteredError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AuthenticatedSessionResponse(
        message="User account created successfully",
        session=to_session_summary(session),
        user=serialize_user(user),
        access_token=access_token,
        face_profile_key=user.face_profile_key,
    )


@router.post("/login/send-otp", response_model=OTPStartResponse, summary="Send OTP fallback after face login failure")
def send_login_otp(payload: OTPStartRequest, db: Session = Depends(get_db)) -> OTPStartResponse:
    try:
        session, challenge = prepare_login_otp(
            db,
            session_token=payload.session_token,
            country_code=payload.country_code,
            phone_number=payload.phone_number,
        )
    except (AuthSessionError, OTPError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return OTPStartResponse(
        message="Login fallback OTP sent successfully",
        session=to_session_summary(session),
        expires_in_seconds=int((challenge.expires_at - challenge.created_at).total_seconds()),
        otp=challenge.otp_code,
    )


@router.post("/login/verify-otp", response_model=AuthenticatedSessionResponse, summary="Verify OTP fallback and complete login")
def complete_login_otp(payload: RegistrationOTPVerifyRequest, db: Session = Depends(get_db)) -> AuthenticatedSessionResponse:
    try:
        session, user, access_token = verify_login_otp(db, session_token=payload.session_token, otp=payload.otp)
    except (AuthSessionError, OTPError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AuthenticatedSessionResponse(
        message="Login approved successfully",
        session=to_session_summary(session),
        user=serialize_user(user),
        access_token=access_token,
        face_profile_key=user.face_profile_key,
    )


@router.post("/desktop/approve", response_model=AuthenticatedSessionResponse, summary="Approve a desktop session from mobile")
def desktop_approve(payload: DesktopApprovalRequest, db: Session = Depends(get_db)) -> AuthenticatedSessionResponse:
    try:
        session, user, access_token = approve_desktop_session(db, session_token=payload.session_token)
    except AuthSessionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AuthenticatedSessionResponse(
        message="Desktop login approved",
        session=to_session_summary(session),
        user=serialize_user(user),
        access_token=access_token,
        face_profile_key=user.face_profile_key,
    )


@router.post("/mobile/verify-fingerprint", response_model=AuthenticatedSessionResponse, summary="Verify fingerprint to complete face login")
def verify_fingerprint(payload: FingerprintVerifyRequest, db: Session = Depends(get_db)) -> AuthenticatedSessionResponse:
    try:
        session, user, access_token = verify_fingerprint_login(
            db,
            session_token=payload.session_token,
            fingerprint_verified=payload.fingerprint_verified,
        )
    except (AuthSessionError, OTPError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AuthenticatedSessionResponse(
        message="Fingerprint login approved",
        session=to_session_summary(session),
        user=serialize_user(user),
        access_token=access_token,
        face_profile_key=user.face_profile_key,
    )
