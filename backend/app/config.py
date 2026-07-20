"""
Central configuration. All values are read from environment variables so the
same codebase runs unchanged on local dev and on Render.

On Render:
  - Create a PostgreSQL instance, copy its "Internal Database URL" into
    DATABASE_URL on the web service.
  - Set JWT_SECRET_KEY to a long random string (Render can auto-generate one).
  - Set AWS_* vars only if you actually wire up S3 image uploads; otherwise
    the presigned-url endpoint will simply return a clear error.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database ---
    # Render gives you a URL like: postgres://user:pass@host/dbname
    # SQLAlchemy needs the "postgresql+psycopg2://" scheme, so we normalize it
    # in database.py rather than forcing the user to edit the Render value.
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/menu_platform"

    # --- Auth ---
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h token lifetime

    # --- Subscription tiers -> max menu items (Section 1.5 / 3.3.1) ---
    tier_limits: dict = {
        "FREE": 20,
        "BASIC": 50,
        "STANDARD": 200,
    }

    # --- Optional S3 config for image uploads (Section 4.2.6) ---
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    s3_bucket_name: str | None = None

    # --- CORS: comma separated list of allowed origins ---
    cors_origins: str = "*"

    # --- Redis (Render "Key Value" instance) — Section 3.3.3 / 3.2.2 ---
    # Leave unset to run cache-less (falls back straight to PostgreSQL, same
    # as before). Set to a Render Key Value "Internal Connection String" to
    # enable the menu cache + scan anti-spam sliding window.
    redis_url: str | None = None
    menu_cache_ttl_seconds: int = 60
    scan_dedupe_window_seconds: int = 1200  # 20 minutes, per Section 3.3.3 QuotaEnforcer

    # --- Public menu base URL, used to encode QR codes (Section 3.3.2) ---
    # e.g. https://menu.yourplatform.com — the *public* static site origin,
    # not the API origin. Falls back to a relative-looking placeholder if unset.
    public_menu_base_url: str = "https://menu.example.com"


settings = Settings()
