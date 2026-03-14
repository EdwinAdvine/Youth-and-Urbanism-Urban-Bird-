from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.user import User
from app.models.product import Product, ProductVariant
from app.models.payment import Payment
from app.models.return_request import ReturnRequest
from app.api.deps import get_admin_user

router = APIRouter()


def _date_range(period: str) -> tuple[datetime, datetime, datetime]:
    """Return (since, now, prev_since) for trend comparison."""
    now = datetime.now(timezone.utc)
    delta = {"7d": timedelta(days=7), "30d": timedelta(days=30), "90d": timedelta(days=90)}[period]
    since = now - delta
    prev_since = since - delta
    return since, now, prev_since


@router.get("/overview")
async def get_overview(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    since, now, prev_since = _date_range(period)

    # Current period revenue
    rev_cur = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.payment_status == "paid",
            Order.created_at >= since,
        )
    )
    revenue = float(rev_cur.scalar_one())

    # Previous period revenue (for trend)
    rev_prev = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.payment_status == "paid",
            Order.created_at >= prev_since,
            Order.created_at < since,
        )
    )
    prev_revenue = float(rev_prev.scalar_one())
    revenue_trend = round((revenue - prev_revenue) / prev_revenue * 100, 1) if prev_revenue else None

    # Current period orders
    ord_cur = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= since)
    )
    orders = ord_cur.scalar_one() or 0

    # Previous period orders (for trend)
    ord_prev = await db.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= prev_since,
            Order.created_at < since,
        )
    )
    prev_orders = ord_prev.scalar_one() or 0
    orders_trend = round((orders - prev_orders) / prev_orders * 100, 1) if prev_orders else None

    # New customers in period
    cust = await db.execute(
        select(func.count(User.id)).where(User.role == "customer", User.created_at >= since)
    )
    customers = cust.scalar_one() or 0

    # Average order value
    avg = await db.execute(
        select(func.avg(Order.total)).where(
            Order.payment_status == "paid",
            Order.created_at >= since,
        )
    )
    avg_order_value = float(avg.scalar_one() or 0)

    # Low stock count
    ls = await db.execute(
        select(func.count(Product.id)).where(
            Product.total_stock <= Product.low_stock_threshold,
            Product.status == "active",
        )
    )
    low_stock_count = ls.scalar_one() or 0

    # Orders needing dispatch (confirmed or processing)
    dispatch = await db.execute(
        select(func.count(Order.id)).where(Order.status.in_(["confirmed", "processing"]))
    )
    orders_to_dispatch = dispatch.scalar_one() or 0

    # Pending return requests
    returns = await db.execute(
        select(func.count(ReturnRequest.id)).where(ReturnRequest.status == "requested")
    )
    pending_returns = returns.scalar_one() or 0

    return {
        "revenue": revenue,
        "revenue_trend": revenue_trend,
        "orders": orders,
        "orders_trend": orders_trend,
        "customers": customers,
        "avg_order_value": avg_order_value,
        "low_stock_count": low_stock_count,
        "orders_to_dispatch": orders_to_dispatch,
        "pending_returns": pending_returns,
        "period": period,
    }


@router.get("/sales-chart")
async def get_sales_chart(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    since, _, _ = _date_range(period)
    result = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(Order.created_at >= since, Order.payment_status == "paid")
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    return [{"date": str(r.date), "orders": r.orders, "revenue": float(r.revenue)} for r in result.all()]


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(
            Product.id,
            Product.name,
            Product.slug,
            Product.price,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("total_sold"),
            func.coalesce(func.sum(OrderItem.total_price), 0).label("revenue"),
        )
        .outerjoin(OrderItem, OrderItem.product_id == Product.id)
        .where(Product.status == "active")
        .group_by(Product.id, Product.name, Product.slug, Product.price)
        .order_by(func.sum(OrderItem.total_price).desc().nullslast())
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "slug": r.slug,
            "price": float(r.price),
            "total_sold": int(r.total_sold),
            "revenue": float(r.revenue),
        }
        for r in rows
    ]


@router.get("/low-stock")
async def get_low_stock(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(
            ProductVariant.id,
            ProductVariant.size,
            ProductVariant.color_name,
            ProductVariant.stock_quantity,
            Product.name.label("product_name"),
            Product.id.label("product_id"),
            Product.low_stock_threshold,
        )
        .join(Product, Product.id == ProductVariant.product_id)
        .where(
            ProductVariant.stock_quantity <= Product.low_stock_threshold,
            Product.status == "active",
        )
        .order_by(ProductVariant.stock_quantity.asc())
        .limit(20)
    )
    rows = result.all()
    return [
        {
            "id": str(r.id),
            "product_id": str(r.product_id),
            "product_name": r.product_name,
            "size": r.size,
            "color_name": r.color_name,
            "stock_quantity": r.stock_quantity,
            "low_stock_threshold": r.low_stock_threshold,
        }
        for r in rows
    ]


@router.get("/recent-orders")
async def get_recent_orders(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(limit)
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


@router.get("/order-status-breakdown")
async def get_order_status_breakdown(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Order.status, func.count(Order.id).label("count"))
        .group_by(Order.status)
        .order_by(func.count(Order.id).desc())
    )
    # Return all statuses in a defined order for consistent display
    status_order = ["pending_payment", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]
    rows = {r.status: r.count for r in result.all()}
    return [
        {"status": s, "count": rows.get(s, 0)}
        for s in status_order
        if rows.get(s, 0) > 0
    ]


@router.get("/payment-breakdown")
async def get_payment_breakdown(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(
            Order.payment_method,
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(Order.payment_status == "paid")
        .group_by(Order.payment_method)
        .order_by(func.sum(Order.total).desc())
    )
    return [
        {
            "method": r.payment_method,
            "count": r.count,
            "revenue": float(r.revenue),
        }
        for r in result.all()
    ]


@router.get("/returns-summary")
async def get_returns_summary(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ReturnRequest.status, func.count(ReturnRequest.id).label("count"))
        .group_by(ReturnRequest.status)
    )
    rows = {r.status: r.count for r in result.all()}
    statuses = ["requested", "approved", "item_received", "completed", "rejected"]
    total = sum(rows.values())
    return {
        "total": total,
        "breakdown": [{"status": s, "count": rows.get(s, 0)} for s in statuses],
    }
