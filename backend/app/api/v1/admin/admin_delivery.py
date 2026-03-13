from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import date, datetime, timezone
import uuid

from app.database import get_db
from app.models.order import Order, OrderStatusHistory
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()


class DispatchRequest(BaseModel):
    tracking_number: str
    carrier: str
    estimated_delivery: date | None = None
    note: str | None = None


@router.get("/overview")
async def get_delivery_overview(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    statuses = ["processing", "shipped", "out_for_delivery", "delivered"]
    counts = {}
    for s in statuses:
        result = await db.execute(select(func.count(Order.id)).where(Order.status == s))
        counts[s] = result.scalar_one() or 0

    return {
        "pending_dispatch": counts["processing"],
        "in_transit": counts["shipped"] + counts["out_for_delivery"],
        "delivered_today": 0,  # Would need date filter
        "total_shipped": counts["shipped"],
        "total_out_for_delivery": counts["out_for_delivery"],
        "total_delivered": counts["delivered"],
    }


@router.get("/orders")
async def get_orders_to_dispatch(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    status: str = Query("processing"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    result = await db.execute(
        select(Order)
        .where(Order.status == status)
        .order_by(Order.created_at.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    orders = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "customer_name": o.shipping_full_name,
            "customer_phone": o.shipping_phone,
            "address": f"{o.shipping_address_1}, {o.shipping_city}, {o.shipping_county}",
            "shipping_method": o.shipping_method,
            "total": float(o.total),
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]


@router.patch("/orders/{order_id}/dispatch")
async def dispatch_order(
    order_id: uuid.UUID,
    data: DispatchRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("confirmed", "processing"):
        raise HTTPException(status_code=400, detail=f"Cannot dispatch order with status: {order.status}")

    old_status = order.status
    order.status = "shipped"
    order.tracking_number = data.tracking_number
    order.carrier = data.carrier
    if data.estimated_delivery:
        order.estimated_delivery = data.estimated_delivery

    db.add(OrderStatusHistory(
        order_id=order.id,
        old_status=old_status,
        new_status="shipped",
        changed_by=admin.id,
        note=data.note or f"Dispatched via {data.carrier}. Tracking: {data.tracking_number}",
    ))

    return {
        "message": "Order dispatched successfully",
        "order_number": order.order_number,
        "tracking_number": order.tracking_number,
    }


@router.patch("/orders/{order_id}/delivered")
async def mark_delivered(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = "delivered"
    order.delivered_at = datetime.now(timezone.utc)

    db.add(OrderStatusHistory(
        order_id=order.id,
        old_status=old_status,
        new_status="delivered",
        changed_by=admin.id,
        note="Marked as delivered by admin",
    ))

    return {"message": "Order marked as delivered", "order_number": order.order_number}
