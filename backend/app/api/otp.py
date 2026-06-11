"""
OTP compatibility routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user_schema import OTPStartRequest, OTPStartResponse, OTPVerifyRequest
from app.services.auth_service import OTPError, prepare_login_otp, verify_login_otp, to_session_summary
from app.services.user_service import serialize_user

router = APIRouter(prefix="/api/otp", tags=["OTP"])


@router.post("/send", response_model=OTPStartResponse, summary="Start OTP fallback for login")
def send_otp(payload: OTPStartRequest, db: Session = Depends(get_db)) -> OTPStartResponse:
    try:
        session, challenge = prepare_login_otp(
            db,
            session_token=payload.session_token,
            country_code=payload.country_code,
            phone_number=payload.phone_number,
        )
    except OTPError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return OTPStartResponse(
        message="OTP sent successfully",
        session=to_session_summary(session),
        expires_in_seconds=int((challenge.expires_at - challenge.created_at).total_seconds()),
        otp=challenge.otp_code,
    )


@router.post("/verify", summary="Verify login fallback OTP")
def verify_otp(payload: OTPVerifyRequest, db: Session = Depends(get_db)):
    try:
        session, user, access_token = verify_login_otp(db, session_token=payload.session_token, otp=payload.otp)
    except OTPError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {
        "message": "OTP verified successfully",
        "session": to_session_summary(session).model_dump(),
        "user": serialize_user(user).model_dump(),
        "access_token": access_token,
        "token_type": "bearer",
        "face_profile_key": user.face_profile_key,
    }
