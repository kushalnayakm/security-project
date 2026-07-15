import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file(file: UploadFile) -> None:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )


async def save_upload_file(file: UploadFile, prefix: str = "") -> str:
    validate_file(file)
    
    ext = Path(file.filename).suffix.lower()
    filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return f"/uploads/{filename}"


async def save_upload_file_bytes(content: bytes, filename: str, prefix: str = "") -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    new_filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / new_filename
    
    with open(filepath, "wb") as f:
        f.write(content)
    
    return f"/uploads/{new_filename}"