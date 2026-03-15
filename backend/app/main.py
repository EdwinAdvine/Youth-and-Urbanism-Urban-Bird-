from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

from app.config import settings
from app.database import engine, Base
from app.redis import get_redis, close_redis
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.limiter import limiter


async def _patch_stale_settings() -> None:
    """One-time data fix: update any settings that still hold old placeholder values."""
    from app.database import AsyncSessionLocal
    from app.models.site_settings import SiteSetting
    from sqlalchemy import select, update
    PATCHES = {
        "whatsapp_number": ("254700000000", "254799075061"),
        "social_links": None,  # handled below
    }
    try:
        async with AsyncSessionLocal() as db:
            # Fix plain whatsapp_number
            await db.execute(
                update(SiteSetting)
                .where(SiteSetting.key == "whatsapp_number", SiteSetting.value == "254700000000")
                .values(value="254799075061")
            )
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — wrap in try/except so concurrent Gunicorn workers don't crash
    # if another worker already created the tables (race condition on first deploy)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pass  # Tables already created by another worker — safe to continue
    await _patch_stale_settings()
    await get_redis()
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


class NoCacheAPIMiddleware(BaseHTTPMiddleware):
    """Ensure all API responses are never cached — changes appear immediately after deployment."""
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


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
from app.api.v1 import auth, users, products, categories, cart, wishlist, orders, payments, search, coupons, shipping, newsletter, notifications
from app.api.v1.admin import (
    dashboard, admin_orders, admin_products, admin_categories,
    admin_customers, admin_inventory, admin_coupons, admin_delivery,
    admin_reports, admin_returns, admin_staff, admin_settings, admin_banners,
    admin_notifications,
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
