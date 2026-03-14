#!/usr/bin/env python3
"""
export_seed.py — Export local development database to seed_production.py

Run this script on your LOCAL machine with the dev database running:
    cd backend && python scripts/export_seed.py

It will:
  1. Query all real products, categories, variants, images, shipping zones
  2. Copy product images to backend/seed_assets/images/{product_slug}/
  3. Generate backend/seed_production.py with your exact data

Then commit seed_production.py + seed_assets/ to git and deploy.
"""
import asyncio
import os
import sys
import shutil
import re
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.product import Category, Subcategory, Product, ProductVariant, ProductImage
from app.models.shipping import ShippingZone, ShippingRate

BACKEND_DIR = Path(__file__).parent.parent
SEED_ASSETS_DIR = BACKEND_DIR / "seed_assets" / "images"
OUTPUT_FILE = BACKEND_DIR / "seed_production.py"


def safe_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9-]", "-", name.lower()).strip("-")


async def export():
    print("Connecting to database...")
    async with AsyncSessionLocal() as db:
        # Fetch all categories
        cats_result = await db.execute(select(Category).order_by(Category.display_order))
        categories = cats_result.scalars().all()

        # Fetch all subcategories
        subs_result = await db.execute(select(Subcategory).order_by(Subcategory.category_id, Subcategory.display_order))
        subcategories = subs_result.scalars().all()

        # Fetch all active products
        prods_result = await db.execute(select(Product).order_by(Product.created_at))
        products = prods_result.scalars().all()

        # Fetch all variants
        vars_result = await db.execute(select(ProductVariant))
        all_variants = vars_result.scalars().all()

        # Fetch all images
        imgs_result = await db.execute(select(ProductImage).order_by(ProductImage.display_order))
        all_images = imgs_result.scalars().all()

        # Fetch shipping zones
        zones_result = await db.execute(select(ShippingZone))
        zones = zones_result.scalars().all()

        # Fetch shipping rates
        rates_result = await db.execute(select(ShippingRate))
        rates = rates_result.scalars().all()

    print(f"Found: {len(categories)} categories, {len(subcategories)} subcategories, {len(products)} products")
    print(f"Found: {len(all_variants)} variants, {len(all_images)} images")

    # Build lookup maps
    cat_map = {c.id: c for c in categories}
    sub_map = {s.id: s for s in subcategories}
    variants_by_product = {}
    for v in all_variants:
        variants_by_product.setdefault(str(v.product_id), []).append(v)
    images_by_product = {}
    for img in all_images:
        images_by_product.setdefault(str(img.product_id), []).append(img)

    # Copy product images to seed_assets/
    SEED_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    image_seed_paths = {}  # image_id -> relative path in seed_assets

    for product in products:
        imgs = images_by_product.get(str(product.id), [])
        if not imgs:
            continue
        dest_dir = SEED_ASSETS_DIR / product.slug
        dest_dir.mkdir(parents=True, exist_ok=True)

        for img in imgs:
            # img.url can be like /uploads/products/{id}/filename.jpg or /uploads/products/male/name.png
            url = img.url
            if url.startswith("/"):
                src_path = BACKEND_DIR / url.lstrip("/")
            else:
                src_path = BACKEND_DIR / url

            if src_path.exists():
                dest_file = dest_dir / src_path.name
                shutil.copy2(src_path, dest_file)
                rel = f"seed_assets/images/{product.slug}/{src_path.name}"
                image_seed_paths[img.id] = rel
                print(f"  Copied: {src_path.name} → {rel}")
            else:
                print(f"  WARNING: Image not found: {src_path}")
                image_seed_paths[img.id] = None

    # Generate seed_production.py
    lines = []
    lines.append('"""')
    lines.append('seed_production.py — Production seed data for Urban Bird')
    lines.append('')
    lines.append('Run on the deployed server (inside the backend container):')
    lines.append('    python seed_production.py')
    lines.append('')
    lines.append('Safe to run multiple times — idempotent (skips existing records).')
    lines.append('"""')
    lines.append('import asyncio')
    lines.append('import os')
    lines.append('import shutil')
    lines.append('from decimal import Decimal')
    lines.append('from pathlib import Path')
    lines.append('from sqlalchemy import select')
    lines.append('')
    lines.append('from app.database import engine, AsyncSessionLocal, Base')
    lines.append('from app.models import (')
    lines.append('    User, Category, Subcategory, Product, ProductVariant, ProductImage,')
    lines.append('    ShippingZone, ShippingRate, Coupon,')
    lines.append(')')
    lines.append('from app.utils.security import hash_password')
    lines.append('')
    lines.append('')
    lines.append('BACKEND_DIR = Path(__file__).parent')
    lines.append('SEED_ASSETS_DIR = BACKEND_DIR / "seed_assets" / "images"')
    lines.append('UPLOADS_DIR = BACKEND_DIR / "uploads" / "products"')
    lines.append('')
    lines.append('')
    lines.append('async def seed():')
    lines.append('    async with engine.begin() as conn:')
    lines.append('        await conn.run_sync(Base.metadata.create_all)')
    lines.append('')
    lines.append('    async with AsyncSessionLocal() as db:')
    lines.append('')
    lines.append('        # ── Admin user ──────────────────────────────────────────')
    lines.append('        from sqlalchemy import select')
    lines.append('        existing_admin = (await db.execute(select(User).where(User.email == "admin@urbanbird.co.ke"))).scalar_one_or_none()')
    lines.append('        if not existing_admin:')
    lines.append('            db.add(User(')
    lines.append('                email="admin@urbanbird.co.ke",')
    lines.append('                phone="+254799075061",')
    lines.append('                password_hash=hash_password("admin123!"),')
    lines.append('                first_name="Urban",')
    lines.append('                last_name="Admin",')
    lines.append('                role="super_admin",')
    lines.append('                is_active=True,')
    lines.append('                is_verified=True,')
    lines.append('            ))')
    lines.append('            print("✓ Admin user created")')
    lines.append('        else:')
    lines.append('            print("- Admin user already exists, skipping")')
    lines.append('')
    lines.append('        # ── Categories ──────────────────────────────────────────')
    lines.append('        cat_vars = {}')

    for cat in categories:
        var = safe_slug(cat.slug).replace("-", "_")
        lines.append(f'        existing_{var} = (await db.execute(select(Category).where(Category.slug == {repr(cat.slug)}))).scalar_one_or_none()')
        lines.append(f'        if not existing_{var}:')
        lines.append(f'            {var} = Category(')
        lines.append(f'                name={repr(cat.name)},')
        lines.append(f'                slug={repr(cat.slug)},')
        lines.append(f'                display_order={cat.display_order},')
        lines.append(f'                is_active={cat.is_active},')
        if cat.description:
            lines.append(f'                description={repr(cat.description)},')
        if cat.image_url:
            lines.append(f'                image_url={repr(cat.image_url)},')
        if cat.banner_url:
            lines.append(f'                banner_url={repr(cat.banner_url)},')
        if cat.seo_title:
            lines.append(f'                seo_title={repr(cat.seo_title)},')
        if cat.seo_description:
            lines.append(f'                seo_description={repr(cat.seo_description)},')
        lines.append(f'            )')
        lines.append(f'            db.add({var})')
        lines.append(f'            await db.flush()')
        lines.append(f'            print("✓ Category: {cat.name}")')
        lines.append(f'        else:')
        lines.append(f'            {var} = existing_{var}')
        lines.append(f'            print("- Category already exists: {cat.name}")')
        lines.append(f'        cat_vars[{repr(str(cat.id))}] = {var}')
        lines.append('')

    lines.append('')
    lines.append('        # ── Subcategories ────────────────────────────────────────')
    lines.append('        sub_vars = {}')

    for sub in subcategories:
        cat = cat_map.get(sub.category_id)
        cat_var = safe_slug(cat.slug).replace("-", "_") if cat else "unknown"
        var = f"sub_{cat_var}_{safe_slug(sub.slug).replace('-', '_')}"
        lines.append(f'        existing_{var} = (await db.execute(')
        lines.append(f'            select(Subcategory).where(')
        lines.append(f'                Subcategory.category_id == cat_vars[{repr(str(sub.category_id))}].id,')
        lines.append(f'                Subcategory.slug == {repr(sub.slug)},')
        lines.append(f'            )')
        lines.append(f'        )).scalar_one_or_none()')
        lines.append(f'        if not existing_{var}:')
        lines.append(f'            {var} = Subcategory(')
        lines.append(f'                category_id=cat_vars[{repr(str(sub.category_id))}].id,')
        lines.append(f'                name={repr(sub.name)},')
        lines.append(f'                slug={repr(sub.slug)},')
        lines.append(f'                display_order={sub.display_order},')
        lines.append(f'                is_active={sub.is_active},')
        if sub.description:
            lines.append(f'                description={repr(sub.description)},')
        if sub.image_url:
            lines.append(f'                image_url={repr(sub.image_url)},')
        lines.append(f'            )')
        lines.append(f'            db.add({var})')
        lines.append(f'            await db.flush()')
        lines.append(f'            print("✓ Subcategory: {sub.name} ({cat.name if cat else "?"})")')
        lines.append(f'        else:')
        lines.append(f'            {var} = existing_{var}')
        lines.append(f'            print("- Subcategory already exists: {sub.name}")')
        lines.append(f'        sub_vars[{repr(str(sub.id))}] = {var}')
        lines.append('')

    lines.append('')
    lines.append('        # ── Products ─────────────────────────────────────────────')

    for product in products:
        p_var = safe_slug(product.slug).replace("-", "_")
        cat_ref = f'cat_vars[{repr(str(product.category_id))}].id' if product.category_id else 'None'
        sub_ref = f'sub_vars[{repr(str(product.subcategory_id))}].id' if product.subcategory_id else 'None'

        lines.append(f'        existing_{p_var} = (await db.execute(select(Product).where(Product.slug == {repr(product.slug)}))).scalar_one_or_none()')
        lines.append(f'        if not existing_{p_var}:')
        lines.append(f'            {p_var} = Product(')
        lines.append(f'                name={repr(product.name)},')
        lines.append(f'                slug={repr(product.slug)},')
        lines.append(f'                description={repr(product.description or "")},')
        if product.short_description:
            lines.append(f'                short_description={repr(product.short_description)},')
        lines.append(f'                category_id={cat_ref},')
        lines.append(f'                subcategory_id={sub_ref},')
        lines.append(f'                price=Decimal("{product.price}"),')
        if product.compare_at_price:
            lines.append(f'                compare_at_price=Decimal("{product.compare_at_price}"),')
        if product.cost_price:
            lines.append(f'                cost_price=Decimal("{product.cost_price}"),')
        lines.append(f'                currency={repr(product.currency or "KES")},')
        lines.append(f'                status={repr(product.status)},')
        lines.append(f'                is_featured={product.is_featured},')
        lines.append(f'                is_new_arrival={product.is_new_arrival},')
        lines.append(f'                is_on_sale={product.is_on_sale},')
        if product.sale_percentage is not None:
            lines.append(f'                sale_percentage={product.sale_percentage},')
        lines.append(f'                total_stock={product.total_stock},')
        lines.append(f'                low_stock_threshold={product.low_stock_threshold},')
        if product.sku_prefix:
            lines.append(f'                sku_prefix={repr(product.sku_prefix)},')
        if product.brand:
            lines.append(f'                brand={repr(product.brand)},')
        if product.material:
            lines.append(f'                material={repr(product.material)},')
        if product.care_instructions:
            lines.append(f'                care_instructions={repr(product.care_instructions)},')
        if product.tags:
            lines.append(f'                tags={repr(product.tags)},')
        if product.weight_grams:
            lines.append(f'                weight_grams={product.weight_grams},')
        if product.seo_title:
            lines.append(f'                seo_title={repr(product.seo_title)},')
        if product.seo_description:
            lines.append(f'                seo_description={repr(product.seo_description)},')
        lines.append(f'            )')
        lines.append(f'            db.add({p_var})')
        lines.append(f'            await db.flush()')
        lines.append(f'            print("✓ Product: {product.name}")')

        # Variants
        variants = variants_by_product.get(str(product.id), [])
        if variants:
            lines.append(f'            # Variants for {product.name}')
            lines.append(f'            for v_data in [')
            for v in variants:
                lines.append(f'                {{"sku": {repr(v.sku)}, "size": {repr(v.size)}, "color_name": {repr(v.color_name)}, "color_hex": {repr(v.color_hex)}, "stock_quantity": {v.stock_quantity}, "price_adjustment": Decimal("{v.price_adjustment or 0}"), "is_active": {v.is_active}}},')
            lines.append(f'            ]:')
            lines.append(f'                db.add(ProductVariant(product_id={p_var}.id, **v_data))')

        # Images
        images = images_by_product.get(str(product.id), [])
        if images:
            lines.append(f'            # Images for {product.name}')
            lines.append(f'            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)')
            for img in images:
                seed_path = image_seed_paths.get(img.id)
                if seed_path:
                    filename = Path(seed_path).name
                    lines.append(f'            _img_src = SEED_ASSETS_DIR / {repr(product.slug)} / {repr(filename)}')
                    lines.append(f'            _img_dst_dir = UPLOADS_DIR / str({p_var}.id)')
                    lines.append(f'            _img_dst_dir.mkdir(parents=True, exist_ok=True)')
                    lines.append(f'            if _img_src.exists():')
                    lines.append(f'                shutil.copy2(_img_src, _img_dst_dir / {repr(filename)})')
                    lines.append(f'                db.add(ProductImage(')
                    lines.append(f'                    product_id={p_var}.id,')
                    lines.append(f'                    url=f"/uploads/products/{{str({p_var}.id)}}/{filename}",')
                    lines.append(f'                    alt_text={repr(img.alt_text or product.name)},')
                    lines.append(f'                    display_order={img.display_order},')
                    lines.append(f'                    is_primary={img.is_primary},')
                    lines.append(f'                ))')

        lines.append(f'        else:')
        lines.append(f'            {p_var} = existing_{p_var}')
        lines.append(f'            print("- Product already exists: {product.name}")')
        lines.append('')

    # Shipping zones
    lines.append('        # ── Shipping Zones ────────────────────────────────────────')
    for zone in zones:
        z_var = safe_slug(zone.name).replace("-", "_")
        lines.append(f'        existing_{z_var}_zone = (await db.execute(select(ShippingZone).where(ShippingZone.name == {repr(zone.name)}))).scalar_one_or_none()')
        lines.append(f'        if not existing_{z_var}_zone:')
        lines.append(f'            {z_var}_zone = ShippingZone(')
        lines.append(f'                name={repr(zone.name)},')
        lines.append(f'                counties={repr(zone.counties)},')
        lines.append(f'                is_active={zone.is_active},')
        lines.append(f'            )')
        lines.append(f'            db.add({z_var}_zone)')
        lines.append(f'            await db.flush()')

        zone_rates = [r for r in rates if r.zone_id == zone.id]
        for rate in zone_rates:
            lines.append(f'            db.add(ShippingRate(')
            lines.append(f'                zone_id={z_var}_zone.id,')
            lines.append(f'                method={repr(rate.method)},')
            lines.append(f'                price=Decimal("{rate.price}"),')
            if rate.free_above:
                lines.append(f'                free_above=Decimal("{rate.free_above}"),')
            lines.append(f'                estimated_days_min={rate.estimated_days_min},')
            lines.append(f'                estimated_days_max={rate.estimated_days_max},')
            lines.append(f'            ))')
        lines.append(f'            print("✓ Shipping zone: {zone.name}")')
        lines.append(f'        else:')
        lines.append(f'            print("- Shipping zone already exists: {zone.name}")')
        lines.append('')

    lines.append('        # ── Coupon ───────────────────────────────────────────────')
    lines.append('        from datetime import datetime, timezone, timedelta')
    lines.append('        from app.models.coupon import Coupon')
    lines.append('        existing_coupon = (await db.execute(select(Coupon).where(Coupon.code == "URBANBIRD20"))).scalar_one_or_none()')
    lines.append('        if not existing_coupon:')
    lines.append('            db.add(Coupon(')
    lines.append('                code="URBANBIRD20",')
    lines.append('                description="20% off your first order",')
    lines.append('                discount_type="percentage",')
    lines.append('                discount_value=Decimal("20.00"),')
    lines.append('                min_order_amount=Decimal("1000.00"),')
    lines.append('                max_discount_amount=Decimal("500.00"),')
    lines.append('                usage_limit=100,')
    lines.append('                per_user_limit=1,')
    lines.append('                starts_at=datetime.now(timezone.utc),')
    lines.append('                expires_at=datetime.now(timezone.utc) + timedelta(days=365),')
    lines.append('                is_active=True,')
    lines.append('            ))')
    lines.append('            print("✓ Coupon: URBANBIRD20")')
    lines.append('        else:')
    lines.append('            print("- Coupon already exists: URBANBIRD20")')
    lines.append('')
    lines.append('        await db.commit()')
    lines.append('        print("")')
    lines.append('        print("✅ Seed complete!")')
    lines.append('        print("   Admin: admin@urbanbird.co.ke / admin123!")')
    lines.append('        print("   Coupon: URBANBIRD20 (20% off, max KSh 500)")')
    lines.append('')
    lines.append('')
    lines.append('if __name__ == "__main__":')
    lines.append('    asyncio.run(seed())')

    output = "\n".join(lines) + "\n"
    OUTPUT_FILE.write_text(output)
    print(f"\n✅ Generated: {OUTPUT_FILE}")
    print(f"   Images copied to: {SEED_ASSETS_DIR}")
    print("\nNext steps:")
    print("  1. Review backend/seed_production.py")
    print("  2. git add backend/seed_production.py backend/seed_assets/")
    print("  3. git commit -m 'Add production seed with real product data'")
    print("  4. git push")
    print("  5. On deployed server: python seed_production.py")


if __name__ == "__main__":
    asyncio.run(export())
