from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import get_db
from app.models.return_request import ReturnRequest
from app.models.order import Order, OrderStatusHistory
from app.models.product import ProductVariant
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()


class ApproveReturn(BaseModel):
    resolution_type: str  # refund | exchange | store_credit
    refund_amount: Optional[Decimal] = None
    admin_note: Optional[str] = None


class RejectReturn(BaseModel):
    admin_note: str


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
        .options(selectinload(ReturnRequest.user), selectinload(ReturnRequest.order))
        .where(ReturnRequest.id == return_id)
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")

    return {
        "id": str(ret.id),
        "order_id": str(ret.order_id),
        "order_number": ret.order.order_number if ret.order else None,
        "customer_name": ret.user.full_name if ret.user else None,
        "customer_email": ret.user.email if ret.user else None,
        "reason": ret.reason,
        "customer_note": ret.customer_note,
        "photo_urls": ret.photo_urls,
        "items": ret.items,
        "status": ret.status,
        "resolution_type": ret.resolution_type,
        "refund_amount": float(ret.refund_amount) if ret.refund_amount else None,
        "admin_note": ret.admin_note,
        "created_at": ret.created_at.isoformat(),
        "resolved_at": ret.resolved_at.isoformat() if ret.resolved_at else None,
    }


@router.patch("/{return_id}/approve")
async def approve_return(
    return_id: uuid.UUID,
    data: ApproveReturn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
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

    return {"message": "Return approved", "resolution_type": data.resolution_type}


@router.patch("/{return_id}/reject")
async def reject_return(
    return_id: uuid.UUID,
    data: RejectReturn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")
    if ret.status not in ("requested", "approved"):
        raise HTTPException(status_code=400, detail=f"Cannot reject a return with status: {ret.status}")

    ret.status = "rejected"
    ret.admin_note = data.admin_note
    ret.resolved_at = datetime.now(timezone.utc)
    ret.updated_at = datetime.now(timezone.utc)

    # Update order status
    order_result = await db.execute(select(Order).where(Order.id == ret.order_id))
    order = order_result.scalar_one_or_none()
    if order:
        db.add(OrderStatusHistory(
            order_id=order.id,
            old_status=order.status,
            new_status=order.status,
            changed_by=admin.id,
            note=f"Return request rejected: {data.admin_note}",
        ))

    return {"message": "Return rejected"}


@router.patch("/{return_id}/complete")
async def complete_return(
    return_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Mark return as completed — restock inventory and update order status."""
    result = await db.execute(select(ReturnRequest).where(ReturnRequest.id == return_id))
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Return request not found")
    if ret.status != "approved":
        raise HTTPException(status_code=400, detail="Return must be approved before completing")

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
    order_result = await db.execute(select(Order).where(Order.id == ret.order_id))
    order = order_result.scalar_one_or_none()
    if order:
        new_status = "refunded" if ret.resolution_type == "refund" else "returned"
        old_status = order.status
        order.status = new_status
        db.add(OrderStatusHistory(
            order_id=order.id,
            old_status=old_status,
            new_status=new_status,
            changed_by=admin.id,
            note=f"Return completed. Resolution: {ret.resolution_type}",
        ))

    return {"message": "Return completed and inventory restocked"}
