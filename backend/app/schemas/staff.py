from datetime import datetime
from uuid import UUID
from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field
from app.schemas.common import ORMModel


class StaffCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    phone: str
    email: EmailStr | None = None
    photoUrl: str | None = Field(
        default=None,
        validation_alias=AliasChoices("photoUrl", "photo_url"),
        serialization_alias="photoUrl",
    )
    role: str = "STAFF"  # 'STAFF' or 'MANAGER'
    entityId: UUID = Field(
        validation_alias=AliasChoices("entityId", "entity_id"),
        serialization_alias="entityId",
    )


class StaffUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    photoUrl: str | None = Field(
        default=None,
        validation_alias=AliasChoices("photoUrl", "photo_url"),
        serialization_alias="photoUrl",
    )
    role: str | None = None
    status: str | None = None  # 'ACTIVE', 'INACTIVE', 'SUSPENDED'


class StaffRead(ORMModel):
    user_id: UUID
    name: str
    phone: str | None
    email: str | None
    photo_url: str | None
    role: str
    entity_id: UUID
    entity_name: str
    status: str
    created_at: datetime
