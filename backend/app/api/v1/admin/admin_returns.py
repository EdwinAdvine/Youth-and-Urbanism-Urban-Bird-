from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
import uuid
import asyncio

from app.database import get_db
from app.models.return_request import ReturnRequest
from app.models.order import Order, OrderStatusHistory
from app.models.product import ProductVariant
from app.models.user import User
from app.models.audit_log import AuditLog
from app.api.deps import get_admin_user
from app.config import settings
from app.services.notification_service import create_notification, create_admin_notification
from app.services.email_service import (
    send_return_approved,
    send_return_rejected,
    send_return_completed,
)
from app.utils.formatters import format_ksh

router = APIRouter()


class ApproveReturn(BaseModel):
    resolution_type: str  # refund | exchange | store_credit
    refund_amount: Optional[Decimal] = None
    admin_note: Optional[str] = None


class RejectReturn(BaseModel):
    admin_note: str


def _order_url(order_number: str) -> str:
    return f"{settings.frontend_url}/account/orders/{order_number}"


@router.get("/stats")
async def get_return_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Summary counts by status."""
    result = await db.execute(
        select(ReturnRequest.status, func.count().label("n"))
        .group_by(ReturnRequest.status)
    )
    rows = result.all()
    counts = {r.status: r.n for r in rows}
    return {
        "total": sum(counts.values()),
        "requested": counts.get("requested", 0),
        "approved": counts.get("approved", 0),
        "item_received": counts.get("item_received", 0),
        "completed": counts.get("completed", 0),
        "rejected": counts.get("rejected", 0),
    }


@router.get("")
async def list_returns(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = (
        select(ReturnRequest)
        .options(selectinload(ReturnRequest.user), selectinload(ReturnRequest.order))
        .order_by(ReturnRequest.created_at.desc())
    )
    if status:
        query = query.where(ReturnRequest.status == status)

    total_result = await db.execute(
        select(func.count()).select_from(
            query.subquery() if status else select(ReturnRequest).subquery()
        )
    )

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    returns = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "order_id": str(r.order_id),
            "order_number": r.order.order_number if r.order else None,
            "customer_name": r.user.full_name if r.user else None,
            "customer_email": r.user.email if r.user else None,
            "reason": r.reason,
            "status": r.status,
            "resolution_type": r.resolution_type,
            "refund_amount": float(r.refund_amount) if r.refund_amount else None,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
        }
        for r in returns
    ]


@router.get("/{return_id}")
async def get_return(
    return_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ReturnRequest)
        .options(
            selectinload(ReturnRequest.user),
            selectinload(ReturnRequest.order).selectinload(Order.items),
        )
        .where(ReturnRequest.id == return_id)
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")

    # Build items with product names from the order
    order_items_by_variant = {}
    if ret.order and ret.order.items:
        for oi in ret.order.items:
            if oi.variant_id:
                order_items_by_variant[str(oi.variant_id)] = {
                    "product_name": oi.product_name,
                    "size": oi.size,
                    "color_name": oi.color_name,
                    "variant_sku": oi.variant_sku,
                    "product_image": oi.product_image,
                }

    enriched_items = []
    for item in ret.items:
        vid = str(item.get("variant_id", ""))
        info = order_items_by_variant.get(vid, {})
        enriched_items.append({**item, **info})

    return {
        "id": str(ret.id),
        "order_id": str(ret.order_id),
        "order_number": ret.order.order_number if ret.order else None,
        "customer_name": ret.user.full_name if ret.user else None,
        "customer_email": ret.user.email if ret.user else None,
        "reason": ret.reason,
        "customer_note": ret.customer_note,
        "photo_urls": ret.photo_urls,
        "items": enriched_items,
        "status": ret.status,
        "resolution_type": ret.resolution_type,
        "refund_amount": float(ret.refund_amount) if ret.refund_amount else None,
        "admin_note": ret.admin_note,
        "created_at": ret.created_at.isoformat(),
        "updated_at": ret.updated_at.isoformat(),
        "resolved_at": ret.resolved_at.isoformat() if ret.resolved_at else None,
    }


@router.patch("/{return_id}/approve")
async def approve_return(
    return_id: uuid.UUID,
    data: ApproveReturn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ReturnRequest)
        .options(selectinload(ReturnRequest.user), selectinload(ReturnRequest.order))
        .where(ReturnRequest.id == return_id)
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")
    if ret.status != "requested":
        raise HTTPException(status_code=400, detail=f"Cannot approve a return with status: {ret.status}")

    ret.status = "approved"
    ret.resolution_type = data.resolution_type
    ret.refund_amount = data.refund_amount
    ret.admin_note = data.admin_note
    ret.updated_at = datetime.now(timezone.utc)

    order_number = ret.order.order_number if ret.order else "N/A"
    customer = ret.user
    refund_str = format_ksh(float(data.refund_amount)) if data.refund_amount else None

    if customer:
        asyncio.create_task(send_return_approved(
            customer.email,
            customer.first_name or customer.full_name,
            order_number,
            data.resolution_type,
            refund_str,
            data.admin_note,
            _order_url(order_number),
        ))
        await create_notification(
            db,
            customer.id,
            "return",
            "Return Approved",
            f"Your return for order {order_number} has been approved. Please ship back the item(s) and we'll process your {data.resolution_type.replace('_', ' ')}.",
            {"order_number": order_number},
        )

    db.add(AuditLog(
        admin_id=admin.id,
        action="approve_return",
        entity_type="return",
        entity_id=str(return_id),
        new_value={"resolution_type": data.resolution_type, "refund_amount": str(data.refund_amount) if data.refund_amount else None},
        description=f"Approved return for order {order_number}. Resolution: {data.resolution_type}",
    ))
    return {"message": "Return approved", "resolution_type": data.resolution_type}


@router.patch("/{return_id}/item-received")
async def mark_item_received(
    return_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Mark that the returned item(s) have been physically received."""
    result = await db.execute(
        select(ReturnRequest)
        .options(selectinload(ReturnRequest.user), selectinload(ReturnRequest.order))
        .where(ReturnRequest.id == return_id)
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")
    if ret.status != "approved":
        raise HTTPException(status_code=400, detail="Return must be in 'approved' status to mark item received")

    ret.status = "item_received"
    ret.updated_at = datetime.now(timezone.utc)

    order_number = ret.order.order_number if ret.order else "N/A"
    customer = ret.user

    if customer:
        await create_notification(
            db,
            customer.id,
            "return",
            "Return Item Received",
            f"We've received your returned item(s) for order {order_number}. We're now processing your {(ret.resolution_type or 'resolution').replace('_', ' ')}.",
            {"order_number": order_number},
        )

    return {"message": "Item received — return is now being processed"}


@router.patch("/{return_id}/reject")
async def reject_return(
    return_id: uuid.UUID,
    data: RejectReturn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ReturnRequest)
        .options(selectinload(ReturnRequest.user), selectinload(ReturnRequest.order))
        .where(ReturnRequest.id == return_id)
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")
    if ret.status not in ("requested", "approved"):
        raise HTTPException(status_code=400, detail=f"Cannot reject a return with status: {ret.status}")

    ret.status = "rejected"
    ret.admin_note = data.admin_note
    ret.resolved_at = datetime.now(timezone.utc)
    ret.updated_at = datetime.now(timezone.utc)

    order_number = ret.order.order_number if ret.order else "N/A"
    customer = ret.user

    # Update order status history
    if ret.order:
        db.add(OrderStatusHistory(
            order_id=ret.order.id,
            old_status=ret.order.status,
            new_status=ret.order.status,
            changed_by=admin.id,
            note=f"Return request rejected: {data.admin_note}",
        ))

    if customer:
        asyncio.create_task(send_return_rejected(
            customer.email,
            customer.first_name or customer.full_name,
            order_number,
            data.admin_note,
            _order_url(order_number),
        ))
        await create_notification(
            db,
            customer.id,
            "return",
            "Return Request Not Approved",
            f"Unfortunately your return request for order {order_number} could not be approved. Reason: {data.admin_note}",
            {"order_number": order_number},
        )

    db.add(AuditLog(
        admin_id=admin.id,
        action="reject_return",
        entity_type="return",
        entity_id=str(return_id),
        new_value={"admin_note": data.admin_note},
        description=f"Rejected return for order {order_number}",
    ))
    return {"message": "Return rejected"}


@router.patch("/{return_id}/complete")
async def complete_return(
    return_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Mark return as completed — restock inventory and update order status."""
    result = await db.execute(
        select(ReturnRequest)
        .options(selectinload(ReturnRequest.user), selectinload(ReturnRequest.order))
        .where(ReturnRequest.id == return_id)
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")
    if ret.status not in ("approved", "item_received"):
        raise HTTPException(status_code=400, detail="Return must be approved or item received before completing")

    ret.status = "completed"
    ret.resolved_at = datetime.now(timezone.utc)
    ret.updated_at = datetime.now(timezone.utc)

    # Restock variants
    for item in ret.items:
        variant_id = item.get("variant_id")
        qty = item.get("quantity", 0)
        if variant_id and qty > 0:
            v_result = await db.execute(
                select(ProductVariant).where(ProductVariant.id == uuid.UUID(str(variant_id)))
            )
            variant = v_result.scalar_one_or_none()
            if variant:
                variant.stock_quantity += qty

    # Update order status
    order_number = ret.order.order_number if ret.order else "N/A"
    if ret.order:
        new_status = "refunded" if ret.resolution_type == "refund" else "returned"
        old_status = ret.order.status
        ret.order.status = new_status
        db.add(OrderStatusHistory(
            order_id=ret.order.id,
            old_status=old_status,
            new_status=new_status,
            changed_by=admin.id,
            note=f"Return completed. Resolution: {ret.resolution_type}",
        ))

    customer = ret.user
    refund_str = format_ksh(float(ret.refund_amount)) if ret.refund_amount else None

    if customer:
        asyncio.create_task(send_return_completed(
            customer.email,
            customer.first_name or customer.full_name,
            order_number,
            ret.resolution_type or "refund",
            refund_str,
            _order_url(order_number),
            settings.frontend_url,
        ))
        await create_notification(
            db,
            customer.id,
            "return",
            "Return Completed",
            f"Your return for order {order_number} has been fully processed. {('Refund of ' + refund_str + ' has been initiated.') if refund_str else 'Resolution: ' + (ret.resolution_type or '').replace('_', ' ') + '.'}",
            {"order_number": order_number},
        )

    db.add(AuditLog(
        admin_id=admin.id,
        action="complete_return",
        entity_type="return",
        entity_id=str(return_id),
        new_value={"resolution_type": ret.resolution_type, "refund_amount": str(ret.refund_amount) if ret.refund_amount else None},
        description=f"Completed return for order {order_number}. Resolution: {ret.resolution_type}",
    ))
    return {"message": "Return completed and inventory restocked"}
