from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid

from app.database import get_db
from app.models.order import Order, OrderStatusHistory, OrderItem
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.order import OrderOut, UpdateOrderStatus
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


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


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
    """Permanently delete an order. Super admin only."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order_number = order.order_number

    db.add(AuditLog(
        admin_id=admin.id,
        action="delete_order",
        entity_type="order",
        entity_id=str(order_id),
        old_value={"order_number": order_number, "status": order.status, "total": float(order.total)},
        description=f"Deleted order {order_number}",
    ))

    await db.delete(order)
    return {"message": f"Order {order_number} deleted successfully"}
