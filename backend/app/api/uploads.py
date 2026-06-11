"""
Router: /api/upload
"""
from fastapi import APIRouter, File, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path

from app.schemas.upload_schema import PhotoUploadResponse
from app.services.upload_service import save_selfie
from app.core.config import settings


router = APIRouter(prefix="/api/upload", tags=["Upload"])


# ------------------------------------------------------------------ #
# POST /api/upload/photo                                               #
# ------------------------------------------------------------------ #
@router.post(
    "/photo",
    response_model=PhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a selfie / face photo",
    description=(
        "Accepts a JPEG, PNG, or WebP image up to the configured size limit. "
        "Returns the `photo_url` to be passed to POST /api/users/register. "
        "\n\n"
        "**TODO (v2):** Run face-detection (e.g. OpenCV / DeepFace) before "
        "accepting the upload so that only images containing a face are stored."
    ),
)
async def upload_photo(
    file: UploadFile = File(..., description="Image file (JPEG / PNG / WebP)"),
) -> PhotoUploadResponse:
    result = await save_selfie(file)

    return PhotoUploadResponse(
        message="Photo uploaded successfully",
        photo_url=result["photo_url"],
        filename=result["filename"],
        size_bytes=result["size_bytes"],
        content_type=result["content_type"],
    )


# ------------------------------------------------------------------ #
# GET /api/upload/selfies/{filename}  (convenience — serve the file)  #
# ------------------------------------------------------------------ #
@router.get(
    "/selfies/{filename}",
    summary="Retrieve a stored selfie by filename",
    include_in_schema=True,
)
def get_selfie(filename: str):
    """
    Serve an uploaded selfie directly.
    In production this endpoint is NOT needed — files are served from S3/CDN.
    TODO (v2): Remove or gate behind authentication.
    """
    file_path = settings.upload_path / filename
    if not file_path.is_file():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(str(file_path))
