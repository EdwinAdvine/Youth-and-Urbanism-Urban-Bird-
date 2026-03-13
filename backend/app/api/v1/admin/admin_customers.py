from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import uuid

from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.api.deps import get_admin_user

router = APIRouter()


@router.get("")
async def list_customers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = select(User).where(User.role == "customer", User.is_deleted == False).order_by(User.created_at.desc())
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%") | User.first_name.ilike(f"%{search}%") | User.last_name.ilike(f"%{search}%")
        )

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    users = result.scalars().all()

    out = []
    for u in users:
        order_result = await db.execute(
            select(func.count(Order.id), func.sum(Order.total))
            .where(Order.user_id == u.id, Order.payment_status == "paid")
        )
        order_count, total_spent = order_result.one()
        out.append({
            "id": str(u.id),
            "email": u.email,
            "name": u.full_name,
            "phone": u.phone,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "order_count": order_count or 0,
            "total_spent": float(total_spent or 0),
            "created_at": u.created_at.isoformat(),
        })
    return out


@router.get("/{customer_id}")
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == customer_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    orders_result = await db.execute(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(10)
    )
    orders = orders_result.scalars().all()

    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat(),
        "recent_orders": [
            {
                "order_number": o.order_number,
                "status": o.status,
                "total": float(o.total),
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ],
    }


@router.patch("/{customer_id}/toggle-status")
async def toggle_customer_status(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == customer_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    user.is_active = not user.is_active
    return {"message": f"Customer {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}
