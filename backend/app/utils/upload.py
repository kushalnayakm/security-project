import re
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


async def save_upload_file(file: UploadFile) -> str:
    """Persist an upload under uploads/ and return a frontend-accessible URL."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(content)
    return f"/uploads/{filename}"


def _slugify_filename(filename: str) -> str:
    stem = Path(filename).stem.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return slug or "file"


async def save_entity_document(
    file: UploadFile,
    *,
    entity_id: str,
    document_label: str,
) -> tuple[str, str, int, str | None]:
    """Store a document in a per-entity folder and return URL plus metadata."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 10MB limit")

    slug = _slugify_filename(file.filename)
    short_uuid = uuid.uuid4().hex[:6]
    entity_folder = UPLOAD_DIR / "entities" / str(entity_id)
    entity_folder.mkdir(parents=True, exist_ok=True)
    filename = f"{document_label}_{slug}_{short_uuid}{ext}"
    filepath = entity_folder / filename
    filepath.write_bytes(content)
    url = f"/uploads/entities/{entity_id}/{filename}"
    return url, file.filename, len(content), file.content_type


async def save_document_record(session, entity_id: str, user_id: str, document_type: str, 
                                file_path: str, original_filename: str, file_size: int, mime_type: str):
    """Save document record to database after entity/user creation."""
    from app.models.document import Document
    doc = Document(
        entity_id=entity_id,
        user_id=user_id,
        document_type=document_type,
        file_path=file_path,
        original_filename=original_filename,
        file_size=file_size,
        mime_type=mime_type,
    )
    session.add(doc)
    await session.flush()
    return doc


async def upsert_document_record(
    session,
    entity_id: str,
    user_id: str,
    document_type: str,
    file_path: str,
    original_filename: str,
    file_size: int,
    mime_type: str,
):
    """Insert or replace a document record for a given entity/document type."""
    from sqlalchemy import select
    from app.models.document import Document

    existing = await session.scalar(
        select(Document).where(Document.entity_id == entity_id, Document.document_type == document_type)
    )
    if existing:
        existing.user_id = user_id
        existing.file_path = file_path
        existing.original_filename = original_filename
        existing.file_size = file_size
        existing.mime_type = mime_type
        return existing

    return await save_document_record(
        session,
        entity_id,
        user_id,
        document_type,
        file_path,
        original_filename,
        file_size,
        mime_type,
    )
