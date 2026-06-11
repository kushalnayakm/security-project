"""
Pydantic schemas for the finalized biometric workflow.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SessionSummary(BaseModel):
    session_token: str
    session_type: str
    status: str
    desktop_approved: bool = False
    expires_at: datetime


class UserDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    country_code: str
    phone_number: str
    face_photo_url: str | None
    biometric_supported: bool
    biometric_registered: bool
    phone_verified: bool
    account_active: bool
    created_at: datetime


class AuthenticatedSessionResponse(BaseModel):
    message: str
    session: SessionSummary
    user: UserDashboardResponse
    access_token: str
    face_profile_key: str | None = None
    token_type: str = "bearer"


class DesktopSessionCreateResponse(BaseModel):
    message: str
    session: SessionSummary
    qr_url: str


class SessionScanRequest(BaseModel):
    session_token: str
    device_label: Literal["mobile"] = "mobile"


class SessionScanResponse(BaseModel):
    message: str
    session: SessionSummary
    requires_approval: bool = False


class FaceLoginRequest(BaseModel):
    session_token: str
    image_data: str = Field(..., min_length=30)
    face_profile_key: str | None = None


class FaceLoginOutcomeResponse(BaseModel):
    message: str
    session: SessionSummary
    result: Literal["matched", "registration_required", "otp_fallback", "matched_needs_fingerprint"]
    user: UserDashboardResponse | None = None
    access_token: str | None = None
    face_profile_key: str | None = None
    token_type: str | None = None


class FingerprintVerifyRequest(BaseModel):
    session_token: str
    fingerprint_verified: bool = True


class RegistrationOTPSendRequest(BaseModel):
    session_token: str
    name: str = Field(..., min_length=2, max_length=120)
    country_code: str = Field(..., min_length=2, max_length=6)
    phone_number: str = Field(..., min_length=5, max_length=20)
    face_photo_url: str = Field(..., min_length=3, max_length=512)
    biometric_supported: bool = False
    biometric_registered: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, value: str) -> str:
        value = value.strip()
        if not value.startswith("+"):
            raise ValueError("country_code must start with '+'")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) < 5 or len(digits) > 15:
            raise ValueError("phone_number must contain 5 to 15 digits")
        return digits


class RegistrationOTPVerifyRequest(BaseModel):
    session_token: str
    otp: str = Field(..., min_length=4, max_length=8)


class OTPStartRequest(BaseModel):
    session_token: str
    country_code: str = Field(..., min_length=2, max_length=6)
    phone_number: str = Field(..., min_length=5, max_length=20)


class OTPVerifyRequest(BaseModel):
    session_token: str
    otp: str = Field(..., min_length=4, max_length=8)


class OTPStartResponse(BaseModel):
    message: str
    session: SessionSummary
    expires_in_seconds: int
    otp: str | None = None


class DesktopApprovalRequest(BaseModel):
    session_token: str


class DashboardEnvelope(BaseModel):
    message: str
    user: UserDashboardResponse
