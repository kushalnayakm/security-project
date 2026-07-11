from datetime import datetime
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import ORMModel


class EntityCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    gstNo: str | None = Field(default=None, validation_alias=AliasChoices("gstNo", "gst_no"), serialization_alias="gstNo")
    gstDocUrl: str | None = Field(default=None, validation_alias=AliasChoices("gstDocUrl", "gst_doc_url"), serialization_alias="gstDocUrl")
    businessType: str | None = Field(default=None, validation_alias=AliasChoices("businessType", "business_type"), serialization_alias="businessType")
    address: str | None = None
    contactPerson: str | None = Field(
        default=None,
        validation_alias=AliasChoices("contactPerson", "contact_person"),
        serialization_alias="contactPerson",
    )
    phone: str | None = None
    email: EmailStr | None = None
    parentEntityId: UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("parentEntityId", "parent_entity_id"),
        serialization_alias="parentEntityId",
    )


class EntityRegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    gstNo: str = Field(validation_alias=AliasChoices("gstNo", "gst_no"), serialization_alias="gstNo")
    gstDocUrl: str | None = Field(default=None, validation_alias=AliasChoices("gstDocUrl", "gst_doc_url"), serialization_alias="gstDocUrl")
    businessType: str | None = Field(default=None, validation_alias=AliasChoices("businessType", "business_type"), serialization_alias="businessType")
    address: str | None = None
    contactPerson: str | None = Field(
        default=None,
        validation_alias=AliasChoices("contactPerson", "contact_person"),
        serialization_alias="contactPerson",
    )
    phone: str
    email: EmailStr
    password: str


class BranchCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    businessType: str | None = Field(default=None, validation_alias=AliasChoices("businessType", "business_type"), serialization_alias="businessType")
    address: str | None = None
    contactPerson: str | None = Field(
        default=None,
        validation_alias=AliasChoices("contactPerson", "contact_person"),
        serialization_alias="contactPerson",
    )
    phone: str | None = None
    email: EmailStr | None = None


class EntityUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    gstNo: str | None = None
    gstDocUrl: str | None = Field(default=None, validation_alias=AliasChoices("gstDocUrl", "gst_doc_url"), serialization_alias="gstDocUrl")
    businessType: str | None = None
    address: str | None = None
    contactPerson: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    status: str | None = None
    parentEntityId: UUID | None = Field(
        default=None,
        validation_alias=AliasChoices("parentEntityId", "parent_entity_id"),
        serialization_alias="parentEntityId",
    )


class EntityRead(ORMModel):
    entity_id: UUID
    parent_entity_id: UUID | None = None
    entity_type: str = "MAIN"
    name: str
    gst_no: str | None
    gst_doc_url: str | None = None
    business_type: str | None
    address: str | None
    contact_person: str | None
    phone: str | None
    email: str | None
    status: str
    created_at: datetime
    updated_at: datetime

