from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
import json

from app.database import get_db
from app.redis import get_redis
from app.models.product import Product, ProductImage
from app.schemas.product import ProductSearchResult

router = APIRouter()


@router.get("/autocomplete", response_model=list[ProductSearchResult])
async def autocomplete(
    q: str = Query(..., min_length=2),
    limit: int = Query(4, ge=1, le=8),
    db: AsyncSession = Depends(get_db),
):
    if len(q) < 2:
        return []

    # Check Redis cache
    redis = await get_redis()
    cache_key = f"search:auto:{q.lower()[:50]}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(
            Product.status == "active",
            or_(
                func.lower(Product.name).contains(q.lower()),
                func.lower(Product.brand).contains(q.lower()),
            )
        )
        .order_by(Product.purchase_count.desc())
        .limit(limit)
    )
    products = result.scalars().all()

    items = []
    for p in products:
        thumbnail = None
        for img in p.images:
            if img.is_primary:
                thumbnail = img.thumbnail_url or img.url
                break
        if not thumbnail and p.images:
            thumbnail = p.images[0].thumbnail_url or p.images[0].url

        items.append({
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "price": float(p.price),
            "thumbnail_url": thumbnail,
        })

    # Cache for 5 minutes
    await redis.setex(cache_key, 300, json.dumps(items))
    return items
