from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.coupon import Coupon
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()


class CouponCreate(BaseModel):
    code: str
    description: str | None = None
    discount_type: str  # percentage, fixed_amount
    discount_value: Decimal
    min_order_amount: Decimal = Decimal("0.00")
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    per_user_limit: int = 1
    starts_at: datetime | None = None  # defaults to now if not provided
    expires_at: datetime
    is_active: bool = True


class CouponUpdate(BaseModel):
    code: str | None = None
    description: str | None = None
    discount_type: str | None = None
    discount_value: Decimal | None = None
    min_order_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    per_user_limit: int | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None


def _coupon_dict(c: Coupon) -> dict:
    return {
        "id": str(c.id),
        "code": c.code,
        "description": c.description,
        "discount_type": c.discount_type,
        "discount_value": float(c.discount_value),
        "min_order_amount": float(c.min_order_amount),
        "max_discount_amount": float(c.max_discount_amount) if c.max_discount_amount else None,
        "times_used": c.times_used,
        "usage_limit": c.usage_limit,
        "per_user_limit": c.per_user_limit,
        "is_active": c.is_active,
        "starts_at": c.starts_at.isoformat() if c.starts_at else None,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("")
async def list_coupons(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    coupons = result.scalars().all()
    return [_coupon_dict(c) for c in coupons]


@router.post("", status_code=201)
async def create_coupon(
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    payload = data.model_dump()
    payload["code"] = data.code.upper().strip()
    if payload["starts_at"] is None:
        payload["starts_at"] = datetime.now(timezone.utc)

    coupon = Coupon(**payload)
    db.add(coupon)
    await db.flush()
    return _coupon_dict(coupon)


@router.patch("/{coupon_id}")
async def update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    updates = data.model_dump(exclude_unset=True)
    if "code" in updates and updates["code"]:
        updates["code"] = updates["code"].upper().strip()

    for field, value in updates.items():
        setattr(coupon, field, value)

    return _coupon_dict(coupon)


@router.delete("/{coupon_id}", status_code=204)
async def delete_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    await db.delete(coupon)


@router.patch("/{coupon_id}/deactivate")
async def deactivate_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.is_active = False
    return _coupon_dict(coupon)
