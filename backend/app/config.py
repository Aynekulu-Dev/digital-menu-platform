"""
Central configuration. All values are read from environment variables so the
same codebase runs unchanged on local dev and on Render.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/menu_platform"

    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    tier_limits: dict = {
        "FREE": 20,
        "BASIC": 50,
        "STANDARD": 200,
    }

    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    s3_bucket_name: str | None = None

    cors_origins: str = "*"

    redis_url: str | None = None
    menu_cache_ttl_seconds: int = 60
    scan_dedupe_window_seconds: int = 1200

    public_menu_base_url: str = "https://menu.example.com"

    # --- Email (invite / password-reset links) ---
    # Resend (HTTPS API) is preferred: Render's free plan blocks outbound
    # SMTP ports (25/465/587), so raw smtplib will time out there.
    resend_api_key: str | None = None
    brevo_api_key: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@menuplatform.local"
    smtp_use_tls: bool = True

    frontend_base_url: str = "http://localhost:5173"

    invite_token_expire_hours: int = 72
    reset_token_expire_hours: int = 2


settings = Settings()