from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from app.database import get_db
from app.models.product import Category, Subcategory
from app.models.user import User
from app.schemas.product import CategoryBase, CategoryOut
from app.api.deps import get_admin_user
from pydantic import BaseModel

router = APIRouter()


class CategoryCreate(CategoryBase):
    pass


class SubcategoryCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    display_order: int = 0


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin_user)):
    result = await db.execute(
        select(Category)
        .options(selectinload(Category.subcategories))
        .order_by(Category.display_order)
    )
    return result.scalars().all()


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    category = Category(**data.model_dump())
    db.add(category)
    await db.flush()
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: uuid.UUID,
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Category).options(selectinload(Category.subcategories)).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    return category


@router.post("/{category_id}/subcategories", status_code=201)
async def create_subcategory(
    category_id: uuid.UUID,
    data: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")

    sub = Subcategory(category_id=category_id, **data.model_dump())
    db.add(sub)
    await db.flush()
    return sub


@router.patch("/subcategories/{subcategory_id}")
async def update_subcategory(
    subcategory_id: uuid.UUID,
    data: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Subcategory).where(Subcategory.id == subcategory_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    return sub
