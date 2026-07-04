from typing import Any, Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str


class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool
    data: T | None
    error: ErrorDetail | None


def success_response(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "error": None}


def error_response(code: str, message: str) -> dict[str, Any]:
    return {"success": False, "data": None, "error": {"code": code, "message": message}}
