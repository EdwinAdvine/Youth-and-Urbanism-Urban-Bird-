"""
main.py — FastAPI application factory for the Urban Bird API.

Startup sequence (lifespan):
  1. Create all missing DB tables (idempotent, race-safe for multi-worker deployments)
  2. Seed any new DEFAULT_SETTINGS keys that don't yet exist in the DB
  3. Apply one-time data patches (_patch_stale_settings)
  4. Flush content-cache Redis keys so every Coolify deploy serves fresh data
  5. Start APScheduler (background jobs: thank-you emails)

Middleware stack (applied top-to-bottom):
  SecurityHeadersMiddleware → ImageCacheMiddleware → NoCacheAPIMiddleware → CORS

API docs (/docs, /redoc) are disabled in production automatically.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

from app.config import settings
from app.database import engine, Base
from app.redis import get_redis, close_redis
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.limiter import limiter


async def _seed_default_settings() -> None:
    """Insert any DEFAULT_SETTINGS keys that are missing from the DB without overwriting existing values."""
    from app.database import AsyncSessionLocal
    from app.models.site_settings import SiteSetting, DEFAULT_SETTINGS
    from sqlalchemy import select
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(SiteSetting.key))
            existing_keys = set(result.scalars().all())
            for key, value in DEFAULT_SETTINGS.items():
                if key not in existing_keys:
                    db.add(SiteSetting(key=key, value=value))
            await db.commit()
    except Exception:
        pass


async def _seed_default_banners() -> None:
    """Insert the original 4 hero slides as banners if the banners table is empty."""
    from app.database import AsyncSessionLocal
    from app.models.banner import Banner
    from sqlalchemy import select, func
    DEFAULT_BANNERS = [
        dict(image_url="/slides/027.jpg", title="Shop Men", subtitle="Redefining Urban Elegance", cta_text="Shop Men's", cta_link="/category/men", display_order=0),
        dict(image_url="/slides/043.jpg", title="Shop Women", subtitle="Redefining Urban Elegance", cta_text="Shop Women's", cta_link="/category/women", display_order=1),
        dict(image_url="/slides/096.jpg", title="TRENDY URBAN", subtitle="Premium Streetwear", cta_text="Shop Now", cta_link="/shop", display_order=2),
        dict(image_url="/slides/sat26.jpg", title="MADE TO COMMAND", subtitle="New Collection 2025", cta_text="Explore", cta_link="/shop", display_order=3),
    ]
    try:
        async with AsyncSessionLocal() as db:
            count = await db.scalar(select(func.count()).select_from(Banner))
            if count == 0:
                for b in DEFAULT_BANNERS:
                    db.add(Banner(**b, is_active=True))
                await db.commit()
    except Exception:
        pass


async def _patch_stale_settings() -> None:
    """One-time data fix: update any settings that still hold old placeholder values."""
    from app.database import AsyncSessionLocal
    from app.models.site_settings import SiteSetting
    from sqlalchemy import select
    PATCHES = {
        "whatsapp_number": ("254700000000", "254799075061"),
        "social_links": None,  # handled below
    }
    try:
        async with AsyncSessionLocal() as db:
            # Fix plain whatsapp_number — fetch first, compare in Python to avoid
            # json = varchar operator error on PostgreSQL's JSON column type
            wa_result = await db.execute(select(SiteSetting).where(SiteSetting.key == "whatsapp_number"))
            wa_row = wa_result.scalar_one_or_none()
            if wa_row and wa_row.value == "254700000000":
                wa_row.value = "254799075061"
            # Fix whatsapp URL inside social_links JSON if still the old number
            result = await db.execute(select(SiteSetting).where(SiteSetting.key == "social_links"))
            row = result.scalar_one_or_none()
            if row and isinstance(row.value, dict):
                old_wa = row.value.get("whatsapp", "")
                if "254700000000" in old_wa:
                    row.value = {**row.value, "whatsapp": "https://wa.me/254799075061"}
            await db.commit()
    except Exception:
        pass


async def _apply_schema_changes() -> None:
    """
    Idempotent inline migrations for columns that were added to SQLAlchemy
    models but were never shipped as Alembic migrations.

    Uses ADD COLUMN IF NOT EXISTS so it is safe to run on every startup —
    a no-op if the column already exists, adds it silently if it doesn't.
    This fixes 500 errors on /products, /cart, and admin product save caused
    by the missing `colors` column on product_variants.
    """
    from sqlalchemy import text
    try:
        async with engine.begin() as conn:
            await conn.execute(text(
                "ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS colors JSONB"
            ))
    except Exception:
        pass  # Table doesn't exist yet on a fresh DB — create_all handles it


async def _seed_pickup_zone() -> None:
    """Ensure a 'Shop Pickup' shipping zone with a free pickup rate exists."""
    from app.database import AsyncSessionLocal
    from app.models.shipping import ShippingZone, ShippingRate
    from sqlalchemy import select
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(ShippingZone).where(ShippingZone.name.ilike("%pickup%")))
            existing = result.scalar_one_or_none()
            if not existing:
                zone = ShippingZone(name="Shop Pickup", counties=[], is_active=True)
                db.add(zone)
                await db.flush()
                db.add(ShippingRate(
                    zone_id=zone.id,
                    method="pickup",
                    price=0,
                    free_above=None,
                    estimated_days_min=0,
                    estimated_days_max=0,
                    is_active=True,
                ))
                await db.commit()
    except Exception:
        pass


async def _flush_content_cache(redis) -> None:
    """
    Flush non-auth Redis keys on every startup so Coolify deployments
    always serve fresh content without any manual intervention.
    Auth keys (refresh:*, blacklist:*, pwd_reset:*) are intentionally preserved.
    """
    try:
        patterns = ["search:*", "product:*", "category:*", "settings:*", "banner:*"]
        for pattern in patterns:
            keys = []
            async for key in redis.scan_iter(pattern):
                keys.append(key)
            if keys:
                await redis.delete(*keys)
    except Exception:
        pass  # Never block startup if flush fails


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — wrap in try/except so concurrent Gunicorn workers don't crash
    # if another worker already created the tables (race condition on first deploy)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pass  # Tables already created by another worker — safe to continue
    await _apply_schema_changes()
    await _seed_default_settings()
    await _seed_default_banners()
    await _patch_stale_settings()
    await _seed_pickup_zone()
    redis = await get_redis()
    # Flush content cache so every Coolify deployment serves fresh data immediately
    await _flush_content_cache(redis)
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()
    await close_redis()
    await engine.dispose()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' js.paystack.co; "
            "connect-src 'self' api.paystack.co; "
            "frame-src 'none'; "
            "object-src 'none'"
        )
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class ImageCacheMiddleware(BaseHTTPMiddleware):
    """Cache uploaded images aggressively — filenames are UUIDs so they never change."""
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/uploads/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


class NoCacheAPIMiddleware:
    """
    Pure ASGI middleware — sets no-cache headers on all /api/ responses.
    Implemented as raw ASGI (not BaseHTTPMiddleware) to avoid the known
    BaseHTTPMiddleware conflict with FastAPI yield-dependencies (get_db),
    which can cause 500 errors when preload_app=True in Gunicorn.
    """
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope.get("path", "").startswith("/api/"):
            await self.app(scope, receive, send)
            return

        async def send_with_no_cache(message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                headers["Pragma"] = "no-cache"
                headers["Expires"] = "0"
            await send(message)

        await self.app(scope, receive, send_with_no_cache)


_docs_url = "/docs" if settings.environment != "production" else None
_redoc_url = "/redoc" if settings.environment != "production" else None

app = FastAPI(
    title="Urban Bird API",
    description="E-Commerce Platform API for Urban Bird Kenya",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ImageCacheMiddleware)
app.add_middleware(NoCacheAPIMiddleware)

_cors_origins = [settings.frontend_url]
if settings.environment != "production":
    _cors_origins += ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Mount static uploads directory
upload_dir = settings.upload_dir
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Import and register routers
from app.api.v1 import auth, users, products, categories, cart, wishlist, orders, payments, search, coupons, shipping, newsletter, notifications, content
from app.api.v1.admin import (
    dashboard, admin_orders, admin_products, admin_categories,
    admin_customers, admin_inventory, admin_coupons, admin_delivery,
    admin_reports, admin_returns, admin_staff, admin_settings, admin_banners,
    admin_notifications, admin_content, admin_shipping,
)
# Ensure all models are registered with Base (so create_all picks them up)
from app.models import newsletter as _newsletter_model  # noqa: F401
from app.models import return_request as _return_model  # noqa: F401
from app.models import audit_log as _audit_model  # noqa: F401
from app.models import site_settings as _settings_model  # noqa: F401
from app.models import banner as _banner_model  # noqa: F401
from app.models import notification as _notification_model  # noqa: F401

API_V1 = "/api/v1"

app.include_router(auth.router, prefix=f"{API_V1}/auth", tags=["Auth"])
app.include_router(users.router, prefix=f"{API_V1}/users", tags=["Users"])
app.include_router(categories.router, prefix=f"{API_V1}/categories", tags=["Categories"])
app.include_router(products.router, prefix=f"{API_V1}/products", tags=["Products"])
app.include_router(search.router, prefix=f"{API_V1}/search", tags=["Search"])
app.include_router(cart.router, prefix=f"{API_V1}/cart", tags=["Cart"])
app.include_router(wishlist.router, prefix=f"{API_V1}/wishlist", tags=["Wishlist"])
app.include_router(orders.router, prefix=f"{API_V1}/orders", tags=["Orders"])
app.include_router(payments.router, prefix=f"{API_V1}/payments", tags=["Payments"])
app.include_router(coupons.router, prefix=f"{API_V1}/coupons", tags=["Coupons"])
app.include_router(shipping.router, prefix=f"{API_V1}/shipping", tags=["Shipping"])
app.include_router(newsletter.router, prefix=f"{API_V1}/newsletter", tags=["Newsletter"])
app.include_router(notifications.router, prefix=f"{API_V1}/notifications", tags=["Notifications"])
app.include_router(content.router, prefix=f"{API_V1}/content", tags=["Content"])

# Admin routes
ADMIN = f"{API_V1}/admin"
app.include_router(dashboard.router, prefix=f"{ADMIN}/dashboard", tags=["Admin - Dashboard"])
app.include_router(admin_orders.router, prefix=f"{ADMIN}/orders", tags=["Admin - Orders"])
app.include_router(admin_products.router, prefix=f"{ADMIN}/products", tags=["Admin - Products"])
app.include_router(admin_categories.router, prefix=f"{ADMIN}/categories", tags=["Admin - Categories"])
app.include_router(admin_customers.router, prefix=f"{ADMIN}/customers", tags=["Admin - Customers"])
app.include_router(admin_inventory.router, prefix=f"{ADMIN}/inventory", tags=["Admin - Inventory"])
app.include_router(admin_coupons.router, prefix=f"{ADMIN}/coupons", tags=["Admin - Coupons"])
app.include_router(admin_delivery.router, prefix=f"{ADMIN}/delivery", tags=["Admin - Delivery"])
app.include_router(admin_reports.router, prefix=f"{ADMIN}/reports", tags=["Admin - Reports"])
app.include_router(admin_returns.router, prefix=f"{ADMIN}/returns", tags=["Admin - Returns"])
app.include_router(admin_staff.router, prefix=f"{ADMIN}/staff", tags=["Admin - Staff"])
app.include_router(admin_settings.router, prefix=f"{ADMIN}/settings", tags=["Admin - Settings"])
app.include_router(admin_banners.router, prefix=f"{ADMIN}/banners", tags=["Admin - Banners"])
app.include_router(admin_notifications.router, prefix=f"{ADMIN}/notifications", tags=["Admin - Notifications"])
app.include_router(admin_content.router, prefix=f"{ADMIN}/content", tags=["Admin - Content"])
app.include_router(admin_shipping.router, prefix=f"{ADMIN}/shipping", tags=["Admin - Shipping"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "Urban Bird API"}


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap():
    """Dynamic sitemap combining static pages + all active products and categories."""
    from app.database import AsyncSessionLocal
    from app.models.product import Product, Category
    from sqlalchemy import select
    from fastapi.responses import Response

    BASE = settings.frontend_url
    STATIC = [
        (BASE + "/", "1.0", "daily"),
        (BASE + "/shop", "0.9", "daily"),
        (BASE + "/category/men", "0.8", "daily"),
        (BASE + "/category/women", "0.8", "daily"),
        (BASE + "/category/kids", "0.8", "daily"),
        (BASE + "/faq", "0.5", "monthly"),
        (BASE + "/returns", "0.5", "monthly"),
        (BASE + "/shipping", "0.5", "monthly"),
        (BASE + "/track-order", "0.4", "monthly"),
        (BASE + "/privacy", "0.3", "yearly"),
        (BASE + "/terms", "0.3", "yearly"),
    ]

    urls = []
    for loc, priority, changefreq in STATIC:
        urls.append(f"  <url>\n    <loc>{loc}</loc>\n    <changefreq>{changefreq}</changefreq>\n    <priority>{priority}</priority>\n  </url>")

    try:
        async with AsyncSessionLocal() as db:
            # Active products
            prod_result = await db.execute(
                select(Product.slug, Product.updated_at)
                .where(Product.status == "active")
                .order_by(Product.updated_at.desc())
            )
            for slug, updated_at in prod_result.all():
                lastmod = updated_at.strftime("%Y-%m-%d") if updated_at else ""
                lastmod_tag = f"\n    <lastmod>{lastmod}</lastmod>" if lastmod else ""
                urls.append(
                    f"  <url>\n    <loc>{BASE}/products/{slug}</loc>{lastmod_tag}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>"
                )
            # Categories
            cat_result = await db.execute(select(Category.slug).where(Category.is_active == True))
            for (cat_slug,) in cat_result.all():
                urls.append(
                    f"  <url>\n    <loc>{BASE}/category/{cat_slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>"
                )
    except Exception:
        pass  # Fall back to static-only sitemap

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>"
    return Response(content=xml, media_type="application/xml")
