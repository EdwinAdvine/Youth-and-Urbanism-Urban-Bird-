from fastapi import APIRouter, Depends, HTTPException, Query, Request, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.limiter import limiter

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.cart import Cart, CartItem
from app.models.user import User
from app.models.coupon import Coupon, CouponUsage
from app.models.product import Product, ProductVariant
from app.models.payment import Payment
from app.models.shipping import ShippingRate
from app.schemas.order import CheckoutRequest, OrderOut, OrderListItem
from app.api.deps import get_current_active_user, get_optional_user
from app.services.email_service import (
    send_order_confirmation, send_admin_new_order,
    send_return_submitted, send_admin_new_return,
)
from app.services.sms_service import send_order_confirmation_sms
from app.services.notification_service import create_notification, create_admin_notification
from app.utils.formatters import format_ksh
from app.models.return_request import ReturnRequest
from pydantic import BaseModel as _BaseModel
import asyncio

router = APIRouter()

VALID_STATUSES = [
    "pending_payment", "confirmed", "processing", "shipped",
    "out_for_delivery", "delivered", "cancelled", "refunded", "returned"
]


def _generate_order_number() -> str:
    import secrets
    from datetime import date
    today = date.today().strftime("%Y%m%d")
    suffix = str(secrets.randbelow(90000) + 10000)
    return f"UB-{today}-{suffix}"


