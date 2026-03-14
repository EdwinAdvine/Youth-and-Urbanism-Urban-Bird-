"""
reseed.py — Wipe placeholder product data and re-run production seed.

Run ONCE on the deployed server to replace mock data with real products:
    python scripts/reseed.py

Safe: only deletes products/variants/images/categories.
Keeps: orders, users, coupons, shipping zones.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.database import AsyncSessionLocal


async def reset():
    print("Clearing placeholder product data...")
    async with AsyncSessionLocal() as db:
        # Delete in FK-safe order
        await db.execute(text("DELETE FROM product_images"))
        await db.execute(text("DELETE FROM product_variants"))
        await db.execute(text("DELETE FROM inventory_logs"))
        await db.execute(text("DELETE FROM product_reviews"))
        await db.execute(text("DELETE FROM cart_items"))
        await db.execute(text("DELETE FROM wishlist_items"))
        await db.execute(text("UPDATE order_items SET product_id = NULL, variant_id = NULL"))
        await db.execute(text("DELETE FROM products"))
        await db.execute(text("DELETE FROM subcategories"))
        await db.execute(text("DELETE FROM categories"))
        await db.commit()
    print("✓ Cleared. Running production seed...")

    # Import and run seed_production
    import importlib.util
    seed_file = Path(__file__).parent.parent / "seed_production.py"
    spec = importlib.util.spec_from_file_location("seed_production", seed_file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    await mod.seed()


if __name__ == "__main__":
    asyncio.run(reset())
