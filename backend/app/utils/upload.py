import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def save_upload_file(file: UploadFile) -> str:
    """Save uploaded file to disk, return the file path."""
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
    
    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    
    # Read and save file
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    return str(file_path)


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
