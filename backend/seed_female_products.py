"""
Seed script: adds Female folder images as Women's products in the database.
Copies images to backend/uploads/products/{product_id}/ and creates DB records.

Run from the backend/ directory:
    python seed_female_products.py
"""
import asyncio
import os
import shutil
from decimal import Decimal

from sqlalchemy import select

from app.database import engine, AsyncSessionLocal, Base
from app.models import Category, Subcategory, Product, ProductVariant, ProductImage


# Paths (resolved relative to this script's location)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

FEMALE_IMAGES_DIR = os.path.join(PROJECT_ROOT, "frontend", "src", "assets", "images", "Products", "Female")
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")

SIZES = ["S", "M", "L", "XL", "XXL"]
COLORS = [("Black", "#000000"), ("Navy Blue", "#1a237e"), ("Maroon", "#782121")]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Collect sorted image numbers from Female folder
    image_files = sorted(
        [f for f in os.listdir(FEMALE_IMAGES_DIR) if f.lower().endswith(".png")],
        key=lambda f: int(os.path.splitext(f)[0])
    )

    if not image_files:
        print("No PNG images found in:", FEMALE_IMAGES_DIR)
        return

    async with AsyncSessionLocal() as db:
        # Get or create Women category
        result = await db.execute(select(Category).where(Category.slug == "women"))
        women = result.scalar_one_or_none()
        if not women:
            women = Category(name="Women", slug="women", display_order=2, is_active=True,
                             seo_title="Women's Clothing - Urban Bird Kenya")
            db.add(women)
            await db.flush()

        for filename in image_files:
            num = os.path.splitext(filename)[0]
            name = f"Women's Style {num}"
            slug = f"womens-style-{num}"

            # Check if product already exists (idempotent)
            existing = await db.execute(select(Product).where(Product.slug == slug))
            if existing.scalar_one_or_none():
                print(f"  Skipping {slug} — already exists")
                continue

            product = Product(
                name=name,
                slug=slug,
                description=f"Urban Bird women's fashion piece — style {num}.",
                category_id=women.id,
                price=Decimal("5000.00"),
                status="active",
                is_featured=False,
                is_new_arrival=True,
                brand="Urban Bird",
                tags=["women", "female"],
                total_stock=len(SIZES) * len(COLORS) * 8,
            )
            db.add(product)
            await db.flush()

            # Copy image to uploads directory
            dest_dir = os.path.join(UPLOAD_DIR, "products", str(product.id))
            os.makedirs(dest_dir, exist_ok=True)
            src_path = os.path.join(FEMALE_IMAGES_DIR, filename)
            dest_path = os.path.join(dest_dir, filename)
            shutil.copy2(src_path, dest_path)

            # ProductImage record
            image_url = f"/uploads/products/{product.id}/{filename}"
            db.add(ProductImage(
                product_id=product.id,
                url=image_url,
                thumbnail_url=image_url,
                alt_text=name,
                display_order=0,
                is_primary=True,
            ))

            # Variants
            for size in SIZES:
                for color_name, color_hex in COLORS:
                    db.add(ProductVariant(
                        product_id=product.id,
                        sku=f"WS{num}-{size}-{color_name[:3].upper()}",
                        size=size,
                        color_name=color_name,
                        color_hex=color_hex,
                        stock_quantity=8,
                        is_active=True,
                    ))

            print(f"  Created: {name} (id={product.id})")

        await db.commit()
        print(f"\nDone! {len(image_files)} female products processed.")
        print(f"Images copied to: {UPLOAD_DIR}/products/")


if __name__ == "__main__":
    asyncio.run(seed())
