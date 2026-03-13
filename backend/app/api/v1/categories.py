from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.product import Category, Subcategory
from app.schemas.product import CategoryOut

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category)
        .where(Category.is_active == True)
        .options(selectinload(Category.subcategories))
        .order_by(Category.display_order)
    )
    return result.scalars().all()


@router.get("/{slug}", response_model=CategoryOut)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category)
        .where(Category.slug == slug, Category.is_active == True)
        .options(selectinload(Category.subcategories))
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category
