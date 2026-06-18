# backend/app/services/upload_service.py
"""
Upload service — validates, persists, and records KYC selfie images.

Validation layers
-----------------
1. Content-Type header check  (fast, first gate)
2. Magic-byte sniff           (prevents content-type spoofing)
3. File-size limit            (configurable via settings)

Storage
-------
Images are written to  <settings.upload_path>/<filename>
A UserSelfie row is inserted so every upload is auditable.

TODO (v2): Replace local disk write with AWS S3 / GCS and store the CDN URL.
TODO (v2): Run async face-detection pre-check (OpenCV / DeepFace) here.
TODO (v2): Generate a thumbnail alongside the full image.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user_selfie import UserSelfie


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png":  ".png",
    "image/webp": ".webp",
}

# Magic-byte signatures — checked against the first 12 bytes of the upload.
# This prevents content-type spoofing (e.g. a .exe renamed to .jpg).
_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff",              "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n",        "image/png"),
    (b"RIFF",                      "image/webp"),  # bytes 0-3; bytes 8-11 = "WEBP"
]

_MAX_MAGIC_PROBE = 12  # bytes to read for magic check


def _sniff_content_type(header: bytes) -> str | None:
    """Return detected MIME type from magic bytes, or None if unrecognised."""
    for magic, mime in _MAGIC:
        if header.startswith(magic):
            return mime
        # WebP also needs bytes 8-11 == b"WEBP"
        if magic == b"RIFF" and header[8:12] == b"WEBP":
            return "image/webp"
    return None


def _safe_extension(content_type: str, original_filename: str) -> str:
    """
    Derive a safe, lowercase extension.
    Falls back to the content-type mapping; never trusts the original filename alone.
    """
    declared = ALLOWED_EXTENSIONS.get(content_type)
    if declared:
        return declared
    suffix = Path(original_filename).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"


def _sanitise_original_name(name: str | None) -> str:
    """Return a short, path-traversal-free version of the original filename."""
    if not name:
        return "selfie.jpg"
    # Take only the final path component, then strip everything except safe chars
    safe = Path(name).name
    safe = "".join(c for c in safe if c.isalnum() or c in "._- ")
    return safe[:120] or "selfie.jpg"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def save_selfie(file: UploadFile, db: Session) -> dict:
    """
    Validate, persist, and record a KYC selfie image.

    Parameters
    ----------
    file : UploadFile
        Multipart file from FastAPI.
    db : Session
        SQLAlchemy session (injected by the router).

    Returns
    -------
    dict
        Keys: photo_url, filename, size_bytes, content_type, upload_token.

    Raises
    ------
    HTTPException 400  — unsupported type / empty file / magic-byte mismatch.
    HTTPException 413  — file exceeds size limit.
    """
    # ── Gate 1: declared content-type ────────────────────────────────────────
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type: {file.content_type!r}. "
                f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            ),
        )

    # ── Read content ──────────────────────────────────────────────────────────
    content: bytes = await file.read()
    size_bytes = len(content)

    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # ── Gate 2: magic-byte verification ──────────────────────────────────────
    detected = _sniff_content_type(content[:_MAX_MAGIC_PROBE])
    if detected is None or detected != file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File content does not match declared type {file.content_type!r}. "
                "Upload a genuine JPEG, PNG, or WebP image."
            ),
        )

    # ── Gate 3: size limit ────────────────────────────────────────────────────
    if size_bytes > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size {size_bytes / 1_048_576:.1f} MB exceeds the "
                f"{settings.max_file_size_mb} MB limit."
            ),
        )

    # ── Persist to disk ───────────────────────────────────────────────────────
    upload_token = str(uuid.uuid4())
    ext          = _safe_extension(file.content_type, file.filename or "selfie.jpg")
    filename     = f"{uuid.uuid4().hex}{ext}"

    settings.upload_path.mkdir(parents=True, exist_ok=True)
    dest: Path = settings.upload_path / filename
    dest.write_bytes(content)

    # ── Write DB row ──────────────────────────────────────────────────────────
    selfie = UserSelfie(
        image_path=f"uploads/selfies/{filename}",
        original_filename=_sanitise_original_name(file.filename),
        size_bytes=size_bytes,
        content_type=file.content_type,
        upload_token=upload_token,
    )
    db.add(selfie)
    db.commit()
    db.refresh(selfie)

    return {
        "photo_url":    f"static/selfies/{filename}",
        "filename":     filename,
        "size_bytes":   size_bytes,
        "content_type": file.content_type,
        "upload_token": upload_token,
    }