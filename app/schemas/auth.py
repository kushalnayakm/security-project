from uuid import UUID

from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class EntityLoginRequest(BaseModel):
    email: str
    password: str


class CustomerLoginRequest(BaseModel):
    unique_id: str


class TokenResponse(BaseModel):
    token: str
    role: str
    user_id: UUID | None = None
    customer_id: UUID | None = None
