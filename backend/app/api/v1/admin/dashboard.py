from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.user import User
from app.models.product import Product, ProductVariant
from app.models.payment import Payment
from app.api.deps import get_admin_user

router = APIRouter()


@router.get("/overview")
async def get_overview(
    period: str = Query("month", regex="^(today|week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    now = datetime.now(timezone.utc)
    periods = {
        "today": now.replace(hour=0, minute=0, second=0, microsecond=0),
        "week": now - timedelta(days=7),
        "month": now - timedelta(days=30),
        "year": now - timedelta(days=365),
    }
    since = periods[period]

    # Total revenue (paid orders)
    revenue_result = await db.execute(
        select(func.sum(Order.total)).where(
            Order.payment_status == "paid",
            Order.created_at >= since,
        )
    )
    total_revenue = float(revenue_result.scalar_one() or 0)

    # Total orders
    orders_result = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= since)
    )
    total_orders = orders_result.scalar_one() or 0

    # Total customers
    customers_result = await db.execute(
        select(func.count(User.id)).where(User.role == "customer", User.created_at >= since)
    )
    new_customers = customers_result.scalar_one() or 0

    # Average order value
    avg_result = await db.execute(
        select(func.avg(Order.total)).where(
            Order.payment_status == "paid",
            Order.created_at >= since,
        )
    )
    avg_order_value = float(avg_result.scalar_one() or 0)

    # Low stock alerts
    low_stock_result = await db.execute(
        select(func.count(Product.id)).where(
            Product.total_stock <= Product.low_stock_threshold,
            Product.status == "active",
        )
    )
    low_stock_count = low_stock_result.scalar_one() or 0

    # Pending orders
    pending_result = await db.execute(
        select(func.count(Order.id)).where(Order.status == "processing")
    )
    orders_to_dispatch = pending_result.scalar_one() or 0

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "new_customers": new_customers,
        "avg_order_value": avg_order_value,
        "low_stock_count": low_stock_count,
        "orders_to_dispatch": orders_to_dispatch,
        "period": period,
    }


@router.get("/sales-chart")
async def get_sales_chart(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("orders"),
            func.sum(Order.total).label("revenue"),
        )
        .where(Order.created_at >= since, Order.payment_status == "paid")
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    rows = result.all()
    return [{"date": str(r.date), "orders": r.orders, "revenue": float(r.revenue or 0)} for r in rows]


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Product)
        .where(Product.status == "active")
        .order_by(Product.purchase_count.desc())
        .limit(limit)
    )
    products = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "purchase_count": p.purchase_count,
            "total_stock": p.total_stock,
            "price": float(p.price),
        }
        for p in products
    ]


@router.get("/low-stock-alerts")
async def get_low_stock(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Product)
        .where(
            Product.total_stock <= Product.low_stock_threshold,
            Product.status == "active",
        )
        .order_by(Product.total_stock.asc())
        .limit(20)
    )
    products = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "total_stock": p.total_stock,
            "low_stock_threshold": p.low_stock_threshold,
        }
        for p in products
    ]


@router.get("/recent-orders")
async def get_recent_orders(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Order)
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    orders = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "total": float(o.total),
            "payment_status": o.payment_status,
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]
