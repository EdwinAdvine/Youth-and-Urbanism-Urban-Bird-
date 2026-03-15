from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any

from app.database import get_db
from app.models.site_settings import SiteSetting, DEFAULT_SETTINGS
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()

CONTENT_KEYS = {
    "faq": "page_content_faq",
    "privacy": "page_content_privacy",
    "terms": "page_content_terms",
    "shipping": "page_content_shipping",
    "size-guide": "page_content_size_guide",
}


def _setting_key(page: str) -> str:
    key = CONTENT_KEYS.get(page)
    if not key:
        raise HTTPException(status_code=404, detail=f"Unknown content page: {page}")
    return key


class ContentUpdate(BaseModel):
    content: Any


@router.get("/{page}")
async def get_page_content(
    page: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    setting_key = _setting_key(page)
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == setting_key))
    setting = result.scalar_one_or_none()
    if setting and setting.value is not None:
        return {"page": page, "content": setting.value}
    # Return hardcoded default
    return {"page": page, "content": DEFAULT_SETTINGS.get(setting_key)}


@router.put("/{page}")
async def update_page_content(
    page: str,
    data: ContentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    setting_key = _setting_key(page)
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == setting_key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = data.content
        setting.updated_by = admin.id
    else:
        db.add(SiteSetting(key=setting_key, value=data.content, updated_by=admin.id))
    return {"message": f"Content for '{page}' updated successfully"}
