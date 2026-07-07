from uuid import UUID

from pydantic import BaseModel, model_validator


class AdminLoginRequest(BaseModel):
    admin_id: str | None = None
    admin_code: str | None = None
    password: str

    @model_validator(mode="after")
    def check_id_or_code(self) -> "AdminLoginRequest":
        if not self.admin_id and not self.admin_code:
            raise ValueError("Either admin_id or admin_code must be provided")
        if self.admin_code and not self.admin_id:
            self.admin_id = self.admin_code
        elif self.admin_id and not self.admin_code:
            self.admin_code = self.admin_id
        return self


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
