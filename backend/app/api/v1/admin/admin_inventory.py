from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.product import Product, ProductVariant
from app.models.product import InventoryLog
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()


class RestockItem(BaseModel):
    variant_id: uuid.UUID
    quantity: int
    note: str | None = None


@router.get("")
async def get_inventory(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    result = await db.execute(
        select(ProductVariant)
        .options(selectinload(ProductVariant.product))
        .order_by(ProductVariant.stock_quantity.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    variants = result.scalars().all()
    return [
        {
            "id": str(v.id),
            "sku": v.sku,
            "product_name": v.product.name if v.product else "",
            "size": v.size,
            "color_name": v.color_name,
            "stock_quantity": v.stock_quantity,
            "is_active": v.is_active,
        }
        for v in variants
    ]


@router.post("/restock")
async def restock_variants(
    items: list[RestockItem],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    updated = []
    for item in items:
        result = await db.execute(
            select(ProductVariant).options(selectinload(ProductVariant.product))
            .where(ProductVariant.id == item.variant_id)
        )
        variant = result.scalar_one_or_none()
        if not variant:
            continue

        before = variant.stock_quantity
        variant.stock_quantity += item.quantity
        if variant.product:
            variant.product.total_stock += item.quantity

        log = InventoryLog(
            variant_id=variant.id,
            change_type="restock",
            quantity_change=item.quantity,
            quantity_before=before,
            quantity_after=variant.stock_quantity,
            note=item.note,
            changed_by=admin.id,
        )
        db.add(log)
        updated.append({"sku": variant.sku, "new_quantity": variant.stock_quantity})

    return {"updated": updated}


@router.get("/low-stock")
async def get_low_stock(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Product)
        .where(Product.total_stock <= Product.low_stock_threshold, Product.status == "active")
        .order_by(Product.total_stock.asc())
    )
    products = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "total_stock": p.total_stock,
            "low_stock_threshold": p.low_stock_threshold,
        }
        for p in products
    ]
