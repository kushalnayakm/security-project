from uuid import UUID

from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    admin_id: str
    password: str


class ForgotAdminIdRequest(BaseModel):
    phone: str


class EntityLoginRequest(BaseModel):
    email: str
    password: str


class EntityOtpRequest(BaseModel):
    gst_no: str
    phone: str


class EntityOtpVerifyRequest(BaseModel):
    gst_no: str
    phone: str
    otp: str


class CustomerLoginRequest(BaseModel):
    unique_id: str


class TokenResponse(BaseModel):
    token: str
    role: str
    user_id: UUID | None = None
    customer_id: UUID | None = None
