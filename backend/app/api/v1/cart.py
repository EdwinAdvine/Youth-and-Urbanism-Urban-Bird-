from fastapi import APIRouter, Depends, HTTPException, Cookie, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from decimal import Decimal
from typing import Optional
import uuid

from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductVariant, ProductImage
from app.models.coupon import Coupon
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut, CartItemOut, CouponApply
from app.api.deps import get_optional_user
from app.models.user import User
from app.config import settings
from datetime import datetime, timezone

router = APIRouter()


def _cart_eager_options():
    return [
        selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images),
        selectinload(Cart.items).selectinload(CartItem.variant),
    ]


async def get_or_create_cart(
    db: AsyncSession,
    user: Optional[User],
    session_id: Optional[str],
    response: Response,
) -> tuple[Cart, str]:
    """Get or create cart for user or guest. Returns (cart, session_id)."""

    if user:
        result = await db.execute(
            select(Cart).options(*_cart_eager_options()).where(Cart.user_id == user.id)
        )
        cart = result.scalar_one_or_none()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            await db.flush()
            result = await db.execute(
                select(Cart).options(*_cart_eager_options()).where(Cart.id == cart.id)
            )
            cart = result.scalar_one()
        return cart, session_id or ""
    else:
        if not session_id:
            session_id = str(uuid.uuid4()).replace("-", "")
            response.set_cookie(
                "cart_session",
                session_id,
                max_age=7 * 86400,
                httponly=True,
                samesite="lax",
                secure=settings.environment == "production",
            )

        result = await db.execute(
            select(Cart).options(*_cart_eager_options()).where(Cart.session_id == session_id)
        )
        cart = result.scalar_one_or_none()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            await db.flush()
            result = await db.execute(
                select(Cart).options(*_cart_eager_options()).where(Cart.id == cart.id)
            )
            cart = result.scalar_one()
        return cart, session_id


def _build_cart_out(cart: Cart) -> CartOut:
    items_out = []
    subtotal = Decimal("0.00")
    for item in cart.items:
        total = item.unit_price * item.quantity
        subtotal += total
        items_out.append(CartItemOut(
            id=item.id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            product_name=item.product.name if item.product else "",
            product_slug=item.product.slug if item.product else "",
            variant_sku=item.variant.sku if item.variant else "",
            size=item.variant.size if item.variant else "",
            color_name=item.variant.color_name if item.variant else "",
            image_url=item.product.primary_image.url if item.product and item.product.primary_image else None,
            total_price=total,
        ))

    return CartOut(
        id=cart.id,
        items=items_out,
        subtotal=subtotal,
        item_count=sum(i.quantity for i in cart.items),
    )


@router.get("", response_model=CartOut)
async def get_cart(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    cart, _ = await get_or_create_cart(db, current_user, cart_session, response)
    return _build_cart_out(cart)


@router.post("/items", response_model=CartOut, status_code=201)
async def add_to_cart(
    data: CartItemAdd,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    cart, _ = await get_or_create_cart(db, current_user, cart_session, response)

    # Validate variant
    result = await db.execute(
        select(ProductVariant).options(selectinload(ProductVariant.product))
        .where(ProductVariant.id == data.variant_id, ProductVariant.is_active == True)
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Product variant not found")
    if variant.stock_quantity < data.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock available")

    # Check if item already in cart
    result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id, CartItem.variant_id == data.variant_id)
    )
    existing = result.scalar_one_or_none()
    unit_price = variant.product.price + variant.price_adjustment

    if existing:
        new_qty = existing.quantity + data.quantity
        if new_qty > variant.stock_quantity:
            raise HTTPException(status_code=400, detail="Not enough stock available")
        existing.quantity = new_qty
        existing.unit_price = unit_price
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=variant.product_id,
            variant_id=variant.id,
            quantity=data.quantity,
            unit_price=unit_price,
        )
        db.add(item)

    await db.flush()

    # Reload cart fresh
    result = await db.execute(
        select(Cart).options(*_cart_eager_options()).where(Cart.id == cart.id)
        .execution_options(populate_existing=True)
    )
    cart = result.scalar_one()
    return _build_cart_out(cart)


@router.patch("/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: uuid.UUID,
    data: CartItemUpdate,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    cart, _ = await get_or_create_cart(db, current_user, cart_session, response)
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if data.quantity <= 0:
        await db.delete(item)
    else:
        variant_result = await db.execute(select(ProductVariant).where(ProductVariant.id == item.variant_id))
        variant = variant_result.scalar_one_or_none()
        if variant and data.quantity > variant.stock_quantity:
            raise HTTPException(status_code=400, detail="Not enough stock available")
        item.quantity = data.quantity

    await db.flush()
    result = await db.execute(
        select(Cart).options(*_cart_eager_options()).where(Cart.id == cart.id)
        .execution_options(populate_existing=True)
    )
    cart = result.scalar_one()
    return _build_cart_out(cart)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_cart_item(
    item_id: uuid.UUID,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    cart, _ = await get_or_create_cart(db, current_user, cart_session, response)
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    await db.delete(item)
    await db.flush()

    result = await db.execute(
        select(Cart).options(*_cart_eager_options()).where(Cart.id == cart.id)
        .execution_options(populate_existing=True)
    )
    cart = result.scalar_one()
    return _build_cart_out(cart)


@router.delete("", status_code=204)
async def clear_cart(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    cart, _ = await get_or_create_cart(db, current_user, cart_session, response)
    for item in list(cart.items):
        await db.delete(item)


@router.post("/merge")
async def merge_cart(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    """Merge guest cart into user cart on login."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not cart_session:
        return {"message": "No guest cart to merge"}

    # Find guest cart
    guest_result = await db.execute(
        select(Cart).options(selectinload(Cart.items))
        .where(Cart.session_id == cart_session)
    )
    guest_cart = guest_result.scalar_one_or_none()
    if not guest_cart or not guest_cart.items:
        return {"message": "Guest cart is empty"}

    # Get or create user cart
    user_cart_result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    user_cart = user_cart_result.scalar_one_or_none()
    if not user_cart:
        user_cart = Cart(user_id=current_user.id)
        db.add(user_cart)
        await db.flush()

    for guest_item in guest_cart.items:
        result = await db.execute(
            select(CartItem).where(CartItem.cart_id == user_cart.id, CartItem.variant_id == guest_item.variant_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.quantity = max(existing.quantity, guest_item.quantity)
        else:
            new_item = CartItem(
                cart_id=user_cart.id,
                product_id=guest_item.product_id,
                variant_id=guest_item.variant_id,
                quantity=guest_item.quantity,
                unit_price=guest_item.unit_price,
            )
            db.add(new_item)

    await db.delete(guest_cart)
    response.delete_cookie("cart_session")
    return {"message": "Cart merged successfully"}
