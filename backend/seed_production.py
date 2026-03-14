"""
seed_production.py — Production seed data for Urban Bird

Run on the deployed server (inside the backend container):
    python seed_production.py

Safe to run multiple times — idempotent (skips existing records).
"""
import asyncio
import os
import shutil
from decimal import Decimal
from pathlib import Path
from sqlalchemy import select

from app.database import engine, AsyncSessionLocal, Base
from app.models import (
    User, Category, Subcategory, Product, ProductVariant, ProductImage,
    ShippingZone, ShippingRate, Coupon,
)
from app.utils.security import hash_password


BACKEND_DIR = Path(__file__).parent
SEED_ASSETS_DIR = BACKEND_DIR / "seed_assets" / "images"
UPLOADS_DIR = BACKEND_DIR / "uploads" / "products"


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:

        # ── Admin user ──────────────────────────────────────────
        from sqlalchemy import select
        existing_admin = (await db.execute(select(User).where(User.email == "admin@urbanbird.co.ke"))).scalar_one_or_none()
        if not existing_admin:
            db.add(User(
                email="admin@urbanbird.co.ke",
                phone="+254799075061",
                password_hash=hash_password("admin123!"),
                first_name="Urban",
                last_name="Admin",
                role="super_admin",
                is_active=True,
                is_verified=True,
            ))
            print("✓ Admin user created")
        else:
            print("- Admin user already exists, skipping")

        # ── Categories ──────────────────────────────────────────
        cat_vars = {}
        existing_men = (await db.execute(select(Category).where(Category.slug == 'men'))).scalar_one_or_none()
        if not existing_men:
            men = Category(
                name='Men',
                slug='men',
                display_order=1,
                is_active=True,
                seo_title="Men's Clothing - Urban Bird Kenya",
            )
            db.add(men)
            await db.flush()
            print("✓ Category: Men")
        else:
            men = existing_men
            print("- Category already exists: Men")
        cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'] = men

        existing_women = (await db.execute(select(Category).where(Category.slug == 'women'))).scalar_one_or_none()
        if not existing_women:
            women = Category(
                name='Women',
                slug='women',
                display_order=2,
                is_active=True,
                seo_title="Women's Clothing - Urban Bird Kenya",
            )
            db.add(women)
            await db.flush()
            print("✓ Category: Women")
        else:
            women = existing_women
            print("- Category already exists: Women")
        cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'] = women

        existing_kids = (await db.execute(select(Category).where(Category.slug == 'kids'))).scalar_one_or_none()
        if not existing_kids:
            kids = Category(
                name='Kids',
                slug='kids',
                display_order=3,
                is_active=True,
                seo_title="Kids' Clothing - Urban Bird Kenya",
            )
            db.add(kids)
            await db.flush()
            print("✓ Category: Kids")
        else:
            kids = existing_kids
            print("- Category already exists: Kids")
        cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'] = kids


        # ── Subcategories ────────────────────────────────────────
        sub_vars = {}
        existing_sub_women_tops = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                Subcategory.slug == 'tops',
            )
        )).scalar_one_or_none()
        if not existing_sub_women_tops:
            sub_women_tops = Subcategory(
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                name='Tops',
                slug='tops',
                display_order=1,
                is_active=True,
            )
            db.add(sub_women_tops)
            await db.flush()
            print("✓ Subcategory: Tops (Women)")
        else:
            sub_women_tops = existing_sub_women_tops
            print("- Subcategory already exists: Tops")
        sub_vars['ecdb78aa-3f6c-4988-878e-768ade01fc17'] = sub_women_tops

        existing_sub_women_layers_jackets = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                Subcategory.slug == 'layers-jackets',
            )
        )).scalar_one_or_none()
        if not existing_sub_women_layers_jackets:
            sub_women_layers_jackets = Subcategory(
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                name='Layers & Jackets',
                slug='layers-jackets',
                display_order=2,
                is_active=True,
            )
            db.add(sub_women_layers_jackets)
            await db.flush()
            print("✓ Subcategory: Layers & Jackets (Women)")
        else:
            sub_women_layers_jackets = existing_sub_women_layers_jackets
            print("- Subcategory already exists: Layers & Jackets")
        sub_vars['0e35593d-ae14-4aad-b60f-0a5d4a4cf27e'] = sub_women_layers_jackets

        existing_sub_women_bottoms_dresses = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                Subcategory.slug == 'bottoms-dresses',
            )
        )).scalar_one_or_none()
        if not existing_sub_women_bottoms_dresses:
            sub_women_bottoms_dresses = Subcategory(
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                name='Bottoms & Dresses',
                slug='bottoms-dresses',
                display_order=3,
                is_active=True,
            )
            db.add(sub_women_bottoms_dresses)
            await db.flush()
            print("✓ Subcategory: Bottoms & Dresses (Women)")
        else:
            sub_women_bottoms_dresses = existing_sub_women_bottoms_dresses
            print("- Subcategory already exists: Bottoms & Dresses")
        sub_vars['cbff39e8-0b2c-411b-8eee-7bf97fc31ccf'] = sub_women_bottoms_dresses

        existing_sub_women_accessories = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                Subcategory.slug == 'accessories',
            )
        )).scalar_one_or_none()
        if not existing_sub_women_accessories:
            sub_women_accessories = Subcategory(
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                name='Accessories',
                slug='accessories',
                display_order=4,
                is_active=True,
            )
            db.add(sub_women_accessories)
            await db.flush()
            print("✓ Subcategory: Accessories (Women)")
        else:
            sub_women_accessories = existing_sub_women_accessories
            print("- Subcategory already exists: Accessories")
        sub_vars['8747851a-884e-44c4-9705-5215b5c81991'] = sub_women_accessories

        existing_sub_kids_tops = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                Subcategory.slug == 'tops',
            )
        )).scalar_one_or_none()
        if not existing_sub_kids_tops:
            sub_kids_tops = Subcategory(
                category_id=cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                name='Tops',
                slug='tops',
                display_order=1,
                is_active=True,
            )
            db.add(sub_kids_tops)
            await db.flush()
            print("✓ Subcategory: Tops (Kids)")
        else:
            sub_kids_tops = existing_sub_kids_tops
            print("- Subcategory already exists: Tops")
        sub_vars['f1d04b7e-ee1a-4d25-9937-53bb0e6fb381'] = sub_kids_tops

        existing_sub_kids_layers_jackets = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                Subcategory.slug == 'layers-jackets',
            )
        )).scalar_one_or_none()
        if not existing_sub_kids_layers_jackets:
            sub_kids_layers_jackets = Subcategory(
                category_id=cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                name='Layers & Jackets',
                slug='layers-jackets',
                display_order=2,
                is_active=True,
            )
            db.add(sub_kids_layers_jackets)
            await db.flush()
            print("✓ Subcategory: Layers & Jackets (Kids)")
        else:
            sub_kids_layers_jackets = existing_sub_kids_layers_jackets
            print("- Subcategory already exists: Layers & Jackets")
        sub_vars['3c15934c-f060-479c-b56b-c5b956058a95'] = sub_kids_layers_jackets

        existing_sub_kids_bottoms = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                Subcategory.slug == 'bottoms',
            )
        )).scalar_one_or_none()
        if not existing_sub_kids_bottoms:
            sub_kids_bottoms = Subcategory(
                category_id=cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                name='Bottoms',
                slug='bottoms',
                display_order=3,
                is_active=True,
            )
            db.add(sub_kids_bottoms)
            await db.flush()
            print("✓ Subcategory: Bottoms (Kids)")
        else:
            sub_kids_bottoms = existing_sub_kids_bottoms
            print("- Subcategory already exists: Bottoms")
        sub_vars['23c2424e-993b-4a90-89ca-dcd2023a9f51'] = sub_kids_bottoms

        existing_sub_kids_accessories = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                Subcategory.slug == 'accessories',
            )
        )).scalar_one_or_none()
        if not existing_sub_kids_accessories:
            sub_kids_accessories = Subcategory(
                category_id=cat_vars['232d49d6-fcf2-4d63-8cea-f3881f9b4c0a'].id,
                name='Accessories',
                slug='accessories',
                display_order=4,
                is_active=True,
            )
            db.add(sub_kids_accessories)
            await db.flush()
            print("✓ Subcategory: Accessories (Kids)")
        else:
            sub_kids_accessories = existing_sub_kids_accessories
            print("- Subcategory already exists: Accessories")
        sub_vars['92cf5499-28f9-432d-9298-987c2835d652'] = sub_kids_accessories

        existing_sub_men_tops = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                Subcategory.slug == 'tops',
            )
        )).scalar_one_or_none()
        if not existing_sub_men_tops:
            sub_men_tops = Subcategory(
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                name='Tops',
                slug='tops',
                display_order=1,
                is_active=True,
            )
            db.add(sub_men_tops)
            await db.flush()
            print("✓ Subcategory: Tops (Men)")
        else:
            sub_men_tops = existing_sub_men_tops
            print("- Subcategory already exists: Tops")
        sub_vars['1a975bdb-5957-46ab-804d-636c0246a680'] = sub_men_tops

        existing_sub_men_layers_jackets = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                Subcategory.slug == 'layers-jackets',
            )
        )).scalar_one_or_none()
        if not existing_sub_men_layers_jackets:
            sub_men_layers_jackets = Subcategory(
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                name='Layers & Jackets',
                slug='layers-jackets',
                display_order=2,
                is_active=True,
            )
            db.add(sub_men_layers_jackets)
            await db.flush()
            print("✓ Subcategory: Layers & Jackets (Men)")
        else:
            sub_men_layers_jackets = existing_sub_men_layers_jackets
            print("- Subcategory already exists: Layers & Jackets")
        sub_vars['a3f67b21-0bc5-47c5-9a5d-8ef5ed878bfb'] = sub_men_layers_jackets

        existing_sub_men_bottoms = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                Subcategory.slug == 'bottoms',
            )
        )).scalar_one_or_none()
        if not existing_sub_men_bottoms:
            sub_men_bottoms = Subcategory(
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                name='Bottoms',
                slug='bottoms',
                display_order=3,
                is_active=True,
            )
            db.add(sub_men_bottoms)
            await db.flush()
            print("✓ Subcategory: Bottoms (Men)")
        else:
            sub_men_bottoms = existing_sub_men_bottoms
            print("- Subcategory already exists: Bottoms")
        sub_vars['34833554-8ff6-485f-a93d-9e23210f277b'] = sub_men_bottoms

        existing_sub_men_accessories = (await db.execute(
            select(Subcategory).where(
                Subcategory.category_id == cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                Subcategory.slug == 'accessories',
            )
        )).scalar_one_or_none()
        if not existing_sub_men_accessories:
            sub_men_accessories = Subcategory(
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                name='Accessories',
                slug='accessories',
                display_order=4,
                is_active=True,
            )
            db.add(sub_men_accessories)
            await db.flush()
            print("✓ Subcategory: Accessories (Men)")
        else:
            sub_men_accessories = existing_sub_men_accessories
            print("- Subcategory already exists: Accessories")
        sub_vars['291e948a-b208-462c-8870-7b321fe02f27'] = sub_men_accessories


        # ── Products ─────────────────────────────────────────────
        existing_urban_hoodie = (await db.execute(select(Product).where(Product.slug == 'urban-hoodie'))).scalar_one_or_none()
        if not existing_urban_hoodie:
            urban_hoodie = Product(
                name='Urban Hoodie',
                slug='urban-hoodie',
                description='Premium heavyweight hoodie crafted from 100% cotton fleece. Perfect for cold Nairobi evenings.',
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                subcategory_id=sub_vars['a3f67b21-0bc5-47c5-9a5d-8ef5ed878bfb'].id,
                price=Decimal("3500.00"),
                compare_at_price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=True,
                is_new_arrival=False,
                is_on_sale=True,
                sale_percentage=30,
                total_stock=50,
                low_stock_threshold=5,
                brand='Urban Bird',
                material='100% Cotton Fleece',
                tags=['hoodie', 'casual', 'bestseller'],
            )
            db.add(urban_hoodie)
            await db.flush()
            print("✓ Product: Urban Hoodie")
            # Variants for Urban Hoodie
            for v_data in [
                {"sku": 'URBAN-HOODIE-XS-BLA', "size": 'XS', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XS-NAV', "size": 'XS', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XS-MAR', "size": 'XS', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=urban_hoodie.id, **v_data))
            # Images for Urban Hoodie
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie' / 'Urban Hoodie.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie.png')
                db.add(ProductImage(
                    product_id=urban_hoodie.id,
                    url=f"/uploads/products/{str(urban_hoodie.id)}/Urban Hoodie.png",
                    alt_text='Urban Hoodie front view',
                    display_order=0,
                    is_primary=True,
                ))
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie' / 'Urban Hoodie2.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie2.png')
                db.add(ProductImage(
                    product_id=urban_hoodie.id,
                    url=f"/uploads/products/{str(urban_hoodie.id)}/Urban Hoodie2.png",
                    alt_text='Urban Hoodie alternate view',
                    display_order=1,
                    is_primary=False,
                ))
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie' / 'rban Hoodie.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'rban Hoodie.png')
                db.add(ProductImage(
                    product_id=urban_hoodie.id,
                    url=f"/uploads/products/{str(urban_hoodie.id)}/rban Hoodie.png",
                    alt_text='Urban Hoodie detail',
                    display_order=2,
                    is_primary=False,
                ))
        else:
            urban_hoodie = existing_urban_hoodie
            print("- Product already exists: Urban Hoodie")

        existing_urban_sweatpant = (await db.execute(select(Product).where(Product.slug == 'urban-sweatpant'))).scalar_one_or_none()
        if not existing_urban_sweatpant:
            urban_sweatpant = Product(
                name='Urban Sweatpant',
                slug='urban-sweatpant',
                description='Comfortable and stylish sweatpants for everyday wear. Elastic waistband with drawstring.',
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                subcategory_id=sub_vars['34833554-8ff6-485f-a93d-9e23210f277b'].id,
                price=Decimal("3000.00"),
                currency='KES',
                status='archived',
                is_featured=True,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=50,
                low_stock_threshold=5,
                brand='Urban Bird',
                material='80% Cotton, 20% Polyester',
                tags=['sweatpants', 'casual', 'comfortable'],
            )
            db.add(urban_sweatpant)
            await db.flush()
            print("✓ Product: Urban Sweatpant")
            # Variants for Urban Sweatpant
            for v_data in [
                {"sku": 'URBAN-SWEATPANT-XS-BLA', "size": 'XS', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XS-NAV', "size": 'XS', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XS-MAR', "size": 'XS', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SWEATPANT-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=urban_sweatpant.id, **v_data))
        else:
            urban_sweatpant = existing_urban_sweatpant
            print("- Product already exists: Urban Sweatpant")

        existing_urban_short = (await db.execute(select(Product).where(Product.slug == 'urban-short'))).scalar_one_or_none()
        if not existing_urban_short:
            urban_short = Product(
                name='Urban Short',
                slug='urban-short',
                description='Lightweight fleece shorts perfect for warm days or lounging at home.',
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                subcategory_id=sub_vars['34833554-8ff6-485f-a93d-9e23210f277b'].id,
                price=Decimal("2500.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=50,
                low_stock_threshold=5,
                brand='Urban Bird',
                material='100% Polyester Fleece',
                tags=['shorts', 'casual'],
            )
            db.add(urban_short)
            await db.flush()
            print("✓ Product: Urban Short")
            # Variants for Urban Short
            for v_data in [
                {"sku": 'URBAN-SHORT-XS-BLA', "size": 'XS', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XS-NAV', "size": 'XS', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XS-MAR', "size": 'XS', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-SHORT-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=urban_short.id, **v_data))
            # Images for Urban Short
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'urban-short' / 'Urban Short.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_short.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Short.png')
                db.add(ProductImage(
                    product_id=urban_short.id,
                    url=f"/uploads/products/{str(urban_short.id)}/Urban Short.png",
                    alt_text='Urban Short front view',
                    display_order=0,
                    is_primary=True,
                ))
        else:
            urban_short = existing_urban_short
            print("- Product already exists: Urban Short")

        existing_urban_hoodie_sweatpant_set = (await db.execute(select(Product).where(Product.slug == 'urban-hoodie-sweatpant-set'))).scalar_one_or_none()
        if not existing_urban_hoodie_sweatpant_set:
            urban_hoodie_sweatpant_set = Product(
                name='Urban Hoodie & Sweatpant Set',
                slug='urban-hoodie-sweatpant-set',
                description='Matching hoodie and sweatpant combo for a coordinated look. Available in multiple colorways.',
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                subcategory_id=sub_vars['a3f67b21-0bc5-47c5-9a5d-8ef5ed878bfb'].id,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=True,
                is_new_arrival=False,
                is_on_sale=False,
                total_stock=50,
                low_stock_threshold=5,
                brand='Urban Bird',
                material='100% Cotton Fleece',
                tags=['set', 'hoodie', 'sweatpant', 'bundle'],
            )
            db.add(urban_hoodie_sweatpant_set)
            await db.flush()
            print("✓ Product: Urban Hoodie & Sweatpant Set")
            # Variants for Urban Hoodie & Sweatpant Set
            for v_data in [
                {"sku": 'URBAN-HOODIE-SW-XS-BLA', "size": 'XS', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XS-NAV', "size": 'XS', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XS-MAR', "size": 'XS', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-SW-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=urban_hoodie_sweatpant_set.id, **v_data))
            # Images for Urban Hoodie & Sweatpant Set
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie-sweatpant-set' / 'Urban Hoodie Set.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie_sweatpant_set.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie Set.png')
                db.add(ProductImage(
                    product_id=urban_hoodie_sweatpant_set.id,
                    url=f"/uploads/products/{str(urban_hoodie_sweatpant_set.id)}/Urban Hoodie Set.png",
                    alt_text='Urban Hoodie Set front view',
                    display_order=0,
                    is_primary=True,
                ))
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie-sweatpant-set' / 'Urban Hoodie Set 2.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie_sweatpant_set.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie Set 2.png')
                db.add(ProductImage(
                    product_id=urban_hoodie_sweatpant_set.id,
                    url=f"/uploads/products/{str(urban_hoodie_sweatpant_set.id)}/Urban Hoodie Set 2.png",
                    alt_text='Urban Hoodie Set alternate view',
                    display_order=1,
                    is_primary=False,
                ))
        else:
            urban_hoodie_sweatpant_set = existing_urban_hoodie_sweatpant_set
            print("- Product already exists: Urban Hoodie & Sweatpant Set")

        existing_urban_hoodie_and_short_set = (await db.execute(select(Product).where(Product.slug == 'urban-hoodie-and-short-set'))).scalar_one_or_none()
        if not existing_urban_hoodie_and_short_set:
            urban_hoodie_and_short_set = Product(
                name='Urban Hoodie and Short Set',
                slug='urban-hoodie-and-short-set',
                description='Matching hoodie and shorts combo for a coordinated look. Available in multiple colorways.',
                category_id=cat_vars['5237bc4b-7003-4415-b4b8-98ec53edb99d'].id,
                subcategory_id=sub_vars['a3f67b21-0bc5-47c5-9a5d-8ef5ed878bfb'].id,
                price=Decimal("4500.00"),
                currency='KES',
                status='active',
                is_featured=True,
                is_new_arrival=False,
                is_on_sale=False,
                total_stock=50,
                low_stock_threshold=5,
                brand='Urban Bird',
                material='100% Cotton Fleece',
                tags=['set', 'hoodie', 'shorts', 'bundle'],
            )
            db.add(urban_hoodie_and_short_set)
            await db.flush()
            print("✓ Product: Urban Hoodie and Short Set")
            # Variants for Urban Hoodie and Short Set
            for v_data in [
                {"sku": 'URBAN-HOODIE-AN-XS-BLA', "size": 'XS', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XS-NAV', "size": 'XS', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XS-MAR', "size": 'XS', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'URBAN-HOODIE-AN-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=urban_hoodie_and_short_set.id, **v_data))
            # Images for Urban Hoodie and Short Set
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie-and-short-set' / 'Urban Hoodie and Short.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie_and_short_set.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie and Short.png')
                db.add(ProductImage(
                    product_id=urban_hoodie_and_short_set.id,
                    url=f"/uploads/products/{str(urban_hoodie_and_short_set.id)}/Urban Hoodie and Short.png",
                    alt_text='Urban Hoodie and Short Set front view',
                    display_order=0,
                    is_primary=True,
                ))
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie-and-short-set' / 'Urban Hoodie and Short 2.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie_and_short_set.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie and Short 2.png')
                db.add(ProductImage(
                    product_id=urban_hoodie_and_short_set.id,
                    url=f"/uploads/products/{str(urban_hoodie_and_short_set.id)}/Urban Hoodie and Short 2.png",
                    alt_text='Urban Hoodie and Short Set alternate view',
                    display_order=1,
                    is_primary=False,
                ))
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie-and-short-set' / 'Urban Hoodie and Short 3.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie_and_short_set.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Hoodie and Short 3.png')
                db.add(ProductImage(
                    product_id=urban_hoodie_and_short_set.id,
                    url=f"/uploads/products/{str(urban_hoodie_and_short_set.id)}/Urban Hoodie and Short 3.png",
                    alt_text='Urban Hoodie and Short Set detail',
                    display_order=2,
                    is_primary=False,
                ))
            _img_src = SEED_ASSETS_DIR / 'urban-hoodie-and-short-set' / 'Urban Woodie and Short.png'
            _img_dst_dir = UPLOADS_DIR / str(urban_hoodie_and_short_set.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / 'Urban Woodie and Short.png')
                db.add(ProductImage(
                    product_id=urban_hoodie_and_short_set.id,
                    url=f"/uploads/products/{str(urban_hoodie_and_short_set.id)}/Urban Woodie and Short.png",
                    alt_text='Urban Hoodie and Short Set variant',
                    display_order=3,
                    is_primary=False,
                ))
        else:
            urban_hoodie_and_short_set = existing_urban_hoodie_and_short_set
            print("- Product already exists: Urban Hoodie and Short Set")

        existing_women_urban_leggings = (await db.execute(select(Product).where(Product.slug == 'women-urban-leggings'))).scalar_one_or_none()
        if not existing_women_urban_leggings:
            women_urban_leggings = Product(
                name='Women Urban Leggings',
                slug='women-urban-leggings',
                description='High-waist compression leggings with four-way stretch fabric. Perfect for workouts or casual wear.',
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=sub_vars['cbff39e8-0b2c-411b-8eee-7bf97fc31ccf'].id,
                price=Decimal("2800.00"),
                currency='KES',
                status='archived',
                is_featured=True,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=50,
                low_stock_threshold=5,
                brand='Urban Bird',
                material='85% Polyester, 15% Spandex',
                tags=['leggings', 'women', 'activewear'],
            )
            db.add(women_urban_leggings)
            await db.flush()
            print("✓ Product: Women Urban Leggings")
            # Variants for Women Urban Leggings
            for v_data in [
                {"sku": 'WOMEN-URBAN-LEG-XS-BLA', "size": 'XS', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XS-NAV', "size": 'XS', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XS-MAR', "size": 'XS', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WOMEN-URBAN-LEG-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=women_urban_leggings.id, **v_data))
        else:
            women_urban_leggings = existing_women_urban_leggings
            print("- Product already exists: Women Urban Leggings")

        existing_womens_style_1 = (await db.execute(select(Product).where(Product.slug == 'womens-style-1'))).scalar_one_or_none()
        if not existing_womens_style_1:
            womens_style_1 = Product(
                name="Women's Style 1",
                slug='womens-style-1',
                description="Urban Bird women's fashion piece — style 1.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_1)
            await db.flush()
            print("✓ Product: Women's Style 1")
            # Variants for Women's Style 1
            for v_data in [
                {"sku": 'WS1-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS1-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_1.id, **v_data))
            # Images for Women's Style 1
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-1' / '1.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_1.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '1.png')
                db.add(ProductImage(
                    product_id=womens_style_1.id,
                    url=f"/uploads/products/{str(womens_style_1.id)}/1.png",
                    alt_text="Women's Style 1",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_1 = existing_womens_style_1
            print("- Product already exists: Women's Style 1")

        existing_womens_style_4 = (await db.execute(select(Product).where(Product.slug == 'womens-style-4'))).scalar_one_or_none()
        if not existing_womens_style_4:
            womens_style_4 = Product(
                name="Women's Style 4",
                slug='womens-style-4',
                description="Urban Bird women's fashion piece — style 4.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_4)
            await db.flush()
            print("✓ Product: Women's Style 4")
            # Variants for Women's Style 4
            for v_data in [
                {"sku": 'WS4-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS4-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_4.id, **v_data))
            # Images for Women's Style 4
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-4' / '4.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_4.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '4.png')
                db.add(ProductImage(
                    product_id=womens_style_4.id,
                    url=f"/uploads/products/{str(womens_style_4.id)}/4.png",
                    alt_text="Women's Style 4",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_4 = existing_womens_style_4
            print("- Product already exists: Women's Style 4")

        existing_womens_style_5 = (await db.execute(select(Product).where(Product.slug == 'womens-style-5'))).scalar_one_or_none()
        if not existing_womens_style_5:
            womens_style_5 = Product(
                name="Women's Style 5",
                slug='womens-style-5',
                description="Urban Bird women's fashion piece — style 5.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_5)
            await db.flush()
            print("✓ Product: Women's Style 5")
            # Variants for Women's Style 5
            for v_data in [
                {"sku": 'WS5-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS5-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_5.id, **v_data))
            # Images for Women's Style 5
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-5' / '5.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_5.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '5.png')
                db.add(ProductImage(
                    product_id=womens_style_5.id,
                    url=f"/uploads/products/{str(womens_style_5.id)}/5.png",
                    alt_text="Women's Style 5",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_5 = existing_womens_style_5
            print("- Product already exists: Women's Style 5")

        existing_womens_style_8 = (await db.execute(select(Product).where(Product.slug == 'womens-style-8'))).scalar_one_or_none()
        if not existing_womens_style_8:
            womens_style_8 = Product(
                name="Women's Style 8",
                slug='womens-style-8',
                description="Urban Bird women's fashion piece — style 8.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_8)
            await db.flush()
            print("✓ Product: Women's Style 8")
            # Variants for Women's Style 8
            for v_data in [
                {"sku": 'WS8-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS8-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_8.id, **v_data))
            # Images for Women's Style 8
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-8' / '8.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_8.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '8.png')
                db.add(ProductImage(
                    product_id=womens_style_8.id,
                    url=f"/uploads/products/{str(womens_style_8.id)}/8.png",
                    alt_text="Women's Style 8",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_8 = existing_womens_style_8
            print("- Product already exists: Women's Style 8")

        existing_womens_style_9 = (await db.execute(select(Product).where(Product.slug == 'womens-style-9'))).scalar_one_or_none()
        if not existing_womens_style_9:
            womens_style_9 = Product(
                name="Women's Style 9",
                slug='womens-style-9',
                description="Urban Bird women's fashion piece — style 9.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_9)
            await db.flush()
            print("✓ Product: Women's Style 9")
            # Variants for Women's Style 9
            for v_data in [
                {"sku": 'WS9-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS9-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_9.id, **v_data))
            # Images for Women's Style 9
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-9' / '9.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_9.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '9.png')
                db.add(ProductImage(
                    product_id=womens_style_9.id,
                    url=f"/uploads/products/{str(womens_style_9.id)}/9.png",
                    alt_text="Women's Style 9",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_9 = existing_womens_style_9
            print("- Product already exists: Women's Style 9")

        existing_womens_style_11 = (await db.execute(select(Product).where(Product.slug == 'womens-style-11'))).scalar_one_or_none()
        if not existing_womens_style_11:
            womens_style_11 = Product(
                name="Women's Style 11",
                slug='womens-style-11',
                description="Urban Bird women's fashion piece — style 11.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_11)
            await db.flush()
            print("✓ Product: Women's Style 11")
            # Variants for Women's Style 11
            for v_data in [
                {"sku": 'WS11-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS11-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_11.id, **v_data))
            # Images for Women's Style 11
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-11' / '11.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_11.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '11.png')
                db.add(ProductImage(
                    product_id=womens_style_11.id,
                    url=f"/uploads/products/{str(womens_style_11.id)}/11.png",
                    alt_text="Women's Style 11",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_11 = existing_womens_style_11
            print("- Product already exists: Women's Style 11")

        existing_womens_style_12 = (await db.execute(select(Product).where(Product.slug == 'womens-style-12'))).scalar_one_or_none()
        if not existing_womens_style_12:
            womens_style_12 = Product(
                name="Women's Style 12",
                slug='womens-style-12',
                description="Urban Bird women's fashion piece — style 12.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_12)
            await db.flush()
            print("✓ Product: Women's Style 12")
            # Variants for Women's Style 12
            for v_data in [
                {"sku": 'WS12-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS12-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_12.id, **v_data))
            # Images for Women's Style 12
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-12' / '12.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_12.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '12.png')
                db.add(ProductImage(
                    product_id=womens_style_12.id,
                    url=f"/uploads/products/{str(womens_style_12.id)}/12.png",
                    alt_text="Women's Style 12",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_12 = existing_womens_style_12
            print("- Product already exists: Women's Style 12")

        existing_womens_style_13 = (await db.execute(select(Product).where(Product.slug == 'womens-style-13'))).scalar_one_or_none()
        if not existing_womens_style_13:
            womens_style_13 = Product(
                name="Women's Style 13",
                slug='womens-style-13',
                description="Urban Bird women's fashion piece — style 13.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_13)
            await db.flush()
            print("✓ Product: Women's Style 13")
            # Variants for Women's Style 13
            for v_data in [
                {"sku": 'WS13-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS13-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_13.id, **v_data))
            # Images for Women's Style 13
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-13' / '13.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_13.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '13.png')
                db.add(ProductImage(
                    product_id=womens_style_13.id,
                    url=f"/uploads/products/{str(womens_style_13.id)}/13.png",
                    alt_text="Women's Style 13",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_13 = existing_womens_style_13
            print("- Product already exists: Women's Style 13")

        existing_womens_style_14 = (await db.execute(select(Product).where(Product.slug == 'womens-style-14'))).scalar_one_or_none()
        if not existing_womens_style_14:
            womens_style_14 = Product(
                name="Women's Style 14",
                slug='womens-style-14',
                description="Urban Bird women's fashion piece — style 14.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_14)
            await db.flush()
            print("✓ Product: Women's Style 14")
            # Variants for Women's Style 14
            for v_data in [
                {"sku": 'WS14-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS14-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_14.id, **v_data))
            # Images for Women's Style 14
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-14' / '14.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_14.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '14.png')
                db.add(ProductImage(
                    product_id=womens_style_14.id,
                    url=f"/uploads/products/{str(womens_style_14.id)}/14.png",
                    alt_text="Women's Style 14",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_14 = existing_womens_style_14
            print("- Product already exists: Women's Style 14")

        existing_womens_style_15 = (await db.execute(select(Product).where(Product.slug == 'womens-style-15'))).scalar_one_or_none()
        if not existing_womens_style_15:
            womens_style_15 = Product(
                name="Women's Style 15",
                slug='womens-style-15',
                description="Urban Bird women's fashion piece — style 15.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_15)
            await db.flush()
            print("✓ Product: Women's Style 15")
            # Variants for Women's Style 15
            for v_data in [
                {"sku": 'WS15-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS15-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_15.id, **v_data))
            # Images for Women's Style 15
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-15' / '15.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_15.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '15.png')
                db.add(ProductImage(
                    product_id=womens_style_15.id,
                    url=f"/uploads/products/{str(womens_style_15.id)}/15.png",
                    alt_text="Women's Style 15",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_15 = existing_womens_style_15
            print("- Product already exists: Women's Style 15")

        existing_womens_style_16 = (await db.execute(select(Product).where(Product.slug == 'womens-style-16'))).scalar_one_or_none()
        if not existing_womens_style_16:
            womens_style_16 = Product(
                name="Women's Style 16",
                slug='womens-style-16',
                description="Urban Bird women's fashion piece — style 16.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_16)
            await db.flush()
            print("✓ Product: Women's Style 16")
            # Variants for Women's Style 16
            for v_data in [
                {"sku": 'WS16-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS16-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_16.id, **v_data))
            # Images for Women's Style 16
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-16' / '16.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_16.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '16.png')
                db.add(ProductImage(
                    product_id=womens_style_16.id,
                    url=f"/uploads/products/{str(womens_style_16.id)}/16.png",
                    alt_text="Women's Style 16",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_16 = existing_womens_style_16
            print("- Product already exists: Women's Style 16")

        existing_womens_style_17 = (await db.execute(select(Product).where(Product.slug == 'womens-style-17'))).scalar_one_or_none()
        if not existing_womens_style_17:
            womens_style_17 = Product(
                name="Women's Style 17",
                slug='womens-style-17',
                description="Urban Bird women's fashion piece — style 17.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_17)
            await db.flush()
            print("✓ Product: Women's Style 17")
            # Variants for Women's Style 17
            for v_data in [
                {"sku": 'WS17-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS17-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_17.id, **v_data))
            # Images for Women's Style 17
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-17' / '17.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_17.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '17.png')
                db.add(ProductImage(
                    product_id=womens_style_17.id,
                    url=f"/uploads/products/{str(womens_style_17.id)}/17.png",
                    alt_text="Women's Style 17",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_17 = existing_womens_style_17
            print("- Product already exists: Women's Style 17")

        existing_womens_style_18 = (await db.execute(select(Product).where(Product.slug == 'womens-style-18'))).scalar_one_or_none()
        if not existing_womens_style_18:
            womens_style_18 = Product(
                name="Women's Style 18",
                slug='womens-style-18',
                description="Urban Bird women's fashion piece — style 18.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_18)
            await db.flush()
            print("✓ Product: Women's Style 18")
            # Variants for Women's Style 18
            for v_data in [
                {"sku": 'WS18-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS18-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_18.id, **v_data))
            # Images for Women's Style 18
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-18' / '18.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_18.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '18.png')
                db.add(ProductImage(
                    product_id=womens_style_18.id,
                    url=f"/uploads/products/{str(womens_style_18.id)}/18.png",
                    alt_text="Women's Style 18",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_18 = existing_womens_style_18
            print("- Product already exists: Women's Style 18")

        existing_womens_style_19 = (await db.execute(select(Product).where(Product.slug == 'womens-style-19'))).scalar_one_or_none()
        if not existing_womens_style_19:
            womens_style_19 = Product(
                name="Women's Style 19",
                slug='womens-style-19',
                description="Urban Bird women's fashion piece — style 19.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_19)
            await db.flush()
            print("✓ Product: Women's Style 19")
            # Variants for Women's Style 19
            for v_data in [
                {"sku": 'WS19-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS19-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_19.id, **v_data))
            # Images for Women's Style 19
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-19' / '19.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_19.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '19.png')
                db.add(ProductImage(
                    product_id=womens_style_19.id,
                    url=f"/uploads/products/{str(womens_style_19.id)}/19.png",
                    alt_text="Women's Style 19",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_19 = existing_womens_style_19
            print("- Product already exists: Women's Style 19")

        existing_womens_style_20 = (await db.execute(select(Product).where(Product.slug == 'womens-style-20'))).scalar_one_or_none()
        if not existing_womens_style_20:
            womens_style_20 = Product(
                name="Women's Style 20",
                slug='womens-style-20',
                description="Urban Bird women's fashion piece — style 20.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_20)
            await db.flush()
            print("✓ Product: Women's Style 20")
            # Variants for Women's Style 20
            for v_data in [
                {"sku": 'WS20-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS20-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_20.id, **v_data))
            # Images for Women's Style 20
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-20' / '20.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_20.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '20.png')
                db.add(ProductImage(
                    product_id=womens_style_20.id,
                    url=f"/uploads/products/{str(womens_style_20.id)}/20.png",
                    alt_text="Women's Style 20",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_20 = existing_womens_style_20
            print("- Product already exists: Women's Style 20")

        existing_womens_style_21 = (await db.execute(select(Product).where(Product.slug == 'womens-style-21'))).scalar_one_or_none()
        if not existing_womens_style_21:
            womens_style_21 = Product(
                name="Women's Style 21",
                slug='womens-style-21',
                description="Urban Bird women's fashion piece — style 21.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_21)
            await db.flush()
            print("✓ Product: Women's Style 21")
            # Variants for Women's Style 21
            for v_data in [
                {"sku": 'WS21-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS21-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_21.id, **v_data))
            # Images for Women's Style 21
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-21' / '21.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_21.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '21.png')
                db.add(ProductImage(
                    product_id=womens_style_21.id,
                    url=f"/uploads/products/{str(womens_style_21.id)}/21.png",
                    alt_text="Women's Style 21",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_21 = existing_womens_style_21
            print("- Product already exists: Women's Style 21")

        existing_womens_style_22 = (await db.execute(select(Product).where(Product.slug == 'womens-style-22'))).scalar_one_or_none()
        if not existing_womens_style_22:
            womens_style_22 = Product(
                name="Women's Style 22",
                slug='womens-style-22',
                description="Urban Bird women's fashion piece — style 22.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_22)
            await db.flush()
            print("✓ Product: Women's Style 22")
            # Variants for Women's Style 22
            for v_data in [
                {"sku": 'WS22-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS22-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_22.id, **v_data))
            # Images for Women's Style 22
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-22' / '22.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_22.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '22.png')
                db.add(ProductImage(
                    product_id=womens_style_22.id,
                    url=f"/uploads/products/{str(womens_style_22.id)}/22.png",
                    alt_text="Women's Style 22",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_22 = existing_womens_style_22
            print("- Product already exists: Women's Style 22")

        existing_womens_style_23 = (await db.execute(select(Product).where(Product.slug == 'womens-style-23'))).scalar_one_or_none()
        if not existing_womens_style_23:
            womens_style_23 = Product(
                name="Women's Style 23",
                slug='womens-style-23',
                description="Urban Bird women's fashion piece — style 23.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_23)
            await db.flush()
            print("✓ Product: Women's Style 23")
            # Variants for Women's Style 23
            for v_data in [
                {"sku": 'WS23-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS23-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_23.id, **v_data))
            # Images for Women's Style 23
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-23' / '23.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_23.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '23.png')
                db.add(ProductImage(
                    product_id=womens_style_23.id,
                    url=f"/uploads/products/{str(womens_style_23.id)}/23.png",
                    alt_text="Women's Style 23",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_23 = existing_womens_style_23
            print("- Product already exists: Women's Style 23")

        existing_womens_style_24 = (await db.execute(select(Product).where(Product.slug == 'womens-style-24'))).scalar_one_or_none()
        if not existing_womens_style_24:
            womens_style_24 = Product(
                name="Women's Style 24",
                slug='womens-style-24',
                description="Urban Bird women's fashion piece — style 24.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_24)
            await db.flush()
            print("✓ Product: Women's Style 24")
            # Variants for Women's Style 24
            for v_data in [
                {"sku": 'WS24-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS24-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_24.id, **v_data))
            # Images for Women's Style 24
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-24' / '24.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_24.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '24.png')
                db.add(ProductImage(
                    product_id=womens_style_24.id,
                    url=f"/uploads/products/{str(womens_style_24.id)}/24.png",
                    alt_text="Women's Style 24",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_24 = existing_womens_style_24
            print("- Product already exists: Women's Style 24")

        existing_womens_style_26 = (await db.execute(select(Product).where(Product.slug == 'womens-style-26'))).scalar_one_or_none()
        if not existing_womens_style_26:
            womens_style_26 = Product(
                name="Women's Style 26",
                slug='womens-style-26',
                description="Urban Bird women's fashion piece — style 26.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_26)
            await db.flush()
            print("✓ Product: Women's Style 26")
            # Variants for Women's Style 26
            for v_data in [
                {"sku": 'WS26-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS26-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_26.id, **v_data))
            # Images for Women's Style 26
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-26' / '26.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_26.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '26.png')
                db.add(ProductImage(
                    product_id=womens_style_26.id,
                    url=f"/uploads/products/{str(womens_style_26.id)}/26.png",
                    alt_text="Women's Style 26",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_26 = existing_womens_style_26
            print("- Product already exists: Women's Style 26")

        existing_womens_style_27 = (await db.execute(select(Product).where(Product.slug == 'womens-style-27'))).scalar_one_or_none()
        if not existing_womens_style_27:
            womens_style_27 = Product(
                name="Women's Style 27",
                slug='womens-style-27',
                description="Urban Bird women's fashion piece — style 27.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_27)
            await db.flush()
            print("✓ Product: Women's Style 27")
            # Variants for Women's Style 27
            for v_data in [
                {"sku": 'WS27-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS27-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_27.id, **v_data))
            # Images for Women's Style 27
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-27' / '27.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_27.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '27.png')
                db.add(ProductImage(
                    product_id=womens_style_27.id,
                    url=f"/uploads/products/{str(womens_style_27.id)}/27.png",
                    alt_text="Women's Style 27",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_27 = existing_womens_style_27
            print("- Product already exists: Women's Style 27")

        existing_womens_style_28 = (await db.execute(select(Product).where(Product.slug == 'womens-style-28'))).scalar_one_or_none()
        if not existing_womens_style_28:
            womens_style_28 = Product(
                name="Women's Style 28",
                slug='womens-style-28',
                description="Urban Bird women's fashion piece — style 28.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_28)
            await db.flush()
            print("✓ Product: Women's Style 28")
            # Variants for Women's Style 28
            for v_data in [
                {"sku": 'WS28-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS28-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_28.id, **v_data))
            # Images for Women's Style 28
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-28' / '28.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_28.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '28.png')
                db.add(ProductImage(
                    product_id=womens_style_28.id,
                    url=f"/uploads/products/{str(womens_style_28.id)}/28.png",
                    alt_text="Women's Style 28",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_28 = existing_womens_style_28
            print("- Product already exists: Women's Style 28")

        existing_womens_style_29 = (await db.execute(select(Product).where(Product.slug == 'womens-style-29'))).scalar_one_or_none()
        if not existing_womens_style_29:
            womens_style_29 = Product(
                name="Women's Style 29",
                slug='womens-style-29',
                description="Urban Bird women's fashion piece — style 29.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_29)
            await db.flush()
            print("✓ Product: Women's Style 29")
            # Variants for Women's Style 29
            for v_data in [
                {"sku": 'WS29-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS29-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_29.id, **v_data))
            # Images for Women's Style 29
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-29' / '29.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_29.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '29.png')
                db.add(ProductImage(
                    product_id=womens_style_29.id,
                    url=f"/uploads/products/{str(womens_style_29.id)}/29.png",
                    alt_text="Women's Style 29",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_29 = existing_womens_style_29
            print("- Product already exists: Women's Style 29")

        existing_womens_style_30 = (await db.execute(select(Product).where(Product.slug == 'womens-style-30'))).scalar_one_or_none()
        if not existing_womens_style_30:
            womens_style_30 = Product(
                name="Women's Style 30",
                slug='womens-style-30',
                description="Urban Bird women's fashion piece — style 30.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_30)
            await db.flush()
            print("✓ Product: Women's Style 30")
            # Variants for Women's Style 30
            for v_data in [
                {"sku": 'WS30-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS30-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_30.id, **v_data))
            # Images for Women's Style 30
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-30' / '30.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_30.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '30.png')
                db.add(ProductImage(
                    product_id=womens_style_30.id,
                    url=f"/uploads/products/{str(womens_style_30.id)}/30.png",
                    alt_text="Women's Style 30",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_30 = existing_womens_style_30
            print("- Product already exists: Women's Style 30")

        existing_womens_style_31 = (await db.execute(select(Product).where(Product.slug == 'womens-style-31'))).scalar_one_or_none()
        if not existing_womens_style_31:
            womens_style_31 = Product(
                name="Women's Style 31",
                slug='womens-style-31',
                description="Urban Bird women's fashion piece — style 31.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_31)
            await db.flush()
            print("✓ Product: Women's Style 31")
            # Variants for Women's Style 31
            for v_data in [
                {"sku": 'WS31-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS31-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_31.id, **v_data))
            # Images for Women's Style 31
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-31' / '31.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_31.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '31.png')
                db.add(ProductImage(
                    product_id=womens_style_31.id,
                    url=f"/uploads/products/{str(womens_style_31.id)}/31.png",
                    alt_text="Women's Style 31",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_31 = existing_womens_style_31
            print("- Product already exists: Women's Style 31")

        existing_womens_style_34 = (await db.execute(select(Product).where(Product.slug == 'womens-style-34'))).scalar_one_or_none()
        if not existing_womens_style_34:
            womens_style_34 = Product(
                name="Women's Style 34",
                slug='womens-style-34',
                description="Urban Bird women's fashion piece — style 34.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_34)
            await db.flush()
            print("✓ Product: Women's Style 34")
            # Variants for Women's Style 34
            for v_data in [
                {"sku": 'WS34-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS34-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_34.id, **v_data))
            # Images for Women's Style 34
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-34' / '34.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_34.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '34.png')
                db.add(ProductImage(
                    product_id=womens_style_34.id,
                    url=f"/uploads/products/{str(womens_style_34.id)}/34.png",
                    alt_text="Women's Style 34",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_34 = existing_womens_style_34
            print("- Product already exists: Women's Style 34")

        existing_womens_style_36 = (await db.execute(select(Product).where(Product.slug == 'womens-style-36'))).scalar_one_or_none()
        if not existing_womens_style_36:
            womens_style_36 = Product(
                name="Women's Style 36",
                slug='womens-style-36',
                description="Urban Bird women's fashion piece — style 36.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_36)
            await db.flush()
            print("✓ Product: Women's Style 36")
            # Variants for Women's Style 36
            for v_data in [
                {"sku": 'WS36-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS36-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_36.id, **v_data))
            # Images for Women's Style 36
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-36' / '36.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_36.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '36.png')
                db.add(ProductImage(
                    product_id=womens_style_36.id,
                    url=f"/uploads/products/{str(womens_style_36.id)}/36.png",
                    alt_text="Women's Style 36",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_36 = existing_womens_style_36
            print("- Product already exists: Women's Style 36")

        existing_womens_style_38 = (await db.execute(select(Product).where(Product.slug == 'womens-style-38'))).scalar_one_or_none()
        if not existing_womens_style_38:
            womens_style_38 = Product(
                name="Women's Style 38",
                slug='womens-style-38',
                description="Urban Bird women's fashion piece — style 38.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_38)
            await db.flush()
            print("✓ Product: Women's Style 38")
            # Variants for Women's Style 38
            for v_data in [
                {"sku": 'WS38-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS38-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_38.id, **v_data))
            # Images for Women's Style 38
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-38' / '38.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_38.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '38.png')
                db.add(ProductImage(
                    product_id=womens_style_38.id,
                    url=f"/uploads/products/{str(womens_style_38.id)}/38.png",
                    alt_text="Women's Style 38",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_38 = existing_womens_style_38
            print("- Product already exists: Women's Style 38")

        existing_womens_style_39 = (await db.execute(select(Product).where(Product.slug == 'womens-style-39'))).scalar_one_or_none()
        if not existing_womens_style_39:
            womens_style_39 = Product(
                name="Women's Style 39",
                slug='womens-style-39',
                description="Urban Bird women's fashion piece — style 39.",
                category_id=cat_vars['185d5589-daa8-4dbd-8dc5-3cbd9e0f26df'].id,
                subcategory_id=None,
                price=Decimal("5000.00"),
                currency='KES',
                status='active',
                is_featured=False,
                is_new_arrival=True,
                is_on_sale=False,
                total_stock=120,
                low_stock_threshold=5,
                brand='Urban Bird',
                tags=['women', 'female'],
            )
            db.add(womens_style_39)
            await db.flush()
            print("✓ Product: Women's Style 39")
            # Variants for Women's Style 39
            for v_data in [
                {"sku": 'WS39-S-BLA', "size": 'S', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-S-NAV', "size": 'S', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-S-MAR', "size": 'S', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-M-BLA', "size": 'M', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-M-NAV', "size": 'M', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-M-MAR', "size": 'M', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-L-BLA', "size": 'L', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-L-NAV', "size": 'L', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-L-MAR', "size": 'L', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-XL-BLA', "size": 'XL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-XL-NAV', "size": 'XL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-XL-MAR', "size": 'XL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-XXL-BLA', "size": 'XXL', "color_name": 'Black', "color_hex": '#000000', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-XXL-NAV', "size": 'XXL', "color_name": 'Navy Blue', "color_hex": '#1a237e', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
                {"sku": 'WS39-XXL-MAR', "size": 'XXL', "color_name": 'Maroon', "color_hex": '#782121', "stock_quantity": 8, "price_adjustment": Decimal("0"), "is_active": True},
            ]:
                db.add(ProductVariant(product_id=womens_style_39.id, **v_data))
            # Images for Women's Style 39
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            _img_src = SEED_ASSETS_DIR / 'womens-style-39' / '39.png'
            _img_dst_dir = UPLOADS_DIR / str(womens_style_39.id)
            _img_dst_dir.mkdir(parents=True, exist_ok=True)
            if _img_src.exists():
                shutil.copy2(_img_src, _img_dst_dir / '39.png')
                db.add(ProductImage(
                    product_id=womens_style_39.id,
                    url=f"/uploads/products/{str(womens_style_39.id)}/39.png",
                    alt_text="Women's Style 39",
                    display_order=0,
                    is_primary=True,
                ))
        else:
            womens_style_39 = existing_womens_style_39
            print("- Product already exists: Women's Style 39")

        # ── Shipping Zones ────────────────────────────────────────
        existing_nairobi_cbd_zone = (await db.execute(select(ShippingZone).where(ShippingZone.name == 'Nairobi CBD'))).scalar_one_or_none()
        if not existing_nairobi_cbd_zone:
            nairobi_cbd_zone = ShippingZone(
                name='Nairobi CBD',
                counties=['Nairobi'],
                is_active=True,
            )
            db.add(nairobi_cbd_zone)
            await db.flush()
            db.add(ShippingRate(
                zone_id=nairobi_cbd_zone.id,
                method='standard',
                price=Decimal("150.00"),
                free_above=Decimal("3000.00"),
                estimated_days_min=1,
                estimated_days_max=2,
            ))
            db.add(ShippingRate(
                zone_id=nairobi_cbd_zone.id,
                method='express',
                price=Decimal("300.00"),
                estimated_days_min=0,
                estimated_days_max=1,
            ))
            print("✓ Shipping zone: Nairobi CBD")
        else:
            print("- Shipping zone already exists: Nairobi CBD")

        existing_upcountry_zone = (await db.execute(select(ShippingZone).where(ShippingZone.name == 'Upcountry'))).scalar_one_or_none()
        if not existing_upcountry_zone:
            upcountry_zone = ShippingZone(
                name='Upcountry',
                counties=['Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Nyeri', 'Meru', 'Kitale'],
                is_active=True,
            )
            db.add(upcountry_zone)
            await db.flush()
            db.add(ShippingRate(
                zone_id=upcountry_zone.id,
                method='standard',
                price=Decimal("350.00"),
                free_above=Decimal("5000.00"),
                estimated_days_min=2,
                estimated_days_max=5,
            ))
            db.add(ShippingRate(
                zone_id=upcountry_zone.id,
                method='express',
                price=Decimal("600.00"),
                estimated_days_min=1,
                estimated_days_max=2,
            ))
            print("✓ Shipping zone: Upcountry")
        else:
            print("- Shipping zone already exists: Upcountry")

        # ── Coupon ───────────────────────────────────────────────
        from datetime import datetime, timezone, timedelta
        from app.models.coupon import Coupon
        existing_coupon = (await db.execute(select(Coupon).where(Coupon.code == "URBANBIRD20"))).scalar_one_or_none()
        if not existing_coupon:
            db.add(Coupon(
                code="URBANBIRD20",
                description="20% off your first order",
                discount_type="percentage",
                discount_value=Decimal("20.00"),
                min_order_amount=Decimal("1000.00"),
                max_discount_amount=Decimal("500.00"),
                usage_limit=100,
                per_user_limit=1,
                starts_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=365),
                is_active=True,
            ))
            print("✓ Coupon: URBANBIRD20")
        else:
            print("- Coupon already exists: URBANBIRD20")

        await db.commit()
        print("")
        print("✅ Seed complete!")
        print("   Admin: admin@urbanbird.co.ke / admin123!")
        print("   Coupon: URBANBIRD20 (20% off, max KSh 500)")


if __name__ == "__main__":
    asyncio.run(seed())
