from datetime import datetime
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import ORMModel


class EntityCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    gstNo: str | None = Field(default=None, validation_alias=AliasChoices("gstNo", "gst_no"), serialization_alias="gstNo")
    businessType: str | None = Field(default=None, validation_alias=AliasChoices("businessType", "business_type"), serialization_alias="businessType")
    address: str | None = None
    contactPerson: str | None = Field(
        default=None,
        validation_alias=AliasChoices("contactPerson", "contact_person"),
        serialization_alias="contactPerson",
    )
    phone: str | None = None
    email: EmailStr | None = None


class EntityRegisterRequest(EntityCreate):
    pass


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
