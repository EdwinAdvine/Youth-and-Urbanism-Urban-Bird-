from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from decimal import Decimal
import uuid

from app.database import get_db
from app.models.shipping import ShippingZone, ShippingRate
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()


class ZoneCreate(BaseModel):
    name: str
    counties: list[str] = []
    is_active: bool = True


class ZoneUpdate(BaseModel):
    name: str | None = None
    counties: list[str] | None = None
    is_active: bool | None = None


class RateCreate(BaseModel):
    method: str
    price: Decimal
    free_above: Decimal | None = None
    estimated_days_min: int
    estimated_days_max: int
    is_active: bool = True


class RateUpdate(BaseModel):
    method: str | None = None
    price: Decimal | None = None
    free_above: Decimal | None = None
    estimated_days_min: int | None = None
    estimated_days_max: int | None = None
    is_active: bool | None = None


def _zone_dict(zone: ShippingZone) -> dict:
    return {
        "id": str(zone.id),
        "name": zone.name,
        "counties": zone.counties or [],
        "is_active": zone.is_active,
        "rates": [_rate_dict(r) for r in (zone.rates or [])],
    }


def _rate_dict(rate: ShippingRate) -> dict:
    return {
        "id": str(rate.id),
        "zone_id": str(rate.zone_id),
        "method": rate.method,
        "price": float(rate.price),
        "free_above": float(rate.free_above) if rate.free_above else None,
        "estimated_days_min": rate.estimated_days_min,
        "estimated_days_max": rate.estimated_days_max,
        "is_active": rate.is_active,
    }


@router.get("/zones")
async def list_zones(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ShippingZone).options(selectinload(ShippingZone.rates)).order_by(ShippingZone.name)
    )
    zones = result.scalars().all()
    return [_zone_dict(z) for z in zones]


@router.post("/zones", status_code=201)
async def create_zone(
    data: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    zone = ShippingZone(**data.model_dump())
    db.add(zone)
    await db.flush()
    await db.refresh(zone)
    zone.rates = []
    return _zone_dict(zone)


@router.patch("/zones/{zone_id}")
async def update_zone(
    zone_id: uuid.UUID,
    data: ZoneUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ShippingZone).options(selectinload(ShippingZone.rates)).where(ShippingZone.id == zone_id)
    )
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(zone, field, value)
    return _zone_dict(zone)


@router.delete("/zones/{zone_id}", status_code=204)
async def delete_zone(
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(ShippingZone).where(ShippingZone.id == zone_id))
    zone = result.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    await db.delete(zone)


@router.post("/zones/{zone_id}/rates", status_code=201)
async def create_rate(
    zone_id: uuid.UUID,
    data: RateCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    zone_result = await db.execute(select(ShippingZone).where(ShippingZone.id == zone_id))
    if not zone_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Zone not found")
    rate = ShippingRate(zone_id=zone_id, **data.model_dump())
    db.add(rate)
    await db.flush()
    return _rate_dict(rate)


@router.patch("/rates/{rate_id}")
async def update_rate(
    rate_id: uuid.UUID,
    data: RateUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(ShippingRate).where(ShippingRate.id == rate_id))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(status_code=404, detail="Rate not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rate, field, value)
    return _rate_dict(rate)


@router.delete("/rates/{rate_id}", status_code=204)
async def delete_rate(
    rate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(ShippingRate).where(ShippingRate.id == rate_id))
    rate = result.scalar_one_or_none()
    if not rate:
        raise HTTPException(status_code=404, detail="Rate not found")
    await db.delete(rate)