@router.post("/checkout", response_model=OrderOut, status_code=201)
async def checkout(
    data: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    cart_session: Optional[str] = Cookie(default=None),
):
    # Validate guest checkout requirements
    if not current_user:
        if not data.guest_email:
            raise HTTPException(status_code=400, detail="guest_email is required for guest checkout")

    # Get cart — by user_id for authenticated users, by session_id for guests
    if current_user:
        cart_query = select(Cart).options(
            selectinload(Cart.items).selectinload(CartItem.product),
            selectinload(Cart.items).selectinload(CartItem.variant),
        ).where(Cart.user_id == current_user.id)
    else:
        if not cart_session:
            raise HTTPException(status_code=400, detail="No cart session found")
        cart_query = select(Cart).options(
            selectinload(Cart.items).selectinload(CartItem.product),
            selectinload(Cart.items).selectinload(CartItem.variant),
        ).where(Cart.session_id == cart_session)

    cart_result = await db.execute(cart_query)
    cart = cart_result.scalar_one_or_none()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate subtotal
    subtotal = sum(item.unit_price * item.quantity for item in cart.items)
    # Determine shipping cost — use selected rate from DB, fall back to flat KES 300
    shipping_cost = Decimal("300.00")
    if data.shipping_rate_id:
        try:
            rate_result = await db.execute(
                select(ShippingRate).where(
                    ShippingRate.id == data.shipping_rate_id,
                    ShippingRate.is_active == True,
                )
            )
            rate = rate_result.scalar_one_or_none()
            if rate:
                # Apply free-shipping threshold if configured
                if rate.free_above and subtotal >= rate.free_above:
                    shipping_cost = Decimal("0.00")
                else:
                    shipping_cost = rate.price
        except Exception:
            pass  # Fall back to flat rate if rate lookup fails
    discount_amount = Decimal("0.00")
    coupon_code = None

    # Apply coupon if provided
    if data.coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(
                Coupon.code == data.coupon_code.upper(),
                Coupon.is_active == True,
                Coupon.expires_at > datetime.now(timezone.utc),
            )
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon:
            if coupon.discount_type == "percentage":
                discount_amount = subtotal * (coupon.discount_value / 100)
                if coupon.max_discount_amount:
                    discount_amount = min(discount_amount, coupon.max_discount_amount)
            else:
                discount_amount = coupon.discount_value
            coupon_code = coupon.code
            coupon.times_used += 1

    total = subtotal + shipping_cost - discount_amount

    # Generate guest token for guest orders (used to securely retrieve order later)
    guest_token = str(uuid.uuid4()) if not current_user else None

    # Create order
    order = Order(
        user_id=current_user.id if current_user else None,
        guest_email=None if current_user else data.guest_email,
        guest_token=guest_token,
        order_number=_generate_order_number(),
        status="pending_payment",
        subtotal=subtotal,
        discount_amount=discount_amount,
        coupon_code=coupon_code,
        shipping_cost=shipping_cost,
        tax_amount=Decimal("0.00"),
        total=total,
        shipping_full_name=data.shipping_full_name,
        shipping_phone=data.shipping_phone,
        shipping_address_1=data.shipping_address_line_1,
        shipping_address_2=data.shipping_address_line_2,
        shipping_city=data.shipping_city,
        shipping_county=data.shipping_county,
        shipping_postal_code=None,
        shipping_method="standard",
        payment_method=data.payment_method,
        payment_status="pending",
        customer_notes=data.customer_notes,
    )
    db.add(order)
    await db.flush()

    # Create order items + decrement stock
    for item in cart.items:
        product = item.product
        variant = item.variant
        primary_image = None
        if product and product.images:
            for img in product.images:
                if img.is_primary:
                    primary_image = img.url
                    break
            if not primary_image:
                primary_image = product.images[0].url

        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            product_name=product.name if product else "Unknown",
            variant_sku=variant.sku if variant else "",
            size=variant.size if variant else "",
            color_name=variant.color_name if variant else "",
            product_image=primary_image,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.unit_price * item.quantity,
        )
        db.add(order_item)

        # Reserve or decrement stock depending on payment method
        if variant:
            if data.payment_method == "cod":
                # COD is confirmed immediately — deduct stock now
                variant.stock_quantity = max(0, variant.stock_quantity - item.quantity)
                if product:
                    product.total_stock = max(0, product.total_stock - item.quantity)
                    product.purchase_count += item.quantity
            else:
                # Online payment — reserve stock; deduct only after payment is confirmed
                variant.reserved_quantity += item.quantity

    # COD orders are confirmed immediately — payment happens on delivery
    if data.payment_method == "cod":
        order.status = "confirmed"

    # Add status history
    db.add(OrderStatusHistory(
        order_id=order.id,
        old_status=None,
        new_status=order.status,
        note="Order created" if data.payment_method != "cod" else "Order created (Cash on Delivery)",
    ))

    # Create payment record
    payment = Payment(
        order_id=order.id,
        user_id=current_user.id if current_user else None,
        gateway=data.payment_method,
        amount=total,
        status="cod_pending" if data.payment_method == "cod" else "pending",
    )
    db.add(payment)

    # Clear cart
    for item in list(cart.items):
        await db.delete(item)

    await db.flush()

    # Reload full order
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.id == order.id)
    )
    full_order = result.scalar_one()

    # Send order confirmation notifications (non-blocking)
    order_url = f"{__import__('app.config', fromlist=['settings']).settings.frontend_url}/order-confirmation/{full_order.order_number}"
    total_str = format_ksh(full_order.total)
    email_to = current_user.email if current_user else data.guest_email
    first_name = current_user.first_name if current_user else data.shipping_full_name.split()[0]
    if email_to:
        asyncio.create_task(
            send_order_confirmation(
                email_to,
                first_name,
                full_order.order_number,
                total_str,
                order_url,
            )
        )
    if current_user and current_user.phone:
        asyncio.create_task(
            send_order_confirmation_sms(current_user.phone, full_order.order_number, total_str)
        )

    # Notify admin of new order (email + in-platform)
    admin_order_url = f"{__import__('app.config', fromlist=['settings']).settings.frontend_url}/admin/orders/{full_order.id}"
    customer_name = current_user.first_name + " " + current_user.last_name if current_user else data.shipping_full_name
    customer_email_for_admin = current_user.email if current_user else (data.guest_email or "")
    asyncio.create_task(
        send_admin_new_order(
            order_number=full_order.order_number,
            customer_name=customer_name,
            customer_email=customer_email_for_admin,
            order_total=total_str,
            item_count=len(full_order.items),
            order_admin_url=admin_order_url,
        )
    )

    # Create in-platform notifications
    await create_admin_notification(
        db,
        "new_order",
        f"New Order — {full_order.order_number}",
        f"{customer_name} placed an order for {total_str}.",
        {"order_id": str(full_order.id), "order_number": full_order.order_number},
    )
    if current_user:
        await create_notification(
            db,
            current_user.id,
            "order_placed",
            f"Order Placed — {full_order.order_number}",
            f"Your order of {total_str} has been received and is being processed.",
            {"order_number": full_order.order_number, "order_url": order_url},
        )

    return full_order


@router.get("/track", response_model=None)
@limiter.limit("10/minute")
async def track_order_public(
    request: Request,
    order_number: str = Query(...),
    email: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Public order tracking — looks up by order number + email (no auth required)."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.order_number == order_number)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify by email — either guest_email or the registered user's email
    email_lower = email.lower().strip()
    matched = False
    if order.guest_email and order.guest_email.lower() == email_lower:
        matched = True
    if not matched and order.user_id:
        user_result = await db.execute(select(User).where(User.id == order.user_id))
        user = user_result.scalar_one_or_none()
        if user and user.email.lower() == email_lower:
            matched = True
    if not matched:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "order_number": order.order_number,
        "status": order.status,
        "created_at": order.created_at.isoformat(),
        "total": float(order.total),
        "shipping_full_name": order.shipping_full_name,
        "shipping_city": order.shipping_city,
        "shipping_county": order.shipping_county,
        "tracking_number": order.tracking_number,
        "items": [
            {
                "product_name": item.product_name,
                "size": item.size,
                "color_name": item.color_name,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "product_image": item.product_image,
            }
            for item in order.items
        ],
    }


