import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract

from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product, Category
from app.models.user import User
from app.api.deps import get_admin_user

router = APIRouter()


def _date_range(period: str) -> tuple[datetime, datetime, datetime]:
    """Return (start, end, prev_start) for the given period string."""
    now = datetime.utcnow()
    delta = {"7d": timedelta(days=7), "30d": timedelta(days=30), "90d": timedelta(days=90)}[period]
    start = now - delta
    prev_start = start - delta
    return start, now, prev_start


_ACTIVE = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"]


@router.get("/sales")
async def get_sales_report(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, prev_start = _date_range(period)

    def order_filter(s, e):
        return and_(Order.created_at >= s, Order.created_at <= e, Order.status.in_(_ACTIVE))

    cur = await db.execute(
        select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0))
        .where(order_filter(start, end))
    )
    cur_count, cur_revenue = cur.one()
    cur_revenue = float(cur_revenue or 0)

    prev = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(order_filter(prev_start, start))
    )
    prev_revenue = float(prev.scalar() or 0)
    revenue_growth = ((cur_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue else 0.0

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

    status_result = await db.execute(
        select(Order.status, func.count(Order.id).label("count"))
        .where(and_(Order.created_at >= start, Order.created_at <= end))
        .group_by(Order.status)
    )
    orders_by_status = [{"status": row.status, "count": row.count} for row in status_result.all()]

    return {
        "data": {
            "summary": {
                "total_revenue": cur_revenue,
                "total_orders": cur_count,
                "average_order_value": (cur_revenue / cur_count) if cur_count else 0.0,
                "revenue_growth": round(revenue_growth, 2),
            },
            "revenue_by_day": revenue_by_day,
            "top_categories": top_categories,
            "orders_by_status": orders_by_status,
        }
    }


@router.get("/customers")
async def get_customer_analytics(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, prev_start = _date_range(period)

    # New customers registered in this period
    new_cust = await db.execute(
        select(func.count(User.id)).where(
            User.role == "customer",
            User.created_at >= start,
            User.created_at <= end,
        )
    )
    new_customers = new_cust.scalar_one() or 0

    # Previous period new customers (for trend)
    prev_cust = await db.execute(
        select(func.count(User.id)).where(
            User.role == "customer",
            User.created_at >= prev_start,
            User.created_at < start,
        )
    )
    prev_customers = prev_cust.scalar_one() or 0
    customer_growth = round((new_customers - prev_customers) / prev_customers * 100, 1) if prev_customers else None

    # Total active customers all time
    total_cust = await db.execute(
        select(func.count(User.id)).where(User.role == "customer", User.is_deleted == False)
    )
    total_customers = total_cust.scalar_one() or 0

    # Repeat buyers in period (placed >1 order)
    repeat_sq = (
        select(Order.user_id)
        .where(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.user_id.isnot(None),
        )
        .group_by(Order.user_id)
        .having(func.count(Order.id) > 1)
        .subquery()
    )
    repeat_result = await db.execute(select(func.count()).select_from(repeat_sq))
    repeat_buyers = repeat_result.scalar_one() or 0

    # Unique buyers in period (any order)
    unique_buyers_result = await db.execute(
        select(func.count(Order.user_id.distinct())).where(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.user_id.isnot(None),
        )
    )
    unique_buyers = unique_buyers_result.scalar_one() or 0
    repeat_rate = round(repeat_buyers / unique_buyers * 100, 1) if unique_buyers else 0.0

    # Average lifetime value per customer (all-time spend)
    ltv_sq = (
        select(Order.user_id, func.sum(Order.total).label("total_spent"))
        .where(Order.user_id.isnot(None), Order.status.in_(_ACTIVE))
        .group_by(Order.user_id)
        .subquery()
    )
    ltv_result = await db.execute(select(func.avg(ltv_sq.c.total_spent)))
    avg_ltv = float(ltv_result.scalar_one() or 0)

    # Guest vs registered orders in period
    guest_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.user_id.is_(None),
        )
    )
    guest_orders = guest_result.scalar_one() or 0

    registered_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.user_id.isnot(None),
        )
    )
    registered_orders = registered_result.scalar_one() or 0

    return {
        "new_customers": new_customers,
        "new_customer_growth": customer_growth,
        "total_customers": total_customers,
        "repeat_buyers": repeat_buyers,
        "unique_buyers": unique_buyers,
        "repeat_rate": repeat_rate,
        "avg_lifetime_value": round(avg_ltv, 2),
        "guest_orders": guest_orders,
        "registered_orders": registered_orders,
    }


