from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete as sql_delete, text
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid

from app.database import get_db
from app.models.order import Order, OrderStatusHistory, OrderItem
from app.models.notification import Notification
from app.models.product import Product, ProductVariant
from app.models.coupon import Coupon
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.order import UpdateOrderStatus
from app.api.deps import get_admin_user, get_super_admin
from app.services.email_service import send_shipping_notification, send_admin_dispatch_notification
from app.services.sms_service import send_shipping_sms
from app.services.notification_service import create_notification, create_admin_notification
from datetime import datetime, timezone
import asyncio

router = APIRouter()

VALID_STATUSES = [
    "pending_payment", "confirmed", "processing", "shipped",
    "out_for_delivery", "delivered", "cancelled", "refunded", "returned"
]

# Allowed forward transitions — terminal states have empty sets
VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending_payment": ["confirmed", "cancelled"],
    "confirmed":       ["processing", "cancelled"],
    "processing":      ["shipped", "cancelled"],
    "shipped":         ["out_for_delivery", "cancelled"],
    "out_for_delivery": ["delivered", "cancelled"],
    "delivered":       [],          # terminal
    "cancelled":       [],          # terminal
    "refunded":        [],          # terminal
    "returned":        [],          # terminal
}


@router.get("")
async def list_orders(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = (
        select(Order)
        .options(selectinload(Order.user), selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    if status:
        query = query.where(Order.status == status)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)
    if q:
        query = query.join(User, Order.user_id == User.id, isouter=True).where(
            or_(
                Order.order_number.ilike(f"%{q}%"),
                Order.shipping_full_name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    orders = result.scalars().all()

    items = [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "payment_status": o.payment_status,
            "total": float(o.total),
            "item_count": len(o.items),
            "shipping_full_name": o.shipping_full_name,
            "shipping_city": o.shipping_city,
            "payment_method": o.payment_method,
            "created_at": o.created_at.isoformat(),
            "user": {
                "first_name": o.user.first_name,
                "last_name": o.user.last_name,
                "email": o.user.email,
            } if o.user else None,
        }
        for o in orders
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/{order_id}")
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.user),
            selectinload(Order.payments),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = order.payments[0] if order.payments else None
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "subtotal": float(order.subtotal),
        "discount_amount": float(order.discount_amount),
        "coupon_code": order.coupon_code,
        "shipping_cost": float(order.shipping_cost),
        "tax_amount": float(order.tax_amount),
        "total": float(order.total),
        "shipping_full_name": order.shipping_full_name,
        "shipping_phone": order.shipping_phone,
        "shipping_address_line_1": order.shipping_address_1,
        "shipping_address_line_2": order.shipping_address_2,
        "shipping_city": order.shipping_city,
        "shipping_county": order.shipping_county,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "tracking_number": order.tracking_number,
        "customer_notes": order.customer_notes,
        "created_at": order.created_at.isoformat(),
        "user": {
            "first_name": order.user.first_name,
            "last_name": order.user.last_name,
            "email": order.user.email,
            "phone": order.user.phone,
        } if order.user else None,
        "payment": {
            "status": payment.status,
            "gateway": payment.gateway,
            "amount": float(payment.amount),
        } if payment else None,
        "items": [
            {
                "id": str(item.id),
                "product_name": item.product_name,
                "sku": item.variant_sku,
                "size": item.size,
                "color_name": item.color_name,
                "image_url": item.product_image,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
            }
            for item in order.items
        ],
        "status_history": [
            {
                "id": str(h.id),
                "old_status": h.old_status,
                "new_status": h.new_status,
                "note": h.note,
                "created_at": h.created_at.isoformat(),
            }
            for h in order.status_history
        ],
    }


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    data: UpdateOrderStatus,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    allowed = VALID_TRANSITIONS.get(old_status, VALID_STATUSES)
    if data.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition order from '{old_status}' to '{data.status}'. "
                   f"Allowed transitions: {allowed or ['none — this is a terminal state']}",
        )

    order.status = data.status
    if data.tracking_number:
        order.tracking_number = data.tracking_number
    if data.carrier:
        order.carrier = data.carrier

    db.add(OrderStatusHistory(
        order_id=order.id,
        old_status=old_status,
        new_status=data.status,
        changed_by=admin.id,
        note=data.note,
    ))

    from app.config import settings

    # Load order user once (needed for notifications/emails)
    order_user = None
    if order.user_id:
        user_result = await db.execute(select(User).where(User.id == order.user_id))
        order_user = user_result.scalar_one_or_none()

    # Fire shipping notifications when status changes to "shipped"
    if data.status == "shipped" and old_status != "shipped":
        if order_user:
            order_url = f"{settings.frontend_url}/account/orders/{order.order_number}"
            order_admin_url = f"{settings.frontend_url}/admin/orders/{order.id}"
            if data.tracking_number:
                asyncio.create_task(
                    send_shipping_notification(
                        order_user.email,
                        order_user.first_name,
                        order.order_number,
                        data.tracking_number,
                        order_url,
                    )
                )
                if order_user.phone:
                    asyncio.create_task(
                        send_shipping_sms(order_user.phone, order.order_number, data.tracking_number)
                    )
                asyncio.create_task(
                    send_admin_dispatch_notification(
                        order_number=order.order_number,
                        customer_name=f"{order_user.first_name} {order_user.last_name}",
                        tracking_number=data.tracking_number,
                        order_admin_url=order_admin_url,
                    )
                )
            # In-platform notifications
            await create_notification(
                db, order_user.id, "order_dispatched",
                f"Your order {order.order_number} is on its way! 📦",
                f"Your order has been dispatched. Tracking: {data.tracking_number or 'N/A'}",
                {"order_number": order.order_number, "tracking_number": data.tracking_number},
            )
            await create_admin_notification(
                db, "order_dispatched",
                f"Order Dispatched — {order.order_number}",
                f"Order {order.order_number} for {order_user.first_name} {order_user.last_name} has been dispatched.",
                {"order_number": order.order_number, "order_id": str(order.id)},
            )

    # Set delivered_at timestamp when marked as delivered
    elif data.status == "delivered" and old_status != "delivered":
        order.delivered_at = datetime.now(timezone.utc)
        if order_user:
            await create_notification(
                db, order_user.id, "order_delivered",
                f"Order {order.order_number} delivered! ✅",
                "Your order has been delivered. We'd love to hear your feedback!",
                {"order_number": order.order_number},
            )

    # Notify customer of confirmed or processing status changes
    elif data.status in ("confirmed", "processing", "out_for_delivery") and old_status != data.status:
        if order_user:
            status_messages = {
                "confirmed": ("Order Confirmed ✅", "Your order has been confirmed and is being prepared."),
                "processing": ("Order Being Prepared 🏭", "Your order is currently being packed and prepared for dispatch."),
                "out_for_delivery": ("Out for Delivery 🛵", "Your order is out for delivery and will arrive shortly!"),
            }
            title, msg = status_messages[data.status]
            await create_notification(
                db, order_user.id, f"order_{data.status}",
                title, msg,
                {"order_number": order.order_number},
            )

    db.add(AuditLog(
        admin_id=admin.id,
        action="update_order_status",
        entity_type="order",
        entity_id=str(order_id),
        old_value={"status": old_status},
        new_value={"status": data.status, "tracking_number": data.tracking_number, "carrier": data.carrier},
        description=f"Order {order.order_number}: {old_status} → {data.status}",
    ))

    return {"message": f"Order status updated to {data.status}", "order_number": order.order_number}


@router.delete("/{order_id}")
async def delete_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_super_admin),
):
    """Permanently delete an order. Super admin only.

    Restores product stock if the order had already been confirmed (stock
    was deducted at confirmation time). Does not restore stock if the order
    was never confirmed (pending_payment) or was already returned (stock
    already restored by the returns flow).
    """
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.return_requests),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order_number = order.order_number

    # Determine whether stock was deducted for this order.
    # Stock is decremented when an order reaches "confirmed" status.
    # Stock is already restored when an order reaches "returned" status.
    stock_was_deducted = order.status not in ("pending_payment",) and (
        order.status in ("confirmed", "processing", "shipped", "out_for_delivery", "delivered", "refunded")
        or any(h.new_status == "confirmed" for h in order.status_history)
    )
    stock_already_restored = order.status == "returned"

    if stock_was_deducted and not stock_already_restored:
        # Cache fetched objects to avoid redundant queries for same product/variant
        variant_cache: dict = {}
        product_cache: dict = {}

        for item in order.items:
            if item.variant_id and item.variant_id not in variant_cache:
                vr = await db.execute(
                    select(ProductVariant).where(ProductVariant.id == item.variant_id)
                )
                variant_cache[item.variant_id] = vr.scalar_one_or_none()

            if item.product_id and item.product_id not in product_cache:
                pr = await db.execute(
                    select(Product).where(Product.id == item.product_id)
                )
                product_cache[item.product_id] = pr.scalar_one_or_none()

            variant = variant_cache.get(item.variant_id)
            product = product_cache.get(item.product_id)

            if variant:
                variant.stock_quantity += item.quantity
            if product:
                product.total_stock += item.quantity
                product.purchase_count = max(0, product.purchase_count - item.quantity)

    # Decrement coupon times_used if this order applied a coupon
    if order.coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(Coupon.code == order.coupon_code)
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon and coupon.times_used > 0:
            coupon.times_used -= 1

    db.add(AuditLog(
        admin_id=admin.id,
        action="delete_order",
        entity_type="order",
        entity_id=str(order_id),
        old_value={"order_number": order_number, "status": order.status, "total": float(order.total)},
        description=f"Deleted order {order_number} (stock_restored={stock_was_deducted and not stock_already_restored})",
    ))

    # Delete orphaned notifications referencing this order (no FK cascade covers these)
    await db.execute(
        text("DELETE FROM notifications WHERE data->>'order_id' = :order_id"),
        {"order_id": str(order_id)},
    )
    await db.execute(
        text("DELETE FROM notifications WHERE data->>'order_number' = :order_number"),
        {"order_number": order_number},
    )

    await db.delete(order)
    return {"message": f"Order {order_number} deleted successfully"}
