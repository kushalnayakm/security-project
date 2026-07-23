from datetime import datetime
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import ORMModel


class EntityCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    branchName: str | None = Field(default=None, validation_alias=AliasChoices("branchName", "branch_name"), serialization_alias="branchName")
    gstNo: str | None = Field(default=None, validation_alias=AliasChoices("gstNo", "gst_no"), serialization_alias="gstNo")
    gstDocUrl: str | None = Field(default=None, validation_alias=AliasChoices("gstDocUrl", "gst_doc_url"), serialization_alias="gstDocUrl")
    entityLicenceUrl: str | None = Field(default=None, validation_alias=AliasChoices("entityLicenceUrl", "entity_licence_url"), serialization_alias="entityLicenceUrl")
    businessType: str | None = Field(default=None, validation_alias=AliasChoices("businessType", "business_type"), serialization_alias="businessType")
    address: str | None = None
    location: str | None = None
    locationLat: str | None = Field(default=None, validation_alias=AliasChoices("locationLat", "location_lat"), serialization_alias="locationLat")
    locationLng: str | None = Field(default=None, validation_alias=AliasChoices("locationLng", "location_lng"), serialization_alias="locationLng")
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
    branchName: str | None = Field(default=None, validation_alias=AliasChoices("branchName", "branch_name"), serialization_alias="branchName")
    gstNo: str = Field(validation_alias=AliasChoices("gstNo", "gst_no"), serialization_alias="gstNo")
    gstDocUrl: str | None = Field(default=None, validation_alias=AliasChoices("gstDocUrl", "gst_doc_url"), serialization_alias="gstDocUrl")
    entityLicenceUrl: str | None = Field(default=None, validation_alias=AliasChoices("entityLicenceUrl", "entity_licence_url"), serialization_alias="entityLicenceUrl")
    businessType: str | None = Field(default=None, validation_alias=AliasChoices("businessType", "business_type"), serialization_alias="businessType")
    address: str | None = None
    location: str | None = None
    locationLat: str | None = Field(default=None, validation_alias=AliasChoices("locationLat", "location_lat"), serialization_alias="locationLat")
    locationLng: str | None = Field(default=None, validation_alias=AliasChoices("locationLng", "location_lng"), serialization_alias="locationLng")
    contactPerson: str | None = Field(
        default=None,
        validation_alias=AliasChoices("contactPerson", "contact_person"),
        serialization_alias="contactPerson",
    )
    phone: str
    email: EmailStr | None = None
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
    branchName: str | None = None
    gstNo: str | None = None
    gstDocUrl: str | None = Field(default=None, validation_alias=AliasChoices("gstDocUrl", "gst_doc_url"), serialization_alias="gstDocUrl")
    entityLicenceUrl: str | None = Field(default=None, validation_alias=AliasChoices("entityLicenceUrl", "entity_licence_url"), serialization_alias="entityLicenceUrl")
    businessType: str | None = None
    address: str | None = None
    location: str | None = None
    locationLat: str | None = None
    locationLng: str | None = None
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
    entity_licence_url: str | None = None
    business_type: str | None
    address: str | None
    location: str | None = None
    location_lat: str | None = None
    location_lng: str | None = None
    contact_person: str | None
    phone: str | None
    email: str | None
    status: str
    created_at: datetime
    updated_at: datetime

