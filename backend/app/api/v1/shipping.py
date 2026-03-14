from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.shipping import ShippingZone, ShippingRate

router = APIRouter()


@router.get("/rates")
async def get_shipping_rates(
    county: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShippingZone)
        .options(selectinload(ShippingZone.rates))
        .where(ShippingZone.is_active == True)
    )
    zones = result.scalars().all()

    # Find matching zone for county
    matching_zone = None
    for zone in zones:
        if county.lower() in [c.lower() for c in (zone.counties or [])]:
            matching_zone = zone
            break

    # Fallback to "Upcountry" or first available zone
    if not matching_zone and zones:
        matching_zone = zones[-1]

    if not matching_zone:
        return []

    rates = [
        {
            "id": str(rate.id),
            "method": rate.method,
            "price": float(rate.price),
            "free_above": float(rate.free_above) if rate.free_above else None,
            "estimated_days_min": rate.estimated_days_min,
            "estimated_days_max": rate.estimated_days_max,
        }
        for rate in matching_zone.rates
        if rate.is_active
    ]
    return rates
