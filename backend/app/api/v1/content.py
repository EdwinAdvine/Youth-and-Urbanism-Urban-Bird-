from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.site_settings import SiteSetting, DEFAULT_SETTINGS

router = APIRouter()

CONTENT_KEYS = {
    "faq": "page_content_faq",
    "privacy": "page_content_privacy",
    "terms": "page_content_terms",
    "shipping": "page_content_shipping",
    "size-guide": "page_content_size_guide",
}


@router.get("/{page}")
async def get_public_page_content(
    page: str,
    db: AsyncSession = Depends(get_db),
):
    setting_key = CONTENT_KEYS.get(page)
    if not setting_key:
        raise HTTPException(status_code=404, detail=f"Unknown content page: {page}")
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == setting_key))
    setting = result.scalar_one_or_none()
    if setting and setting.value is not None:
        return setting.value
    return DEFAULT_SETTINGS.get(setting_key)
