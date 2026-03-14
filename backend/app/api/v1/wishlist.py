from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.wishlist import Wishlist, WishlistItem
from app.models.product import Product
from app.models.user import User
from app.api.deps import get_current_active_user
from app.schemas.product import ProductListItem

router = APIRouter()


class WishlistAddRequest(BaseModel):
    product_id: uuid.UUID


@router.get("", response_model=list[ProductListItem])
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Wishlist)
        .options(selectinload(Wishlist.items).selectinload(WishlistItem.product).selectinload(Product.images))
        .where(Wishlist.user_id == current_user.id)
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        return []
    return [item.product for item in wishlist.items]


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    data: WishlistAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    product_result = await db.execute(select(Product).where(Product.id == data.product_id))
    if not product_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    result = await db.execute(select(Wishlist).where(Wishlist.user_id == current_user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
        await db.flush()

    existing = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id, WishlistItem.product_id == data.product_id)
    )
    if existing.scalar_one_or_none():
        return {"message": "Already in wishlist"}

    db.add(WishlistItem(wishlist_id=wishlist.id, product_id=data.product_id))
    return {"message": "Added to wishlist"}


@router.delete("/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Wishlist).where(Wishlist.user_id == current_user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    result = await db.execute(
        select(WishlistItem).where(WishlistItem.wishlist_id == wishlist.id, WishlistItem.product_id == product_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    await db.delete(item)
