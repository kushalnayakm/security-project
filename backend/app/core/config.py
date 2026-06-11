"""
Core configuration — reads from .env via pydantic-settings.
"""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "BiometricPlatform"
    app_version: str = "1.0.0"
    debug: bool = False

    # Security
    secret_key: str = "change-me-in-production-must-be-at-least-32-characters"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    frontend_base_url: str = "http://localhost:5173"

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/biometric_db"
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # Upload
    upload_dir: str = "uploads/selfies"
    max_file_size_mb: int = 5
    allowed_image_types: str = "image/jpeg,image/png,image/webp"

    # OTP
    otp_expire_minutes: int = 10
    otp_length: int = 6
    access_session_expire_minutes: int = 20
    desktop_session_expire_minutes: int = 10

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173"

    # ------------------------------------------------------------------ #
    # Computed helpers (not read from env)                                 #
    # ------------------------------------------------------------------ #
    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def allowed_image_types_list(self) -> list[str]:
        return [t.strip() for t in self.allowed_image_types.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
