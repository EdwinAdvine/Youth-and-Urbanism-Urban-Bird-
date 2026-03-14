from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Urban Bird API"
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Database
    postgres_user: str = "urbanbird_user"
    postgres_password: str = "password"
    postgres_db: str = "urbanbird_db"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Redis
    redis_password: str = "urbanbird_redis_dev"
    redis_host: str = "redis"
    redis_port: int = 6379

    @property
    def redis_url(self) -> str:
        return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"

    # JWT
    jwt_secret_key: str = "change_me_very_long_random_secret_key_at_least_32_chars"
    jwt_algorithm: str = "HS256"

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if "change_me" in v.lower() or len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a strong random value (minimum 32 characters). "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # M-Pesa
    mpesa_environment: str = "sandbox"
    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = "174379"
    mpesa_passkey: str = ""
    mpesa_callback_url: str = "http://localhost:8000/api/v1/payments/mpesa/callback"

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # Paystack
    paystack_secret_key: str = ""
    paystack_public_key: str = ""
    paystack_webhook_secret: str = ""

    # Email — SMTP (outbound)
    smtp_host: str = "smtp.office365.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Urban Bird"
    from_email: str = ""
    from_name: str = "Urban Bird"

    # Email — IMAP (inbound, for future reply parsing)
    imap_host: str = "outlook.office365.com"
    imap_port: int = 993
    imap_user: str = ""
    imap_password: str = ""
    imap_ssl: bool = True

    # Admin
    admin_email: str = ""
    admin_name: str = "Urban Bird Admin"

    # SMS (Africa's Talking)
    at_username: str = "sandbox"
    at_api_key: str = ""
    at_sender_id: str = "URBANBIRD"

    # Storage
    upload_dir: str = "/app/uploads"
    max_image_size_mb: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
