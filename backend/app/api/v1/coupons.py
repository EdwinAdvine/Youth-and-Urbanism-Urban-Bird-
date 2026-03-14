from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from pydantic import BaseModel
from datetime import datetime, timezone

from app.database import get_db
from app.models.coupon import Coupon

router = APIRouter()


class CouponValidateRequest(BaseModel):
    code: str
    order_subtotal: Decimal


@router.post("/validate")
async def validate_coupon(data: CouponValidateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Coupon).where(
            Coupon.code == data.code.upper(),
            Coupon.is_active == True,
        )
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    now = datetime.now(timezone.utc)
    if coupon.expires_at and coupon.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if coupon.starts_at and coupon.starts_at.replace(tzinfo=timezone.utc) > now:
        raise HTTPException(status_code=400, detail="Coupon is not yet active")
    if data.order_subtotal < coupon.min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount is KSh {coupon.min_order_amount}"
        )
    if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if coupon.discount_type == "percentage":
        discount = data.order_subtotal * (coupon.discount_value / 100)
        if coupon.max_discount_amount:
            discount = min(discount, coupon.max_discount_amount)
    else:
        discount = min(coupon.discount_value, data.order_subtotal)

    return {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "discount_amount": float(discount),
        "description": coupon.description,
    }
