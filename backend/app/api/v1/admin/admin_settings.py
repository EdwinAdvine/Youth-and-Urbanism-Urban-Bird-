from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any

from app.database import get_db
from app.models.site_settings import SiteSetting, DEFAULT_SETTINGS
from app.models.user import User
from app.api.deps import get_super_admin

router = APIRouter()

# Sentinel returned to the client instead of actual secret values.
# If a PATCH request sends this sentinel back, the value is NOT updated.
MASKED = "__masked__"

# Keys whose values must never be returned to the client in plaintext.
SECRET_KEYS: set[str] = {
    "paystack_secret_key",
    "paystack_webhook_secret",
    "mpesa_consumer_key",
    "mpesa_consumer_secret",
    "mpesa_passkey",
    "stripe_secret_key",
    "stripe_webhook_secret",
    "smtp_password",
    "at_api_key",
}

# All valid setting keys — rejects arbitrary key injection.
ALLOWED_KEYS: set[str] = set(DEFAULT_SETTINGS.keys())


class SettingsUpdate(BaseModel):
    settings: dict[str, Any]


async def _ensure_defaults(db: AsyncSession) -> None:
    """Create default settings rows if they don't exist yet (bulk-fetch first)."""
    result = await db.execute(select(SiteSetting.key))
    existing_keys = {row[0] for row in result.all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing_keys:
            db.add(SiteSetting(key=key, value=value))
    await db.flush()


def _mask(key: str, value: Any) -> Any:
    """Return MASKED sentinel for non-empty secret values."""
    if key in SECRET_KEYS:
        return MASKED if value else ""
    return value


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    await _ensure_defaults(db)
    result = await db.execute(select(SiteSetting).order_by(SiteSetting.key))
    settings = result.scalars().all()
    return {s.key: _mask(s.key, s.value) for s in settings}


@router.patch("")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    await _ensure_defaults(db)

    # Reject unknown keys to prevent arbitrary data injection.
    unknown = set(data.settings.keys()) - ALLOWED_KEYS
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown setting key(s): {sorted(unknown)}")

    updated_keys: list[str] = []
    for key, value in data.settings.items():
        # If the client echoes back the masked sentinel, leave the stored value untouched.
        if value == MASKED:
            continue

        result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
            setting.updated_by = admin.id
        else:
            db.add(SiteSetting(key=key, value=value, updated_by=admin.id))
        updated_keys.append(key)

    return {"message": f"Updated {len(updated_keys)} setting(s)", "keys": updated_keys}


@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Public endpoint — returns only safe settings needed by the frontend (no auth required)."""
    PUBLIC_KEYS = [
        "store_name", "store_tagline", "whatsapp_number", "whatsapp_message",
        "announcement_messages", "social_links", "store_logo_url", "cod_enabled",
        "ga4_measurement_id", "meta_pixel_id",
        "available_sizes", "available_colors",
    ]
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key.in_(PUBLIC_KEYS))
    )
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}
