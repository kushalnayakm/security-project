from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMModel


class EntityCreate(BaseModel):
    name: str
    gstNo: str | None = None
    businessType: str | None = None
    address: str | None = None
    contactPerson: str | None = None
    phone: str | None = None
    email: EmailStr | None = None


class EntityRegisterRequest(EntityCreate):
    password: str


class EntityUpdate(BaseModel):
    name: str | None = None
    gstNo: str | None = None
    businessType: str | None = None
    address: str | None = None
    contactPerson: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    status: str | None = None


class EntityRead(ORMModel):
    entity_id: UUID
    name: str
    gst_no: str | None
    business_type: str | None
    address: str | None
    contact_person: str | None
    phone: str | None
    email: str | None
    status: str
    created_at: datetime
    updated_at: datetime
