import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product, Category
from app.api.deps import get_admin_user
from app.models.user import User

router = APIRouter()


def _date_range(period: str) -> tuple[datetime, datetime, datetime]:
    """Return (start, end, prev_start) for the given period string."""
    now = datetime.utcnow()
    if period == "7d":
        delta = timedelta(days=7)
    elif period == "90d":
        delta = timedelta(days=90)
    else:  # default 30d
        delta = timedelta(days=30)
    end = now
    start = now - delta
    prev_start = start - delta
    return start, end, prev_start


@router.get("/sales")
async def get_sales_report(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, prev_start = _date_range(period)

    # Current period orders (delivered or processing)
    active_statuses = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"]

    def order_filter(s, e):
        return and_(
            Order.created_at >= s,
            Order.created_at <= e,
            Order.status.in_(active_statuses),
        )

    # Summary for current period
    cur_result = await db.execute(
        select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0))
        .where(order_filter(start, end))
    )
    cur_count, cur_revenue = cur_result.one()
    cur_revenue = float(cur_revenue or 0)

    # Summary for previous period (for growth calculation)
    prev_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(order_filter(prev_start, start))
    )
    prev_revenue = float(prev_result.scalar() or 0)
    revenue_growth = (
        ((cur_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue else 0.0
    )
    avg_order_value = (cur_revenue / cur_count) if cur_count else 0.0

    # Revenue by day
    day_result = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .where(order_filter(start, end))
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    )
    revenue_by_day = [
        {"date": str(row.date), "revenue": float(row.revenue), "orders": row.orders}
        for row in day_result.all()
    ]

    # Top categories by revenue
    cat_result = await db.execute(
        select(
            Category.name.label("category"),
            func.coalesce(func.sum(OrderItem.total_price), 0).label("revenue"),
            func.count(Order.id.distinct()).label("orders"),
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(Product, Product.id == OrderItem.product_id, isouter=True)
        .join(Category, Category.id == Product.category_id, isouter=True)
        .where(order_filter(start, end))
        .group_by(Category.name)
        .order_by(func.sum(OrderItem.total_price).desc())
        .limit(6)
    )
    top_categories = [
        {"category": row.category or "Uncategorized", "revenue": float(row.revenue), "orders": row.orders}
        for row in cat_result.all()
    ]

    # Orders by status (all time for the period)
    status_result = await db.execute(
        select(Order.status, func.count(Order.id).label("count"))
        .where(and_(Order.created_at >= start, Order.created_at <= end))
        .group_by(Order.status)
    )
    orders_by_status = [
        {"status": row.status, "count": row.count}
        for row in status_result.all()
    ]

    return {
        "data": {
            "summary": {
                "total_revenue": cur_revenue,
                "total_orders": cur_count,
                "average_order_value": avg_order_value,
                "revenue_growth": round(revenue_growth, 2),
            },
            "revenue_by_day": revenue_by_day,
            "top_categories": top_categories,
            "orders_by_status": orders_by_status,
        }
    }


@router.get("/export-csv")
async def export_csv(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, _ = _date_range(period)

    result = await db.execute(
        select(Order)
        .where(and_(Order.created_at >= start, Order.created_at <= end))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Order Number", "Date", "Customer", "Status",
        "Payment Method", "Payment Status",
        "Subtotal (KSh)", "Shipping (KSh)", "Discount (KSh)", "Total (KSh)",
        "City", "County",
    ])

    for order in orders:
        writer.writerow([
            order.order_number,
            order.created_at.strftime("%Y-%m-%d %H:%M"),
            order.shipping_full_name,
            order.status,
            order.payment_method,
            order.payment_status,
            float(order.subtotal),
            float(order.shipping_cost),
            float(order.discount_amount),
            float(order.total),
            order.shipping_city,
            order.shipping_county,
        ])

    output.seek(0)
    filename = f"urban-bird-orders-{period}-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
