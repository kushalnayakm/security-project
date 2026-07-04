from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Certificate Management System"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    db_url: str = Field(default="postgresql+asyncpg://cert_admin:your_strong_password@localhost:5432/cert_system", alias="DATABASE_URL")
    jwt_secret: str = Field(default="change_me", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expiry_minutes: int = Field(default=60, alias="JWT_EXPIRY_MINUTES")
    customer_jwt_expiry_minutes: int = Field(default=30, alias="CUSTOMER_JWT_EXPIRY_MINUTES")
    cors_origins: list[str] = Field(default_factory=lambda: ["*"], alias="CORS_ORIGINS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