@router.get("", response_model=list[OrderListItem])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    orders = result.scalars().all()
    out = []
    for o in orders:
        out.append(OrderListItem(
            id=o.id,
            order_number=o.order_number,
            status=o.status,
            total=o.total,
            payment_status=o.payment_status,
            item_count=len(o.items),
            created_at=o.created_at,
        ))
    return out


@router.get("/{order_number}", response_model=OrderOut)
@limiter.limit("20/minute")
async def get_order(
    request: Request,
    order_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
    guest_email: Optional[str] = Query(default=None),
    guest_token: Optional[str] = Query(default=None),
):
    query = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.order_number == order_number)
    )
    if current_user:
        query = query.where(Order.user_id == current_user.id)
    else:
        # Guests must provide both email AND the guest_token issued at checkout
        if not guest_email or not guest_token:
            raise HTTPException(status_code=401, detail="Guest verification required")
        query = query.where(
            Order.user_id.is_(None),
            Order.guest_email == guest_email.lower().strip(),
            Order.guest_token == guest_token,
        )
    result = await db.execute(query)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_number}/cancel")
async def cancel_order(
    order_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(Order).where(Order.order_number == order_number, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in ("pending_payment", "confirmed"):
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")

    old_status = order.status
    order.status = "cancelled"
    db.add(OrderStatusHistory(
        order_id=order.id,
        old_status=old_status,
        new_status="cancelled",
        note="Cancelled by customer",
    ))
    return {"message": "Order cancelled successfully"}


# ─── Return Request Endpoints ─────────────────────────────────────────────────

class ReturnItem(_BaseModel):
    variant_id: uuid.UUID
    quantity: int = 1

    def model_post_init(self, __context: object) -> None:
        if self.quantity < 1:
            raise ValueError("quantity must be at least 1")


class ReturnRequestCreate(_BaseModel):
    items: list[ReturnItem]
    reason: str        # wrong_size | doesnt_fit | defective | not_as_described | changed_mind | other
    customer_note: str | None = None


VALID_RETURN_REASONS = ("wrong_size", "doesnt_fit", "defective", "not_as_described", "changed_mind", "other")
RETURNABLE_STATUSES = ("delivered",)


@router.post("/{order_number}/return", status_code=201)
async def request_return(
    order_number: str,
    data: ReturnRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Customer submits a return/refund request for a delivered order."""
    result = await db.execute(
        select(Order).where(Order.order_number == order_number, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in RETURNABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Returns can only be requested for delivered orders (current status: {order.status})",
        )

    if data.reason not in VALID_RETURN_REASONS:
        raise HTTPException(status_code=400, detail=f"Invalid reason. Valid: {', '.join(VALID_RETURN_REASONS)}")

    # Check no existing open return for this order
    existing = await db.execute(
        select(ReturnRequest).where(
            ReturnRequest.order_id == order.id,
            ReturnRequest.status.notin_(["rejected", "completed"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A return request already exists for this order")

    ret = ReturnRequest(
        order_id=order.id,
        user_id=current_user.id,
        items=[{"variant_id": str(i.variant_id), "quantity": i.quantity} for i in data.items],
        reason=data.reason,
        customer_note=data.customer_note,
    )
    db.add(ret)
    await db.flush()

    # Fire emails + notifications (non-blocking)
    from app.config import settings as _settings
    order_url = f"{_settings.frontend_url}/account/orders/{order_number}"
    return_admin_url = f"{_settings.frontend_url}/admin/returns"
    asyncio.create_task(send_return_submitted(
        current_user.email,
        current_user.first_name or current_user.full_name,
        order_number,
        data.reason,
        order_url,
    ))
    asyncio.create_task(send_admin_new_return(
        order_number,
        current_user.full_name,
        current_user.email,
        data.reason,
        data.customer_note,
        return_admin_url,
    ))
    await create_notification(
        db,
        current_user.id,
        "return",
        "Return Request Submitted",
        f"Your return request for order {order_number} has been received. We'll respond within 1–2 business days.",
        {"order_number": order_number},
    )
    await create_admin_notification(
        db,
        "return",
        "New Return Request",
        f"{current_user.full_name} has submitted a return request for order {order_number}.",
        {"order_number": order_number},
    )

    return {
        "id": str(ret.id),
        "status": ret.status,
        "message": "Return request submitted. We'll review and respond within 1-2 business days.",
    }


@router.get("/{order_number}/returns")
async def get_order_returns(
    order_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Customer checks the status of return requests for their order."""
    result = await db.execute(
        select(Order).where(Order.order_number == order_number, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    ret_result = await db.execute(
        select(ReturnRequest).where(ReturnRequest.order_id == order.id).order_by(ReturnRequest.created_at.desc())
    )
    returns = ret_result.scalars().all()

    return [
        {
            "id": str(r.id),
            "reason": r.reason,
            "status": r.status,
            "resolution_type": r.resolution_type,
            "refund_amount": float(r.refund_amount) if r.refund_amount else None,
            "admin_note": r.admin_note,
            "created_at": r.created_at.isoformat(),
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
        }
        for r in returns
    ]
