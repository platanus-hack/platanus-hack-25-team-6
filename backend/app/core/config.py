from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", case_sensitive=False, extra="ignore")

    # Database
    mongodb_uri: str = "mongodb://admin:password123@localhost:27017/wellness?authSource=admin"
    database_name: str = "wellness"

    # Storage (MinIO)
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_use_ssl: bool = False
    minio_bucket: str = "recordings"

    # AI Services
    anthropic_api_key: str = ""
    elevenlabs_api_key: str = ""
    openai_api_key: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    base_url: str = ""  # Your server's public URL (ngrok for dev)

    # Kapso.ai (WhatsApp)
    kapso_api_key: str = ""
    kapso_phone_number_id: str = ""

    # App
    environment: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173", "https://getruklo.com", "https://safe-line.xyz"]


def get_settings() -> Settings:
    """Get settings - reloads from .env each time for development"""
    return Settings()
