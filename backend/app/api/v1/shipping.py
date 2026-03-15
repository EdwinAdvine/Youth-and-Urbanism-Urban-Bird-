from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.shipping import ShippingZone, ShippingRate

router = APIRouter()


@router.get("/zones")
async def get_all_shipping_zones(db: AsyncSession = Depends(get_db)):
    """Public endpoint — returns all active shipping zones with their rates."""
    result = await db.execute(
        select(ShippingZone)
        .options(selectinload(ShippingZone.rates))
        .where(ShippingZone.is_active == True)
        .order_by(ShippingZone.name)
    )
    zones = result.scalars().all()
    return [
        {
            "id": str(zone.id),
            "name": zone.name,
            "counties": zone.counties or [],
            "rates": [
                {
                    "method": rate.method,
                    "price": float(rate.price),
                    "free_above": float(rate.free_above) if rate.free_above else None,
                    "estimated_days_min": rate.estimated_days_min,
                    "estimated_days_max": rate.estimated_days_max,
                }
                for rate in zone.rates
                if rate.is_active
            ],
        }
        for zone in zones
    ]


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

    # Always append pickup rates from any zone whose name contains "pickup" (case-insensitive)
    pickup_zone_ids = {zone.id for zone in zones if "pickup" in zone.name.lower()}
    if matching_zone.id not in pickup_zone_ids:
        for zone in zones:
            if zone.id in pickup_zone_ids:
                for rate in zone.rates:
                    if rate.is_active:
                        rates.append({
                            "id": str(rate.id),
                            "method": rate.method,
                            "price": float(rate.price),
                            "free_above": float(rate.free_above) if rate.free_above else None,
                            "estimated_days_min": rate.estimated_days_min,
                            "estimated_days_max": rate.estimated_days_max,
                        })

    return rates
