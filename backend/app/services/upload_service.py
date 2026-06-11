"""
Upload service — handles selfie image validation and disk persistence.

TODO (v2): Replace local disk storage with AWS S3 / GCS.
TODO (v2): Run async face-detection pre-check before accepting the upload.
TODO (v2): Generate and store a thumbnail alongside the full image.
"""
import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException, status

from app.core.config import settings


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _safe_filename(original: str) -> str:
    """Generate a collision-resistant filename while preserving the extension."""
    suffix = Path(original).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        suffix = ".jpg"
    return f"{uuid.uuid4().hex}{suffix}"


async def save_selfie(file: UploadFile) -> dict:
    """
    Validate and persist an uploaded selfie image.

    Args:
        file: The UploadFile instance from FastAPI.

    Returns:
        dict with keys: photo_url, filename, size_bytes, content_type.

    Raises:
        HTTPException 400 on validation failure.
        HTTPException 413 if the file exceeds the configured size limit.
    """
    # ---- content-type check ----
    if file.content_type not in settings.allowed_image_types_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type: {file.content_type!r}. "
                f"Allowed: {', '.join(settings.allowed_image_types_list)}"
            ),
        )

    # ---- read content ----
    content = await file.read()
    size_bytes = len(content)

    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if size_bytes > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size {size_bytes / 1_048_576:.1f} MB exceeds the "
                f"{settings.max_file_size_mb} MB limit."
            ),
        )

    # ---- persist to disk ----
    filename = _safe_filename(file.filename or "selfie.jpg")
    dest: Path = settings.upload_path / filename

    dest.write_bytes(content)

    photo_url = f"static/selfies/{filename}"

    # TODO (v2): upload `content` to S3 here and return the CDN URL instead.

    return {
        "photo_url": photo_url,
        "filename": filename,
        "size_bytes": size_bytes,
        "content_type": file.content_type,
    }
