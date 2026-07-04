from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    status: str | None = None


class CustomerRead(ORMModel):
    customer_id: UUID
    entity_id: UUID
    unique_id: str
    name: str | None
    phone: str | None
    status: str
    created_at: datetime
    updated_at: datetime
