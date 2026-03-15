from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """
    Central configuration for the Urban Bird API.

    All values are read from environment variables (case-insensitive).
    In development the values fall back to safe defaults so the app starts
    without a .env file.  In production every secret MUST be set explicitly.

    Generate a strong JWT secret with:
        python -c "import secrets; print(secrets.token_hex(32))"
    """

    model_config = SettingsConfigDict(
        env_file=".env",          # reads from backend/.env if present
        env_file_encoding="utf-8",
        case_sensitive=False,     # POSTGRES_HOST == postgres_host
        extra="ignore",           # unknown env vars are silently ignored
    )

    # ── Application ────────────────────────────────────────────────────────────
    # Set ENVIRONMENT=production on Coolify/live servers.
    # This controls: HSTS header, Swagger UI visibility, CORS origins, debug logs.
    app_name: str = "Urban Bird API"
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"   # used in email links and CORS
    backend_url: str = "http://localhost:8000"    # used in sitemap + callback URLs

    # ── Database (PostgreSQL via asyncpg) ──────────────────────────────────────
    # In Docker Compose the host is typically the service name ("postgres").
    # For managed databases (e.g. Supabase, Neon) set each variable explicitly.
    postgres_user: str = "urbanbird_user"
    postgres_password: str = "password"
    postgres_db: str = "urbanbird_db"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        """Async-compatible PostgreSQL connection string for SQLAlchemy."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Redis ──────────────────────────────────────────────────────────────────
    # Redis is used for:
    #   - Refresh-token JTI tracking (prefix: "refresh:")
    #   - Password-reset token storage (prefix: "pwd_reset:")
    #   - Content caching for products, categories, search (flushed on startup)
    redis_password: str = "urbanbird_redis_dev"
    redis_host: str = "redis"
    redis_port: int = 6379

    @property
    def redis_url(self) -> str:
        """Redis connection string used by aioredis."""
        return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"

    # ── JWT Authentication ─────────────────────────────────────────────────────
    # Access tokens expire in 30 minutes; refresh tokens in 7 days.
    # Refresh tokens are stored in an httpOnly cookie and tracked by JTI in Redis.
    jwt_secret_key: str = "change_me_very_long_random_secret_key_at_least_32_chars"
    jwt_algorithm: str = "HS256"

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Prevent accidental deployment with the placeholder secret key."""
        if "change_me" in v.lower() or len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a strong random value (minimum 32 characters). "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    access_token_expire_minutes: int = 30   # short-lived, in-memory on frontend
    refresh_token_expire_days: int = 7      # long-lived, stored in httpOnly cookie

    # ── M-Pesa (Safaricom Daraja API) ─────────────────────────────────────────
    # Set mpesa_environment="production" for live transactions.
    # mpesa_callback_url must be publicly reachable by Safaricom's servers.
    mpesa_environment: str = "sandbox"
    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = "174379"    # sandbox default; replace with real shortcode
    mpesa_passkey: str = ""
    mpesa_callback_url: str = "http://localhost:8000/api/v1/payments/mpesa/callback"

    # ── Stripe ─────────────────────────────────────────────────────────────────
    # Stripe integration is coded but not surfaced in the default checkout UI.
    # Enable by exposing it in CheckoutPage.tsx payment method options.
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # ── Paystack (Primary Payment Gateway) ────────────────────────────────────
    # Use sk_test_* / pk_test_* for development; live keys for production.
    # paystack_webhook_secret is used to verify HMAC-SHA512 webhook signatures.
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_webhook_secret: str = ""

    # ── Email — SMTP Outbound (Office365) ─────────────────────────────────────
    # Email sending is silently disabled if smtp_user or smtp_password is empty.
    # Set admin_email to receive new-order and low-stock alert emails.
    smtp_host: str = "smtp.office365.com"
    smtp_port: int = 587          # STARTTLS
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Urban Bird"
    from_email: str = ""          # displayed as the sender address
    from_name: str = "Urban Bird"

    # ── Email — IMAP Inbound (future use) ─────────────────────────────────────
    # Reserved for a future feature to parse customer reply emails automatically.
    imap_host: str = "outlook.office365.com"
    imap_port: int = 993
    imap_user: str = ""
    imap_password: str = ""
    imap_ssl: bool = True

    # ── Admin ──────────────────────────────────────────────────────────────────
    admin_email: str = ""           # primary recipient for admin alert emails
    admin_name: str = "Urban Bird Admin"

    # ── SMS — Africa's Talking ─────────────────────────────────────────────────
    # SMS sending is disabled if at_api_key is empty.
    # Use at_username="sandbox" + at_api_key="test" for local testing.
    at_username: str = "sandbox"
    at_api_key: str = ""
    at_sender_id: str = "URBANBIRD"  # registered sender ID on Africa's Talking

    # ── File Storage ───────────────────────────────────────────────────────────
    # Product images are saved to upload_dir with UUID filenames and served
    # at /uploads/<uuid>.<ext>.  Filenames never change so they can be cached
    # with immutable Cache-Control for 1 year.
    upload_dir: str = "/app/uploads"
    max_image_size_mb: int = 5


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance.  Import `settings` instead of calling this directly."""
    return Settings()


# Module-level singleton — imported throughout the app as `from app.config import settings`
settings = get_settings()
