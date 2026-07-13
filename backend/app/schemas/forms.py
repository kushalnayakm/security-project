from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import JsonDict, ORMModel


class FormFieldInput(BaseModel):
    label: str
    type: str
    isRequired: bool = False
    options: list[str] | None = None
    order: int = 0


class DynamicFormCreate(BaseModel):
    title: str
    description: str | None = None
    fields: list[FormFieldInput]


class DynamicFormUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    fields: list[FormFieldInput] | None = None


class PublishFormRequest(BaseModel):
    isActive: bool


class SubmissionCreate(BaseModel):
    entityId: UUID | None = None
    data: JsonDict


class CertificateCreate(BaseModel):
    pdfUrl: str


class FormRead(ORMModel):
    form_id: UUID
    entity_id: UUID
    title: str
    description: str | None
    is_active: bool
    created_at: datetime


class WelcomeUpdateRequest(BaseModel):
    showWelcome: bool
    welcomeTitle: str | None = None
    welcomeMessage: str | None = None
    welcomeLogo: str | None = None
