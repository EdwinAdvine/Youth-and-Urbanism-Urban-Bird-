"""
Seed script: populates Urban Bird database with initial data.
Run: python seed_data.py
"""
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.database import engine, AsyncSessionLocal, Base
from app.models import (
    User, Category, Subcategory, Product, ProductVariant, ProductImage,
    ShippingZone, ShippingRate, Coupon
)
from app.utils.security import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Admin user
        admin = User(
            email="admin@urbanbird.co.ke",
            phone="+254799075061",
            password_hash=hash_password("admin123!"),
            first_name="Urban",
            last_name="Admin",
            role="super_admin",
            is_active=True,
            is_verified=True,
        )
        db.add(admin)

        # Categories
        men = Category(name="Men", slug="men", display_order=1, is_active=True,
                       seo_title="Men's Clothing - Urban Bird Kenya")
        women = Category(name="Women", slug="women", display_order=2, is_active=True,
                         seo_title="Women's Clothing - Urban Bird Kenya")
        kids = Category(name="Kids", slug="kids", display_order=3, is_active=True,
                        seo_title="Kids' Clothing - Urban Bird Kenya")
        db.add_all([men, women, kids])
        await db.flush()

        # Subcategories - Men
        men_tops = Subcategory(category_id=men.id, name="Tops", slug="tops", display_order=1)
        men_layers = Subcategory(category_id=men.id, name="Layers & Jackets", slug="layers-jackets", display_order=2)
        men_bottoms = Subcategory(category_id=men.id, name="Bottoms", slug="bottoms", display_order=3)
        men_accessories = Subcategory(category_id=men.id, name="Accessories", slug="accessories", display_order=4)

        # Subcategories - Women
        women_tops = Subcategory(category_id=women.id, name="Tops", slug="tops", display_order=1)
        women_layers = Subcategory(category_id=women.id, name="Layers & Jackets", slug="layers-jackets", display_order=2)
        women_bottoms = Subcategory(category_id=women.id, name="Bottoms & Dresses", slug="bottoms-dresses", display_order=3)
        women_accessories = Subcategory(category_id=women.id, name="Accessories", slug="accessories", display_order=4)

        # Subcategories - Kids
        kids_tops = Subcategory(category_id=kids.id, name="Tops", slug="tops", display_order=1)
        kids_layers = Subcategory(category_id=kids.id, name="Layers & Jackets", slug="layers-jackets", display_order=2)
        kids_bottoms = Subcategory(category_id=kids.id, name="Bottoms", slug="bottoms", display_order=3)
        kids_accessories = Subcategory(category_id=kids.id, name="Accessories", slug="accessories", display_order=4)

        db.add_all([
            men_tops, men_layers, men_bottoms, men_accessories,
            women_tops, women_layers, women_bottoms, women_accessories,
            kids_tops, kids_layers, kids_bottoms, kids_accessories,
        ])
        await db.flush()

        # Sample Products
        products_data = [
            {
                "name": "Urban Hoodie",
                "slug": "urban-hoodie",
                "description": "Premium heavyweight hoodie crafted from 100% cotton fleece. Perfect for cold Nairobi evenings.",
                "category_id": men.id,
                "subcategory_id": men_layers.id,
                "price": Decimal("3500.00"),
                "compare_at_price": Decimal("5000.00"),
                "status": "active",
                "is_featured": True,
                "is_on_sale": True,
                "sale_percentage": 30,
                "brand": "Urban Bird",
                "material": "100% Cotton Fleece",
                "tags": ["hoodie", "casual", "bestseller"],
            },
            {
                "name": "Urban Sweatpant",
                "slug": "urban-sweatpant",
                "description": "Comfortable and stylish sweatpants for everyday wear. Elastic waistband with drawstring.",
                "category_id": men.id,
                "subcategory_id": men_bottoms.id,
                "price": Decimal("3000.00"),
                "status": "active",
                "is_featured": True,
                "is_new_arrival": True,
                "brand": "Urban Bird",
                "material": "80% Cotton, 20% Polyester",
                "tags": ["sweatpants", "casual", "comfortable"],
            },
            {
                "name": "Urban Short",
                "slug": "urban-short",
                "description": "Lightweight fleece shorts perfect for warm days or lounging at home.",
                "category_id": men.id,
                "subcategory_id": men_bottoms.id,
                "price": Decimal("2500.00"),
                "status": "active",
                "is_new_arrival": True,
                "brand": "Urban Bird",
                "material": "100% Polyester Fleece",
                "tags": ["shorts", "casual"],
            },
            {
                "name": "Urban Hoodie & Sweatpant Set",
                "slug": "urban-hoodie-sweatpant-set",
                "description": "Matching hoodie and sweatpant combo for a coordinated look. Available in multiple colorways.",
                "category_id": men.id,
                "subcategory_id": men_layers.id,
                "price": Decimal("5000.00"),
                "status": "active",
                "is_featured": True,
                "brand": "Urban Bird",
                "material": "100% Cotton Fleece",
                "tags": ["set", "hoodie", "sweatpant", "bundle"],
            },
            {
                "name": "Urban Hoodie and Short Set",
                "slug": "urban-hoodie-and-short-set",
                "description": "Matching hoodie and shorts combo for a coordinated look. Available in multiple colorways.",
                "category_id": men.id,
                "subcategory_id": men_layers.id,
                "price": Decimal("4500.00"),
                "status": "active",
                "is_featured": True,
                "brand": "Urban Bird",
                "material": "100% Cotton Fleece",
                "tags": ["set", "hoodie", "shorts", "bundle"],
            },
            {
                "name": "Women Urban Leggings",
                "slug": "women-urban-leggings",
                "description": "High-waist compression leggings with four-way stretch fabric. Perfect for workouts or casual wear.",
                "category_id": women.id,
                "subcategory_id": women_bottoms.id,
                "price": Decimal("2800.00"),
                "status": "active",
                "is_featured": True,
                "is_new_arrival": True,
                "brand": "Urban Bird",
                "material": "85% Polyester, 15% Spandex",
                "tags": ["leggings", "women", "activewear"],
            },
        ]

        # Track named product references for image assignment
        hoodie = sweatpant = short = hoodie_set = hoodie_short_set = None

        for p_data in products_data:
            product = Product(**p_data, total_stock=50)
            db.add(product)
            await db.flush()

            # Capture references by slug
            if p_data["slug"] == "urban-hoodie":
                hoodie = product
            elif p_data["slug"] == "urban-sweatpant":
                sweatpant = product
            elif p_data["slug"] == "urban-short":
                short = product
            elif p_data["slug"] == "urban-hoodie-sweatpant-set":
                hoodie_set = product
            elif p_data["slug"] == "urban-hoodie-and-short-set":
                hoodie_short_set = product

            # Add variants
            sizes = ["XS", "S", "M", "L", "XL", "XXL"]
            colors = [("Black", "#000000"), ("Navy Blue", "#1a237e"), ("Maroon", "#782121")]

            for size in sizes:
                for color_name, color_hex in colors:
                    variant = ProductVariant(
                        product_id=product.id,
                        sku=f"{product.slug[:15].upper()}-{size}-{color_name[:3].upper()}",
                        size=size,
                        color_name=color_name,
                        color_hex=color_hex,
                        stock_quantity=8,
                        is_active=True,
                    )
                    db.add(variant)

        # Add product images from Male folder (stored in backend/uploads/products/male/)
        BASE_URL = "/uploads/products/male"
        image_map = {
            hoodie: [
                ("Urban Hoodie.png",             True,  "Urban Hoodie front view"),
                ("Urban Hoodie2.png",            False, "Urban Hoodie alternate view"),
                ("rban Hoodie.png",              False, "Urban Hoodie detail"),
            ],
            short: [
                ("Urban Short.png",              True,  "Urban Short front view"),
            ],
            hoodie_set: [
                ("Urban Hoodie Set.png",         True,  "Urban Hoodie Set front view"),
                ("Urban Hoodie Set 2.png",       False, "Urban Hoodie Set alternate view"),
            ],
            hoodie_short_set: [
                ("Urban Hoodie and Short.png",   True,  "Urban Hoodie and Short Set front view"),
                ("Urban Hoodie and Short 2.png", False, "Urban Hoodie and Short Set alternate view"),
                ("Urban Hoodie and Short 3.png", False, "Urban Hoodie and Short Set detail"),
                ("Urban Woodie and Short.png",   False, "Urban Hoodie and Short Set variant"),
            ],
        }

        for product, imgs in image_map.items():
            for order, (fname, is_primary, alt) in enumerate(imgs):
                db.add(ProductImage(
                    product_id=product.id,
                    url=f"{BASE_URL}/{fname}",
                    alt_text=alt,
                    display_order=order,
                    is_primary=is_primary,
                ))

        # Shipping zones
        nairobi_cbd = ShippingZone(
            name="Nairobi CBD",
            counties=["Nairobi"],
            is_active=True,
        )
        upcountry = ShippingZone(
            name="Upcountry",
            counties=["Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Meru", "Kitale"],
            is_active=True,
        )
        db.add_all([nairobi_cbd, upcountry])
        await db.flush()

        db.add_all([
            ShippingRate(zone_id=nairobi_cbd.id, method="standard", price=Decimal("150.00"), free_above=Decimal("3000.00"), estimated_days_min=1, estimated_days_max=2),
            ShippingRate(zone_id=nairobi_cbd.id, method="express", price=Decimal("300.00"), estimated_days_min=0, estimated_days_max=1),
            ShippingRate(zone_id=upcountry.id, method="standard", price=Decimal("350.00"), free_above=Decimal("5000.00"), estimated_days_min=2, estimated_days_max=5),
            ShippingRate(zone_id=upcountry.id, method="express", price=Decimal("600.00"), estimated_days_min=1, estimated_days_max=2),
        ])

        # Sample coupon
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
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            is_active=True,
        ))

        await db.commit()
        print("✅ Database seeded successfully!")
        print("Admin login: admin@urbanbird.co.ke / admin123!")
        print("Sample coupon: URBANBIRD20 (20% off, max KSh 500)")


if __name__ == "__main__":
    asyncio.run(seed())
