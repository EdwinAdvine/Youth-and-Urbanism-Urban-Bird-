from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any
import uuid

from app.database import get_db
from app.models.site_settings import SiteSetting, DEFAULT_SETTINGS
from app.models.user import User
from app.api.deps import get_super_admin
from app.utils.file_upload import save_product_image

router = APIRouter()


class SettingsUpdate(BaseModel):
    settings: dict[str, Any]


async def _ensure_defaults(db: AsyncSession):
    """Create default settings rows if they don't exist yet."""
    for key, value in DEFAULT_SETTINGS.items():
        existing = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        if not existing.scalar_one_or_none():
            db.add(SiteSetting(key=key, value=value))
    await db.flush()


@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    await _ensure_defaults(db)
    result = await db.execute(select(SiteSetting).order_by(SiteSetting.key))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.patch("")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    await _ensure_defaults(db)
    updated_keys = []

    for key, value in data.settings.items():
        result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
            setting.updated_by = admin.id
        else:
            # Allow creating new custom settings
            db.add(SiteSetting(key=key, value=value, updated_by=admin.id))
        updated_keys.append(key)

    return {"message": f"Updated {len(updated_keys)} setting(s)", "keys": updated_keys}


@router.get("/public")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Public endpoint — returns only safe settings needed by the frontend (no auth required)."""
    PUBLIC_KEYS = [
        "store_name", "store_tagline", "whatsapp_number", "whatsapp_message",
        "announcement_messages", "social_links", "store_logo_url",
    ]
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.key.in_(PUBLIC_KEYS))
    )
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}
