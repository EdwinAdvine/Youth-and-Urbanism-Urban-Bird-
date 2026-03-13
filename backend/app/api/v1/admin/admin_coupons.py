from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
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
    starts_at: datetime
    expires_at: datetime
    is_active: bool = True


@router.get("")
async def list_coupons(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    coupons = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": float(c.discount_value),
            "times_used": c.times_used,
            "usage_limit": c.usage_limit,
            "is_active": c.is_active,
            "expires_at": c.expires_at.isoformat(),
        }
        for c in coupons
    ]


@router.post("", status_code=201)
async def create_coupon(
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    coupon = Coupon(**data.model_dump(), code=data.code.upper())
    db.add(coupon)
    await db.flush()
    return coupon


@router.patch("/{coupon_id}")
async def update_coupon(
    coupon_id: uuid.UUID,
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(coupon, field, value)
    return coupon


@router.delete("/{coupon_id}", status_code=204)
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
