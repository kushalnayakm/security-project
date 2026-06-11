"""
User data access helpers.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user_schema import UserDashboardResponse
from app.services.face_service import create_embedding_from_file, create_face_profile_key


class UserNotFoundError(Exception):
    pass


class PhoneAlreadyRegisteredError(Exception):
    pass


class FaceRegistrationError(Exception):
    pass


def get_user_by_id(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError(f"User with id={user_id} was not found.")
    return user


def get_user_by_phone(db: Session, country_code: str, phone_number: str) -> User | None:
    return (
        db.query(User)
        .filter(User.country_code == country_code, User.phone_number == phone_number)
        .first()
    )


def get_user_by_face_profile_key(db: Session, face_profile_key: str) -> User | None:
    return db.query(User).filter(User.face_profile_key == face_profile_key).first()


def serialize_user(user: User) -> UserDashboardResponse:
    return UserDashboardResponse(
        user_id=user.id,
        name=user.name,
        country_code=user.country_code,
        phone_number=user.phone_number,
        face_photo_url=user.face_photo_url,
        biometric_supported=user.biometric_supported,
        biometric_registered=user.biometric_registered,
        phone_verified=user.phone_verified,
        account_active=user.account_active,
        created_at=user.created_at,
    )


def create_user(
    db: Session,
    *,
    name: str,
    country_code: str,
    phone_number: str,
    face_photo_url: str,
    biometric_supported: bool,
    biometric_registered: bool,
    upload_root: Path,
) -> User:
    if get_user_by_phone(db, country_code, phone_number):
        raise PhoneAlreadyRegisteredError(f"Phone {country_code}{phone_number} is already registered.")

    file_path = upload_root / Path(face_photo_url).name
    if not file_path.is_file():
        raise FaceRegistrationError("Face photo file could not be found for registration.")

    embedding = create_embedding_from_file(file_path)
    user = User(
        id=str(uuid.uuid4()),
        name=name.strip(),
        country_code=country_code.strip(),
        phone_number=phone_number.strip(),
        face_photo_url=face_photo_url,
        face_embedding=json.dumps(embedding),
        face_profile_key=create_face_profile_key(embedding, country_code, phone_number),
        biometric_supported=biometric_supported,
        biometric_registered=biometric_registered if biometric_supported else False,
        phone_verified=True,
        account_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_biometric_flags(
    db: Session,
    user_id: str,
    *,
    biometric_supported: bool,
    biometric_registered: bool,
) -> User:
    user = get_user_by_id(db, user_id)
    user.biometric_supported = biometric_supported
    user.biometric_registered = biometric_registered if biometric_supported else False
    db.commit()
    db.refresh(user)
    return user
