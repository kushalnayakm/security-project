"""
Pydantic schemas for file uploads.
"""

from pydantic import BaseModel, Field


class PhotoUploadResponse(BaseModel):
    message: str = "Photo uploaded successfully"
    photo_url: str = Field(..., description="Relative URL to retrieve the image")
    filename: str
    size_bytes: int
    content_type: str
    upload_token: str = Field(
        ...,
        description=(
            "Opaque UUID token. Pass this to POST /api/users/register as "
            "`selfie_token` so the backend can link the selfie row to the new user."
        ),
    )