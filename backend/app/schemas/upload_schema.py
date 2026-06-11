"""
Pydantic schemas for file uploads.
"""
from pydantic import BaseModel


class PhotoUploadResponse(BaseModel):
    message: str = "Photo uploaded successfully"
    photo_url: str
    filename: str
    size_bytes: int
    content_type: str