@router.get("/products")
async def get_product_analytics(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, _ = _date_range(period)

    result = await db.execute(
        select(
            OrderItem.product_id,
            Product.name,
            Product.price,
            Product.cost_price,
            Product.total_stock,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.total_price).label("revenue"),
            func.count(OrderItem.order_id.distinct()).label("order_count"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id)
        .where(
            Order.created_at >= start,
            Order.created_at <= end,
            Order.status.in_(_ACTIVE),
            Product.status == "active",
        )
        .group_by(
            OrderItem.product_id, Product.name, Product.price,
            Product.cost_price, Product.total_stock,
        )
        .order_by(func.sum(OrderItem.total_price).desc())
        .limit(limit)
    )

    rows = result.all()
    products = []
    for r in rows:
        revenue = float(r.revenue or 0)
        units = int(r.units_sold or 0)
        price = float(r.price)
        cost = float(r.cost_price) if r.cost_price else None
        margin = round((price - cost) / price * 100, 1) if cost and price > 0 else None
        products.append({
            "id": str(r.product_id),
            "name": r.name,
            "units_sold": units,
            "revenue": revenue,
            "order_count": r.order_count,
            "avg_order_qty": round(units / r.order_count, 1) if r.order_count else 0,
            "price": price,
            "total_stock": r.total_stock,
            "margin_pct": margin,
        })
    return products


@router.get("/geographic")
async def get_geographic_analytics(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, _ = _date_range(period)

    result = await db.execute(
        select(
            Order.shipping_city.label("city"),
            Order.shipping_county.label("county"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.coalesce(func.avg(Order.total), 0).label("avg_order"),
        )
        .where(Order.created_at >= start, Order.created_at <= end)
        .group_by(Order.shipping_city, Order.shipping_county)
        .order_by(func.count(Order.id).desc())
        .limit(20)
    )

    return [
        {
            "city": r.city,
            "county": r.county,
            "orders": r.orders,
            "revenue": float(r.revenue),
            "avg_order": float(r.avg_order),
        }
        for r in result.all()
    ]


@router.get("/heatmap")
async def get_order_heatmap(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, _ = _date_range(period)

    result = await db.execute(
        select(
            extract("dow", Order.created_at).label("dow"),
            extract("hour", Order.created_at).label("hour"),
            func.count(Order.id).label("count"),
        )
        .where(Order.created_at >= start, Order.created_at <= end)
        .group_by(extract("dow", Order.created_at), extract("hour", Order.created_at))
    )

    return [{"dow": int(r.dow), "hour": int(r.hour), "count": r.count} for r in result.all()]


@router.get("/funnel")
async def get_order_funnel(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, _ = _date_range(period)

    result = await db.execute(
        select(Order.status, func.count(Order.id).label("count"))
        .where(Order.created_at >= start, Order.created_at <= end)
        .group_by(Order.status)
    )
    rows = {r.status: r.count for r in result.all()}
    total = sum(rows.values()) or 1

    funnel_stages = [
        ("pending_payment", "Pending Payment"),
        ("confirmed", "Confirmed"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    return [
        {
            "stage": label,
            "status": status,
            "count": rows.get(status, 0),
            "pct": round(rows.get(status, 0) / total * 100, 1),
        }
        for status, label in funnel_stages
        if rows.get(status, 0) > 0
    ]


@router.get("/payment-methods")
async def get_payment_method_analytics(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    start, end, _ = _date_range(period)

    result = await db.execute(
        select(
            Order.payment_method,
            Order.payment_status,
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(Order.created_at >= start, Order.created_at <= end)
        .group_by(Order.payment_method, Order.payment_status)
        .order_by(func.sum(Order.total).desc())
    )

    methods: dict[str, dict] = {}
    for r in result.all():
        m = r.payment_method or "unknown"
        if m not in methods:
            methods[m] = {
                "method": m,
                "total_orders": 0,
                "paid_orders": 0,
                "revenue": 0.0,
                "failed_orders": 0,
                "pending_orders": 0,
            }
        methods[m]["total_orders"] += r.count
        if r.payment_status == "paid":
            methods[m]["paid_orders"] += r.count
            methods[m]["revenue"] += float(r.revenue)
        elif r.payment_status == "failed":
            methods[m]["failed_orders"] += r.count
        else:
            methods[m]["pending_orders"] += r.count

    result_list = sorted(methods.values(), key=lambda x: x["revenue"], reverse=True)
    for m in result_list:
        m["success_rate"] = round(m["paid_orders"] / m["total_orders"] * 100, 1) if m["total_orders"] else 0
        m["avg_order_value"] = round(m["revenue"] / m["paid_orders"], 2) if m["paid_orders"] else 0

    return result_list


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
