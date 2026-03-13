from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

from app.database import get_db
from app.models.banner import Banner
from app.models.user import User
from app.api.deps import get_admin_user
from app.utils.file_upload import save_product_image

router = APIRouter()


class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    image_url: str
    mobile_image_url: Optional[str] = None
    overlay_color: Optional[str] = "rgba(0,0,0,0.35)"
    display_order: int = 0
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    overlay_color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class BannerOrderUpdate(BaseModel):
    ordered_ids: list[uuid.UUID]


@router.get("")
async def list_banners(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Banner).order_by(Banner.display_order.asc()))
    banners = result.scalars().all()
    return [_banner_dict(b) for b in banners]


@router.get("/public")
async def get_public_banners(db: AsyncSession = Depends(get_db)):
    """Public endpoint — returns active banners for the storefront (no auth required)."""
    now = datetime.utcnow()
    result = await db.execute(
        select(Banner)
        .where(
            Banner.is_active == True,
            (Banner.starts_at == None) | (Banner.starts_at <= now),
            (Banner.ends_at == None) | (Banner.ends_at >= now),
        )
        .order_by(Banner.display_order.asc())
    )
    banners = result.scalars().all()
    return [_banner_dict(b) for b in banners]


@router.post("", status_code=201)
async def create_banner(
    data: BannerCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    banner = Banner(**data.model_dump())
    db.add(banner)
    await db.flush()
    return _banner_dict(banner)


@router.patch("/{banner_id}")
async def update_banner(
    banner_id: uuid.UUID,
    data: BannerUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(banner, field, value)

    return _banner_dict(banner)


@router.delete("/{banner_id}", status_code=204)
async def delete_banner(
    banner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    await db.delete(banner)


@router.post("/reorder")
async def reorder_banners(
    data: BannerOrderUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update display_order based on the provided ID list (index = order)."""
    for i, banner_id in enumerate(data.ordered_ids):
        result = await db.execute(select(Banner).where(Banner.id == banner_id))
        banner = result.scalar_one_or_none()
        if banner:
            banner.display_order = i
    return {"message": "Banners reordered"}


@router.post("/upload-image")
async def upload_banner_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
):
    """Upload a banner image and return its URL."""
    saved = await save_product_image(file, "banners")
    return {"url": saved["url"]}


def _banner_dict(b: Banner) -> dict:
    return {
        "id": str(b.id),
        "title": b.title,
        "subtitle": b.subtitle,
        "cta_text": b.cta_text,
        "cta_link": b.cta_link,
        "image_url": b.image_url,
        "mobile_image_url": b.mobile_image_url,
        "overlay_color": b.overlay_color,
        "display_order": b.display_order,
        "is_active": b.is_active,
        "starts_at": b.starts_at.isoformat() if b.starts_at else None,
        "ends_at": b.ends_at.isoformat() if b.ends_at else None,
        "created_at": b.created_at.isoformat(),
    }
