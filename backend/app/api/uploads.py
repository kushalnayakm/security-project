# backend/app/api/uploads.py
"""
Router: /api/upload
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.upload_schema import PhotoUploadResponse
from app.services.upload_service import save_selfie


router = APIRouter(prefix="/api/upload", tags=["Upload"])


# ── POST /api/upload/photo ────────────────────────────────────────────────────
@router.post(
    "/photo",
    response_model=PhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a KYC selfie",
    description=(
        "Accepts a JPEG, PNG, or WebP image up to the configured size limit. "
        "Returns `photo_url` and `upload_token`. "
        "Pass `upload_token` to POST /api/users/register as `selfie_token` "
        "so the backend can link the selfie row to the new user.\n\n"
        "**TODO (v2):** Run server-side face detection before accepting the upload."
    ),
)
async def upload_photo(
    file: UploadFile = File(..., description="Image file (JPEG / PNG / WebP)"),
    db: Session = Depends(get_db),
) -> PhotoUploadResponse:
    result = await save_selfie(file, db)
    return PhotoUploadResponse(**result, message="Photo uploaded successfully")


# ── GET /api/upload/selfies/{filename} ───────────────────────────────────────
@router.get(
    "/selfies/{filename}",
    summary="Retrieve a stored selfie by filename",
    include_in_schema=True,
)
def get_selfie(filename: str) -> FileResponse:
    """
    Serve a selfie directly.
    In production, files are served from S3 / CDN — remove this endpoint then.
    TODO (v2): Gate behind authentication.
    """
    # Prevent path traversal: reject any filename containing a separator
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = settings.upload_path / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(str(file_path))