from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class SuccessFlag(BaseModel):
    success: bool = True


class AuditLogRead(ORMModel):
    log_id: UUID
    user_id: UUID | None
    action: str
    target_type: str
    target_id: UUID | None
    ip_address: str | None
    created_at: datetime


JsonDict = dict[str, Any]
