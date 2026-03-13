from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
import uuid

from app.database import get_db
from app.models.order import Order, OrderStatusHistory
from app.models.user import User
from app.schemas.order import OrderOut, UpdateOrderStatus
from app.api.deps import get_admin_user
from app.services.email_service import send_shipping_notification
from app.services.sms_service import send_shipping_sms
from app.utils.formatters import format_ksh
import asyncio

router = APIRouter()

VALID_STATUSES = [
    "pending_payment", "confirmed", "processing", "shipped",
    "out_for_delivery", "delivered", "cancelled", "refunded", "returned"
]


@router.get("")
async def list_orders(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    status: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = select(Order).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)
    if search:
        query = query.where(Order.order_number.ilike(f"%{search}%"))

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    orders = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "payment_status": o.payment_status,
            "total": float(o.total),
            "shipping_full_name": o.shipping_full_name,
            "shipping_city": o.shipping_city,
            "payment_method": o.payment_method,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]


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

    # Fire shipping notifications when status changes to "shipped"
    if data.status == "shipped" and old_status != "shipped":
        from sqlalchemy import select as sql_select
        user_result = await db.execute(
            sql_select(User).where(User.id == order.user_id)
        )
        order_user = user_result.scalar_one_or_none()
        if order_user and data.tracking_number:
            order_url = f"{__import__('app.config', fromlist=['settings']).settings.frontend_url}/account/orders/{order.id}"
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

    return {"message": f"Order status updated to {data.status}", "order_number": order.order_number}
